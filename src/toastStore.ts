import type { Toast, ToastId, ToastType, ToastUpdateOptions } from './types.js'
import {
    DEFAULT_TOAST_DURATION,
    getRemainingToastTime,
    normalizeToastDuration,
} from './Hooks/toastTiming.js'

interface ToastTimer {
    handle: ReturnType<typeof globalThis.setTimeout>
    token: symbol
}

type PauseReason = 'hover' | 'focus'

let toastsState: Toast[] = []
const listeners = new Set<() => void>()
const toastTimers = new Map<ToastId, ToastTimer>()
const pauseReasons = new Map<ToastId, Set<PauseReason>>()

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
    const visibleIds = new Set(toastsState.slice(-3).map((toast) => toast.id))

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
                removeToast(toast.id)
            }, toast.remaining)

            toastTimers.set(toast.id, { handle, token })
            replaceToastTiming(toast.id, toast.remaining, startedAt)
        }

        if (!visibleIds.has(toast.id)) pauseReasons.delete(toast.id)
    }
}

export function subscribeToToasts(listener: () => void) {
    listeners.add(listener)

    return () => {
        listeners.delete(listener)
    }
}

export function getToastSnapshot() {
    return toastsState
}

export function createToast(
    content: string,
    title?: string,
    type: ToastType = 'success',
    duration: number = DEFAULT_TOAST_DURATION,
): ToastId {
    const normalizedDuration = normalizeToastDuration(duration)
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

export function updateToast(id: ToastId, options: ToastUpdateOptions) {
    const toastIndex = toastsState.findIndex((toast) => toast.id === id)

    if (toastIndex === -1) return false

    const currentToast = toastsState[toastIndex]
    const resetsDuration = options.duration !== undefined
    const duration = resetsDuration
        ? normalizeToastDuration(options.duration)
        : currentToast.duration
    const nextToast: Toast = {
        ...currentToast,
        content: options.content ?? currentToast.content,
        title:
            options.title === null
                ? undefined
                : (options.title ?? currentToast.title),
        type: options.type ?? currentToast.type,
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

export function removeToast(id: ToastId) {
    cancelAutoDismiss(id)
    pauseReasons.delete(id)

    const nextToastsState = toastsState.filter((toast) => toast.id !== id)

    if (nextToastsState.length === toastsState.length) return

    toastsState = nextToastsState
    syncToastTimers()
    notifyListeners()
}

export function setToastPauseReason(
    id: ToastId,
    reason: PauseReason,
    paused: boolean,
) {
    if (!toastsState.some((toast) => toast.id === id)) return

    const reasons = pauseReasons.get(id) ?? new Set<PauseReason>()
    if (reasons.has(reason) === paused) return

    if (paused) reasons.add(reason)
    else reasons.delete(reason)

    if (reasons.size > 0) pauseReasons.set(id, reasons)
    else pauseReasons.delete(id)

    syncToastTimers()
    notifyListeners()
}

export function clearAllToasts() {
    toastTimers.forEach(({ handle }) => globalThis.clearTimeout(handle))
    toastTimers.clear()
    pauseReasons.clear()

    if (toastsState.length === 0) return

    toastsState = []
    notifyListeners()
}
