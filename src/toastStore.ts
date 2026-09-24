import type {
    Toast,
    ToastDefaults,
    ToastId,
    ToastPauseReason,
    ToastStore,
    ToastStoreOptions,
    ToastType,
    ToastUpdateOptions,
} from './types.js'
import {
    DEFAULT_TOAST_DURATION,
    getRemainingToastTime,
    normalizeToastDuration,
} from './Hooks/toastTiming.js'

export const DEFAULT_MAX_VISIBLE_TOASTS = 3

export type { ToastDefaults } from './types.js'

interface ToastTimer {
    handle: ReturnType<typeof globalThis.setTimeout>
    token: symbol
}

function normalizeMaxVisibleToasts(
    value: number | undefined,
    fallback: number,
) {
    return value !== undefined && Number.isInteger(value) && value > 0
        ? value
        : fallback
}

function getInitialDefaults(options: ToastStoreOptions): ToastDefaults {
    return {
        duration:
            normalizeToastDuration(
                options.defaultDuration,
                DEFAULT_TOAST_DURATION,
            ) ?? DEFAULT_TOAST_DURATION,
        maxVisibleToasts: normalizeMaxVisibleToasts(
            options.maxVisibleToasts,
            DEFAULT_MAX_VISIBLE_TOASTS,
        ),
    }
}

export interface ToastStoreCore extends Omit<ToastStore, 'toast'> {}

export function createToastStoreCore(
    options: ToastStoreOptions = {},
): ToastStoreCore {
    let toastDefaults = getInitialDefaults(options)
    let toastsState: Toast[] = []
    const listeners = new Set<() => void>()
    const toastTimers = new Map<ToastId, ToastTimer>()
    const pauseReasons = new Map<ToastId, Set<ToastPauseReason>>()

    function notifyListeners() {
        listeners.forEach((listener) => listener())
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
        toastsState = toastsState.map((toast) =>
            toast.id === id ? { ...toast, remaining, timerStartedAt } : toast,
        )
    }

    function syncToastTimers() {
        const visibleIds = new Set(
            toastsState
                .slice(-toastDefaults.maxVisibleToasts)
                .map((toast) => toast.id),
        )

        for (const toast of toastsState) {
            const shouldRun =
                toast.duration > 0 &&
                visibleIds.has(toast.id) &&
                !pauseReasons.get(toast.id)?.size
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

            if (!visibleIds.has(toast.id)) pauseReasons.delete(toast.id)
        }
    }

    function getDefaults() {
        return toastDefaults
    }

    function configureDefaults(
        defaults: Partial<ToastDefaults>,
    ): ToastDefaults {
        const previous = toastDefaults
        toastDefaults = {
            duration:
                defaults.duration === undefined
                    ? previous.duration
                    : (normalizeToastDuration(
                          defaults.duration,
                          previous.duration,
                      ) ?? previous.duration),
            maxVisibleToasts:
                defaults.maxVisibleToasts === undefined
                    ? previous.maxVisibleToasts
                    : normalizeMaxVisibleToasts(
                          defaults.maxVisibleToasts,
                          previous.maxVisibleToasts,
                      ),
        }
        toastsState = [...toastsState]
        syncToastTimers()
        notifyListeners()
        return previous
    }

    function restoreDefaults(defaults: ToastDefaults) {
        toastDefaults = defaults
        toastsState = [...toastsState]
        syncToastTimers()
        notifyListeners()
    }

    function subscribe(listener: () => void) {
        listeners.add(listener)

        return () => {
            listeners.delete(listener)
        }
    }

    function getSnapshot() {
        return toastsState
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

        toastsState = [
            ...toastsState,
            {
                id,
                content,
                title,
                type,
                duration: normalizedDuration,
                createdAt: Date.now(),
                remaining: normalizedDuration,
            },
        ]
        syncToastTimers()
        notifyListeners()

        return id
    }

    function update(id: ToastId, updateOptions: ToastUpdateOptions) {
        const toastIndex = toastsState.findIndex((toast) => toast.id === id)

        if (toastIndex === -1) return false

        const currentToast = toastsState[toastIndex]
        const resetsDuration = updateOptions.duration !== undefined
        const duration = resetsDuration
            ? normalizeToastDuration(
                  updateOptions.duration,
                  toastDefaults.duration,
              )
            : currentToast.duration
        const nextToast: Toast = {
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
        }

        toastsState = toastsState.map((toast, index) =>
            index === toastIndex ? nextToast : toast,
        )

        if (resetsDuration) cancelAutoDismiss(id)

        syncToastTimers()
        notifyListeners()

        return true
    }

    function remove(id: ToastId) {
        cancelAutoDismiss(id)
        pauseReasons.delete(id)

        const nextToastsState = toastsState.filter((toast) => toast.id !== id)

        if (nextToastsState.length === toastsState.length) return

        toastsState = nextToastsState
        syncToastTimers()
        notifyListeners()
    }

    function setPauseReason(
        id: ToastId,
        reason: ToastPauseReason,
        paused: boolean,
    ) {
        if (!toastsState.some((toast) => toast.id === id)) return

        const reasons = pauseReasons.get(id) ?? new Set<ToastPauseReason>()
        if (reasons.has(reason) === paused) return

        if (paused) reasons.add(reason)
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

        if (toastsState.length === 0) return

        toastsState = []
        notifyListeners()
    }

    function dispose() {
        clearAll()
        listeners.clear()
    }

    return {
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
}

export const defaultToastStore = createToastStoreCore()

export function getToastDefaults() {
    return defaultToastStore.getToastDefaults()
}

export function configureToastDefaults(
    defaults: Partial<ToastDefaults>,
): ToastDefaults {
    return defaultToastStore.configureToastDefaults(defaults)
}

export function restoreToastDefaults(defaults: ToastDefaults) {
    defaultToastStore.restoreToastDefaults(defaults)
}

export function subscribeToToasts(listener: () => void) {
    return defaultToastStore.subscribeToToasts(listener)
}

export function getToastSnapshot() {
    return defaultToastStore.getToastSnapshot()
}

export function createToast(
    content: string,
    title?: string,
    type: ToastType = 'success',
    duration?: number,
): ToastId {
    return defaultToastStore.createToast(content, title, type, duration)
}

export function updateToast(id: ToastId, options: ToastUpdateOptions) {
    return defaultToastStore.updateToast(id, options)
}

export function removeToast(id: ToastId) {
    defaultToastStore.removeToast(id)
}

export function setToastPauseReason(
    id: ToastId,
    reason: ToastPauseReason,
    paused: boolean,
) {
    defaultToastStore.setToastPauseReason(id, reason, paused)
}

export function clearAllToasts() {
    defaultToastStore.clearAllToasts()
}
