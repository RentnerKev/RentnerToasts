import type {
    ToastStoreCore,
    ToastTimer,
    ToastProviderDefaultsRegistrar,
} from './Types/toast-store-internal.types.ts'
import type {
    Toast,
    ToastDefaults,
    ToastOptions,
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
const EMPTY_SNAPSHOT: readonly Toast[] = Object.freeze([])

interface ToastNode {
    readonly id: ToastId
    toast: Toast
    prev: ToastNode | null
    next: ToastNode | null
}

function normalizeDedupeWindow(value: number | undefined, fallback: number) {
    return value !== undefined &&
        value >= 0 &&
        (Number.isFinite(value) || value === Infinity)
        ? value
        : fallback
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
    return Object.freeze({
        duration:
            normalizeToastDuration(
                options.defaultDuration,
                DEFAULT_TOAST_DURATION,
            ) ?? DEFAULT_TOAST_DURATION,
        pauseWhenQueued:
            typeof options.pauseWhenQueued === 'boolean'
                ? options.pauseWhenQueued
                : true,
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
    const duration =
        defaults.duration === undefined
            ? fallback.duration
            : (normalizeToastDuration(defaults.duration, fallback.duration) ??
              fallback.duration)
    const pauseWhenQueued =
        typeof defaults.pauseWhenQueued === 'boolean'
            ? defaults.pauseWhenQueued
            : (fallback.pauseWhenQueued ?? true)
    const maxVisibleToasts =
        defaults.maxVisibleToasts === undefined
            ? fallback.maxVisibleToasts
            : normalizeMaxVisibleToasts(
                  defaults.maxVisibleToasts,
                  fallback.maxVisibleToasts,
              )
    if (
        duration === fallback.duration &&
        pauseWhenQueued === fallback.pauseWhenQueued &&
        maxVisibleToasts === fallback.maxVisibleToasts
    ) {
        return fallback
    }
    return Object.freeze({
        duration,
        pauseWhenQueued,
        maxVisibleToasts,
    })
}

const toastProviderDefaultsRegistrars = new WeakMap<
    object,
    ToastProviderDefaultsRegistrar
>()
const toastVisibleSnapshotAccessors = new WeakMap<
    object,
    () => readonly Toast[]
>()
const toastByIdAccessors = new WeakMap<
    object,
    (id: ToastId) => Toast | undefined
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
                pauseWhenQueued: currentDefaults.pauseWhenQueued ?? true,
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
    const getVisible = toastVisibleSnapshotAccessors.get(source)
    if (getVisible) toastVisibleSnapshotAccessors.set(destination, getVisible)
    const getById = toastByIdAccessors.get(source)
    if (getById) toastByIdAccessors.set(destination, getById)
}

export function getVisibleToastSnapshotAccessor(
    store: object,
): (() => readonly Toast[]) | undefined {
    return toastVisibleSnapshotAccessors.get(store)
}

export function getToastById(
    store: ToastStore,
    id: ToastId,
): Toast | undefined {
    const accessor = toastByIdAccessors.get(store)
    if (accessor) return accessor(id)
    return store.getToastSnapshot().find((toast) => toast.id === id)
}

export function createToastStoreCore(
    options: ToastStoreOptions = {},
): ToastStoreCore {
    let baseToastDefaults = getInitialDefaults(options)
    let toastDefaults = baseToastDefaults
    let head: ToastNode | null = null
    let tail: ToastNode | null = null
    const nodesById = new Map<ToastId, ToastNode>()
    const dedupeByKey = new Map<
        string,
        { id: ToastId; createdAt: number; window: number }
    >()
    const dedupeKeysById = new Map<ToastId, string>()
    const defaultDedupeWindow = normalizeDedupeWindow(
        options.dedupeWindow,
        Infinity,
    )

    function forgetDedupe(id: ToastId) {
        const key = dedupeKeysById.get(id)
        if (key !== undefined) {
            if (dedupeByKey.get(key)?.id === id) dedupeByKey.delete(key)
            dedupeKeysById.delete(id)
        }
    }

    let snapshot: readonly Toast[] | undefined = EMPTY_SNAPSHOT
    let visibleSnapshot: readonly Toast[] | undefined = EMPTY_SNAPSHOT
    const maxQueuedToasts =
        options.maxQueuedToasts !== undefined &&
        Number.isInteger(options.maxQueuedToasts) &&
        options.maxQueuedToasts > 0
            ? options.maxQueuedToasts
            : undefined
    const listeners = new Set<() => void>()
    const toastTimers = new Map<ToastId, ToastTimer>()
    let nextTimerToken = 1
    const pauseReasons = new Map<ToastId, Map<ToastPauseReason, Set<symbol>>>()
    const defaultPauseOwner = Symbol('toast-pause')
    const providerDefaults = new Map<symbol, Partial<ToastDefaults>>()

    function notifyListeners() {
        const count = listeners.size
        if (count === 0) return
        if (count === 1) {
            const only = listeners.values().next().value
            only?.()
            return
        }
        // A subscriber may unsubscribe/resubscribe while handling this change.
        // Visit each original subscription at most once per notification.
        for (const listener of Array.from(listeners)) {
            if (listeners.has(listener)) listener()
        }
    }

    function isNodeVisible(node: ToastNode): boolean {
        let after = 0
        const limit = toastDefaults.maxVisibleToasts
        for (let cur = node.next; cur && after < limit; cur = cur.next) {
            after += 1
        }
        return after < limit
    }

    function getNodeFromTail(distance: number): ToastNode | null {
        let cur = tail
        for (let step = 0; step < distance && cur; step += 1) {
            cur = cur.prev
        }
        return cur
    }

    function cancelAutoDismiss(id: ToastId) {
        const timer = toastTimers.get(id)

        if (timer === undefined) return

        globalThis.clearTimeout(timer.handle)
        toastTimers.delete(id)
    }

    function scheduleAutoDismiss(id: ToastId, delay: number) {
        const token = nextTimerToken++
        const handle = globalThis.setTimeout(() => {
            if (toastTimers.get(id)?.token !== token) return

            toastTimers.delete(id)
            remove(id)
        }, delay)

        toastTimers.set(id, { handle, token })
    }

    function replaceNodeTiming(
        node: ToastNode,
        remaining: number,
        timerStartedAt: number | undefined,
        visible: boolean,
    ) {
        const toast = node.toast
        if (
            toast.remaining === remaining &&
            toast.timerStartedAt === timerStartedAt
        )
            return
        node.toast = Object.freeze({ ...toast, remaining, timerStartedAt })
        snapshot = undefined
        if (visible) visibleSnapshot = undefined
    }

    function startNodeTimer(node: ToastNode, visible: boolean) {
        const startedAt = Date.now()
        scheduleAutoDismiss(node.id, node.toast.remaining)
        replaceNodeTiming(node, node.toast.remaining, startedAt, visible)
    }

    function pauseNodeTimer(node: ToastNode, visible: boolean) {
        const remaining = getRemainingToastTime(node.toast)
        cancelAutoDismiss(node.id)
        replaceNodeTiming(node, remaining, undefined, visible)
    }

    function syncToastTimers() {
        const runAllQueued = toastDefaults.pauseWhenQueued === false
        const activeNodes = new Set<ToastNode>()
        if (runAllQueued) {
            for (let cur = head; cur; cur = cur.next) activeNodes.add(cur)
        } else {
            const limit = toastDefaults.maxVisibleToasts
            let count = 0
            for (let cur = tail; cur && count < limit; cur = cur.prev) {
                activeNodes.add(cur)
                count += 1
            }
        }
        // The default remains bounded by the visible window. Opting out of
        // queue pauses starts every timed notification at creation.
        for (const id of toastTimers.keys()) {
            const node = nodesById.get(id)
            if (!node) {
                cancelAutoDismiss(id)
                continue
            }
            if (!activeNodes.has(node) || pauseReasons.has(id)) {
                pauseNodeTimer(node, isNodeVisible(node))
            }
        }
        for (const node of activeNodes) {
            const toast = node.toast
            const shouldRun = toast.duration > 0 && !pauseReasons.has(node.id)
            const hasTimer = toastTimers.has(node.id)

            if (hasTimer && !shouldRun) {
                pauseNodeTimer(node, isNodeVisible(node))
            } else if (!hasTimer && shouldRun) {
                startNodeTimer(node, isNodeVisible(node))
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

        if (
            nextDefaults.duration === toastDefaults.duration &&
            nextDefaults.pauseWhenQueued === toastDefaults.pauseWhenQueued &&
            nextDefaults.maxVisibleToasts === toastDefaults.maxVisibleToasts
        ) {
            return
        }

        toastDefaults = nextDefaults
        // Subscribers also read defaults, so a defaults change needs a fresh
        // snapshot even when no notification itself has changed.
        snapshot = undefined
        visibleSnapshot = undefined
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
            pauseWhenQueued: defaults.pauseWhenQueued ?? true,
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
            if (!head) {
                snapshot = EMPTY_SNAPSHOT
            } else {
                const items: Toast[] = []
                for (let cur: ToastNode | null = head; cur; cur = cur.next) {
                    items.push(cur.toast)
                }
                snapshot = Object.freeze(items)
            }
        }
        return snapshot
    }

    function getVisibleSnapshot() {
        if (!visibleSnapshot) {
            if (!tail) {
                visibleSnapshot = EMPTY_SNAPSHOT
            } else {
                const limit = toastDefaults.maxVisibleToasts
                const reversed: Toast[] = []
                for (
                    let cur: ToastNode | null = tail;
                    cur && reversed.length < limit;
                    cur = cur.prev
                ) {
                    reversed.push(cur.toast)
                }
                reversed.reverse()
                visibleSnapshot = Object.freeze(reversed)
            }
        }
        return visibleSnapshot
    }

    function create(
        content: string,
        title?: string,
        type: ToastType = 'success',
        duration: number = toastDefaults.duration,
        dedupe?: ToastOptions,
    ): ToastId {
        const createdAt = Date.now()
        const dedupeKey = dedupe?.dedupeKey
        const dedupeWindow =
            dedupe?.dedupeWindow !== undefined
                ? normalizeDedupeWindow(
                      dedupe.dedupeWindow,
                      defaultDedupeWindow,
                  )
                : defaultDedupeWindow
        if (dedupeKey !== undefined && dedupeWindow > 0) {
            const previous = dedupeByKey.get(dedupeKey)
            if (
                previous &&
                nodesById.has(previous.id) &&
                createdAt - previous.createdAt < previous.window
            )
                return previous.id
        }
        const normalizedDuration = normalizeToastDuration(
            duration,
            toastDefaults.duration,
        )
        const id =
            globalThis.crypto?.randomUUID?.() ??
            `${createdAt}-${Math.random().toString(36).slice(2)}`

        const frozenAction = dedupe?.action
            ? Object.freeze({ ...dedupe.action })
            : undefined
        let toast: Toast
        if (normalizedDuration > 0) {
            scheduleAutoDismiss(id, normalizedDuration)
            toast = Object.freeze({
                id,
                content,
                title,
                action: frozenAction,
                type,
                duration: normalizedDuration,
                createdAt,
                remaining: normalizedDuration,
                timerStartedAt: createdAt,
            })
        } else {
            toast = Object.freeze({
                id,
                content,
                title,
                action: frozenAction,
                type,
                duration: normalizedDuration,
                createdAt,
                remaining: normalizedDuration,
            })
        }

        const node: ToastNode = {
            id,
            toast,
            prev: tail,
            next: null,
        }
        if (tail) tail.next = node
        else head = node
        tail = node
        nodesById.set(id, node)

        if (dedupeKey !== undefined && dedupeWindow > 0) {
            dedupeByKey.set(dedupeKey, {
                id,
                createdAt,
                window: dedupeWindow,
            })
            dedupeKeysById.set(id, dedupeKey)
        }

        if (
            maxQueuedToasts !== undefined &&
            nodesById.size > maxQueuedToasts &&
            head
        ) {
            const evicted = head
            head = evicted.next
            if (head) head.prev = null
            else tail = null
            evicted.next = null
            cancelAutoDismiss(evicted.id)
            pauseReasons.delete(evicted.id)
            forgetDedupe(evicted.id)
            nodesById.delete(evicted.id)
        }

        if (
            toastDefaults.pauseWhenQueued !== false &&
            nodesById.size > toastDefaults.maxVisibleToasts
        ) {
            const pushedOut = getNodeFromTail(toastDefaults.maxVisibleToasts)
            if (pushedOut && toastTimers.has(pushedOut.id)) {
                pauseNodeTimer(pushedOut, false)
            }
        }

        snapshot = undefined
        visibleSnapshot = undefined
        notifyListeners()

        return id
    }

    function update(id: ToastId, updateOptions: ToastUpdateOptions) {
        const node = nodesById.get(id)
        if (!node) return false
        const currentToast = node.toast
        const resetsDuration = updateOptions.duration !== undefined
        const nextContent = updateOptions.content ?? currentToast.content
        const nextTitle =
            updateOptions.title === null
                ? undefined
                : (updateOptions.title ?? currentToast.title)
        const nextType = updateOptions.type ?? currentToast.type
        const hasActionInput = updateOptions.action !== undefined
        const nextAction =
            updateOptions.action === null
                ? undefined
                : hasActionInput
                  ? Object.freeze({ ...updateOptions.action! })
                  : currentToast.action

        if (
            !resetsDuration &&
            nextContent === currentToast.content &&
            nextTitle === currentToast.title &&
            nextType === currentToast.type &&
            nextAction === currentToast.action
        ) {
            return true
        }

        const visible = isNodeVisible(node)
        let duration = currentToast.duration
        let createdAt = currentToast.createdAt
        let remaining = currentToast.remaining
        let timerStartedAt = currentToast.timerStartedAt

        if (resetsDuration) {
            cancelAutoDismiss(id)
            duration = normalizeToastDuration(
                updateOptions.duration,
                toastDefaults.duration,
            )
            const now = Date.now()
            createdAt = Math.max(now, currentToast.createdAt + 1)
            remaining = duration
            if (
                duration > 0 &&
                !pauseReasons.has(id) &&
                (toastDefaults.pauseWhenQueued === false || visible)
            ) {
                scheduleAutoDismiss(id, duration)
                timerStartedAt = now
            } else {
                timerStartedAt = undefined
            }
        }

        node.toast = Object.freeze({
            ...currentToast,
            action: nextAction,
            content: nextContent,
            title: nextTitle,
            type: nextType,
            duration,
            createdAt,
            remaining,
            timerStartedAt,
        })
        snapshot = undefined
        if (visible) visibleSnapshot = undefined

        notifyListeners()
        return true
    }

    function remove(id: ToastId) {
        cancelAutoDismiss(id)
        pauseReasons.delete(id)
        forgetDedupe(id)

        const node = nodesById.get(id)
        if (!node) return
        const wasVisible = isNodeVisible(node)

        if (node.prev) node.prev.next = node.next
        else head = node.next
        if (node.next) node.next.prev = node.prev
        else tail = node.prev
        node.prev = null
        node.next = null
        nodesById.delete(id)

        snapshot = undefined
        if (wasVisible) {
            visibleSnapshot = undefined
            if (
                toastDefaults.pauseWhenQueued !== false &&
                nodesById.size >= toastDefaults.maxVisibleToasts
            ) {
                const promoted = getNodeFromTail(
                    toastDefaults.maxVisibleToasts - 1,
                )
                if (
                    promoted &&
                    promoted.toast.duration > 0 &&
                    !pauseReasons.has(promoted.id) &&
                    !toastTimers.has(promoted.id)
                ) {
                    startNodeTimer(promoted, true)
                }
            }
        }

        notifyListeners()
    }

    function setPauseReason(
        id: ToastId,
        reason: ToastPauseReason,
        paused: boolean,
        owner = defaultPauseOwner,
    ) {
        const node = nodesById.get(id)
        if (!node) return

        if (!paused) {
            const reasons = pauseReasons.get(id)
            if (!reasons) return
            const owners = reasons.get(reason)
            if (!owners || !owners.delete(owner)) return
            if (owners.size === 0) reasons.delete(reason)
            if (reasons.size === 0) {
                pauseReasons.delete(id)
                if (node.toast.duration > 0 && !toastTimers.has(id)) {
                    const visible = isNodeVisible(node)
                    if (toastDefaults.pauseWhenQueued === false || visible) {
                        startNodeTimer(node, visible)
                    }
                }
            }
            notifyListeners()
            return
        }

        let reasons = pauseReasons.get(id)
        const wasPaused = reasons !== undefined && reasons.size > 0
        if (!reasons) {
            reasons = new Map()
            pauseReasons.set(id, reasons)
        }
        let owners = reasons.get(reason)
        if (!owners) {
            owners = new Set()
            reasons.set(reason, owners)
        } else if (owners.has(owner)) {
            return
        }
        owners.add(owner)

        if (!wasPaused && toastTimers.has(id)) {
            pauseNodeTimer(node, isNodeVisible(node))
        }
        notifyListeners()
    }

    function clearAll() {
        for (const { handle } of toastTimers.values()) {
            globalThis.clearTimeout(handle)
        }
        toastTimers.clear()
        pauseReasons.clear()
        dedupeByKey.clear()
        dedupeKeysById.clear()

        if (!head) return
        head = null
        tail = null
        nodesById.clear()
        snapshot = EMPTY_SNAPSHOT
        visibleSnapshot = EMPTY_SNAPSHOT
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
    toastVisibleSnapshotAccessors.set(core, getVisibleSnapshot)
    toastByIdAccessors.set(core, (id) => nodesById.get(id)?.toast)
    return core
}

export const defaultToastStore = /*#__PURE__*/ createToastStoreCore()
