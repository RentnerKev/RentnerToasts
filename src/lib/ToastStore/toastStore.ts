import type {
    ToastStoreCore,
    ToastTimer,
    ToastProviderDefaultsRegistrar,
} from './Types/toast-store-internal.types.ts'
import type {
    Toast,
    ToastDefaults,
    ToastId,
    ToastPauseReason,
    ToastStore,
    ToastStoreOptions,
    ToastType,
    ToastUpdateOptions,
} from './Types/toast.types.ts'

import {
    DEFAULT_TOAST_DURATION,
    getRemainingToastTime,
    normalizeToastDuration,
} from '../ToastTiming/toastTiming.ts'

const DEFAULT_MAX_VISIBLE_TOASTS = 3

function normalizeMaxVisibleToasts(
    value: number | undefined,
    fallback: number,
) {
    return value !== undefined && Number.isInteger(value) && value > 0
        ? value
        : fallback
}

function getInitialDefaults(options: ToastStoreOptions): ToastDefaults {
    return Object.freeze({
        duration:
            normalizeToastDuration(
                options.defaultDuration,
                DEFAULT_TOAST_DURATION,
            ) ?? DEFAULT_TOAST_DURATION,
        maxVisibleToasts: normalizeMaxVisibleToasts(
            options.maxVisibleToasts,
            DEFAULT_MAX_VISIBLE_TOASTS,
        ),
    })
}

function normalizeToastDefaults(
    defaults: Partial<ToastDefaults>,
    fallback: ToastDefaults,
): ToastDefaults {
    return Object.freeze({
        duration:
            defaults.duration === undefined
                ? fallback.duration
                : (normalizeToastDuration(
                      defaults.duration,
                      fallback.duration,
                  ) ?? fallback.duration),
        maxVisibleToasts:
            defaults.maxVisibleToasts === undefined
                ? fallback.maxVisibleToasts
                : normalizeMaxVisibleToasts(
                      defaults.maxVisibleToasts,
                      fallback.maxVisibleToasts,
                  ),
    })
}

const toastProviderDefaultsRegistrars = new WeakMap<
    object,
    ToastProviderDefaultsRegistrar
>()
const externalProviderDefaults = new WeakMap<
    object,
    {
        baseDefaults: ToastDefaults
        providers: Map<symbol, Partial<ToastDefaults>>
    }
>()

export function registerToastProviderDefaults(
    store: ToastStore,
    owner: symbol,
    defaults: Partial<ToastDefaults>,
) {
    const register = toastProviderDefaultsRegistrars.get(store)

    if (register) return register(owner, defaults)

    let state = externalProviderDefaults.get(store)

    if (!state) {
        const currentDefaults = store.getToastDefaults()
        state = {
            baseDefaults: Object.freeze({
                duration: currentDefaults.duration,
                maxVisibleToasts: currentDefaults.maxVisibleToasts,
            }),
            providers: new Map(),
        }
        externalProviderDefaults.set(store, state)
    }

    const activeState = state
    activeState.providers.set(owner, { ...defaults })

    function applyDefaults() {
        let nextDefaults = activeState.baseDefaults

        for (const providerDefaults of activeState.providers.values()) {
            nextDefaults = normalizeToastDefaults(
                providerDefaults,
                nextDefaults,
            )
        }

        store.configureToastDefaults(nextDefaults)
    }

    applyDefaults()

    return () => {
        if (!activeState.providers.delete(owner)) return

        if (activeState.providers.size === 0) {
            store.configureToastDefaults(activeState.baseDefaults)
            externalProviderDefaults.delete(store)
            return
        }

        applyDefaults()
    }
}

export function copyToastProviderDefaultsRegistrar(
    source: object,
    destination: object,
) {
    const register = toastProviderDefaultsRegistrars.get(source)
    if (register) toastProviderDefaultsRegistrars.set(destination, register)
}

export function createToastStoreCore(
    options: ToastStoreOptions = {},
): ToastStoreCore {
    let baseToastDefaults = getInitialDefaults(options)
    let toastDefaults = baseToastDefaults
    const toastOrder: ToastId[] = []
    const toastsById = new Map<ToastId, Toast>()
    let snapshot: readonly Toast[] | undefined = Object.freeze([])
    const maxQueuedToasts =
        options.maxQueuedToasts !== undefined &&
        Number.isInteger(options.maxQueuedToasts) &&
        options.maxQueuedToasts > 0
            ? options.maxQueuedToasts
            : undefined
    const listeners = new Set<() => void>()
    const toastTimers = new Map<ToastId, ToastTimer>()
    const pauseReasons = new Map<ToastId, Map<ToastPauseReason, Set<symbol>>>()
    const defaultPauseOwner = Symbol('toast-pause')
    const providerDefaults = new Map<symbol, Partial<ToastDefaults>>()

    function notifyListeners() {
        // A subscriber may unsubscribe/resubscribe while handling this change.
        // Visit each original subscription at most once per notification.
        for (const listener of Array.from(listeners)) {
            if (listeners.has(listener)) listener()
        }
    }

    function cancelAutoDismiss(id: ToastId) {
        const timer = toastTimers.get(id)

        if (timer === undefined) return

        globalThis.clearTimeout(timer.handle)
        toastTimers.delete(id)
    }

    function replaceToastTiming(
        id: ToastId,
        remaining: number,
        timerStartedAt?: number,
    ) {
        const toast = toastsById.get(id)
        if (
            !toast ||
            (toast.remaining === remaining &&
                toast.timerStartedAt === timerStartedAt)
        )
            return
        toastsById.set(
            id,
            Object.freeze({ ...toast, remaining, timerStartedAt }),
        )
        snapshot = undefined
    }

    function syncToastTimers() {
        const visibleIds = new Set(
            toastOrder.slice(-toastDefaults.maxVisibleToasts),
        )
        // Only visible notifications can own a timer. Work stays bounded by
        // the display window even when the persistent queue is large.
        for (const id of toastTimers.keys()) {
            const toast = toastsById.get(id)
            if (!toast || !visibleIds.has(id) || pauseReasons.get(id)?.size) {
                const remaining = toast && getRemainingToastTime(toast)
                cancelAutoDismiss(id)
                if (remaining !== undefined) replaceToastTiming(id, remaining)
            }
        }
        for (const id of visibleIds) {
            const toast = toastsById.get(id)
            if (!toast) continue
            const shouldRun =
                toast.duration > 0 && !pauseReasons.get(toast.id)?.size
            const timer = toastTimers.get(toast.id)

            if (timer && !shouldRun) {
                const remaining = getRemainingToastTime(toast)
                cancelAutoDismiss(toast.id)
                replaceToastTiming(toast.id, remaining)
            } else if (!timer && shouldRun) {
                const startedAt = Date.now()
                const token = Symbol(toast.id)
                const handle = globalThis.setTimeout(() => {
                    if (toastTimers.get(toast.id)?.token !== token) return

                    toastTimers.delete(toast.id)
                    remove(toast.id)
                }, toast.remaining)

                toastTimers.set(toast.id, { handle, token })
                replaceToastTiming(toast.id, toast.remaining, startedAt)
            }
        }
    }

    function getDefaults() {
        return toastDefaults
    }

    function applyProviderDefaults() {
        let nextDefaults = baseToastDefaults

        for (const defaults of providerDefaults.values()) {
            nextDefaults = normalizeToastDefaults(defaults, nextDefaults)
        }

        toastDefaults = nextDefaults
        // Subscribers also read defaults, so a defaults change needs a fresh
        // snapshot even when no notification itself has changed.
        snapshot = undefined
        syncToastTimers()
        notifyListeners()
    }

    function configureDefaults(
        defaults: Partial<ToastDefaults>,
    ): ToastDefaults {
        const previous = toastDefaults
        baseToastDefaults = normalizeToastDefaults(defaults, baseToastDefaults)
        applyProviderDefaults()
        return previous
    }

    function restoreDefaults(defaults: ToastDefaults) {
        baseToastDefaults = Object.freeze({
            duration: defaults.duration,
            maxVisibleToasts: defaults.maxVisibleToasts,
        })
        applyProviderDefaults()
    }

    function registerProviderDefaults(
        owner: symbol,
        defaults: Partial<ToastDefaults>,
    ) {
        providerDefaults.set(owner, { ...defaults })
        applyProviderDefaults()

        return () => {
            if (!providerDefaults.delete(owner)) return
            applyProviderDefaults()
        }
    }

    function subscribe(listener: () => void) {
        listeners.add(listener)

        return () => {
            listeners.delete(listener)
        }
    }

    function getSnapshot() {
        if (!snapshot) {
            snapshot = Object.freeze(
                toastOrder.map((id) => toastsById.get(id)!),
            )
        }
        return snapshot
    }

    function create(
        content: string,
        title?: string,
        type: ToastType = 'success',
        duration: number = toastDefaults.duration,
    ): ToastId {
        const normalizedDuration = normalizeToastDuration(
            duration,
            toastDefaults.duration,
        )
        const id =
            globalThis.crypto?.randomUUID?.() ??
            `${Date.now()}-${Math.random().toString(36).slice(2)}`

        toastsById.set(
            id,
            Object.freeze({
                id,
                content,
                title,
                type,
                duration: normalizedDuration,
                createdAt: Date.now(),
                remaining: normalizedDuration,
            }),
        )
        toastOrder.push(id)
        snapshot = undefined
        if (
            maxQueuedToasts !== undefined &&
            toastOrder.length > maxQueuedToasts
        ) {
            const evicted = toastOrder.shift()!
            cancelAutoDismiss(evicted)
            pauseReasons.delete(evicted)
            toastsById.delete(evicted)
        }
        syncToastTimers()
        notifyListeners()

        return id
    }

    function update(id: ToastId, updateOptions: ToastUpdateOptions) {
        const currentToast = toastsById.get(id)
        if (!currentToast) return false
        const resetsDuration = updateOptions.duration !== undefined
        const duration = resetsDuration
            ? normalizeToastDuration(
                  updateOptions.duration,
                  toastDefaults.duration,
              )
            : currentToast.duration
        const nextToast: Toast = Object.freeze({
            ...currentToast,
            content: updateOptions.content ?? currentToast.content,
            title:
                updateOptions.title === null
                    ? undefined
                    : (updateOptions.title ?? currentToast.title),
            type: updateOptions.type ?? currentToast.type,
            duration,
            createdAt: resetsDuration
                ? Math.max(Date.now(), currentToast.createdAt + 1)
                : currentToast.createdAt,
            remaining: resetsDuration ? duration : currentToast.remaining,
            timerStartedAt: resetsDuration
                ? undefined
                : currentToast.timerStartedAt,
        })

        if (
            !resetsDuration &&
            nextToast.content === currentToast.content &&
            nextToast.title === currentToast.title &&
            nextToast.type === currentToast.type
        )
            return true
        toastsById.set(id, nextToast)
        snapshot = undefined

        if (resetsDuration) cancelAutoDismiss(id)

        syncToastTimers()
        notifyListeners()

        return true
    }

    function remove(id: ToastId) {
        cancelAutoDismiss(id)
        pauseReasons.delete(id)

        if (!toastsById.delete(id)) return
        toastOrder.splice(toastOrder.indexOf(id), 1)
        snapshot = undefined
        syncToastTimers()
        notifyListeners()
    }

    function setPauseReason(
        id: ToastId,
        reason: ToastPauseReason,
        paused: boolean,
        owner = defaultPauseOwner,
    ) {
        if (!toastsById.has(id)) return

        const reasons =
            pauseReasons.get(id) ?? new Map<ToastPauseReason, Set<symbol>>()
        const owners = reasons.get(reason) ?? new Set<symbol>()
        if (owners.has(owner) === paused) return

        if (paused) owners.add(owner)
        else owners.delete(owner)

        if (owners.size > 0) reasons.set(reason, owners)
        else reasons.delete(reason)

        if (reasons.size > 0) pauseReasons.set(id, reasons)
        else pauseReasons.delete(id)

        syncToastTimers()
        notifyListeners()
    }

    function clearAll() {
        toastTimers.forEach(({ handle }) => globalThis.clearTimeout(handle))
        toastTimers.clear()
        pauseReasons.clear()

        if (toastOrder.length === 0) return
        toastOrder.length = 0
        toastsById.clear()
        snapshot = Object.freeze([])
        notifyListeners()
    }

    function dispose() {
        clearAll()
        listeners.clear()
    }

    const core: ToastStoreCore = {
        getToastDefaults: getDefaults,
        configureToastDefaults: configureDefaults,
        restoreToastDefaults: restoreDefaults,
        subscribeToToasts: subscribe,
        getToastSnapshot: getSnapshot,
        createToast: create,
        updateToast: update,
        removeToast: remove,
        setToastPauseReason: setPauseReason,
        clearAllToasts: clearAll,
        dispose,
    }

    toastProviderDefaultsRegistrars.set(core, registerProviderDefaults)
    return core
}

export const defaultToastStore = createToastStoreCore()
