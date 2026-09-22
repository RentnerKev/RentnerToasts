import type { Toast, ToastId, ToastType, ToastUpdateOptions } from './types.js'
import {
    DEFAULT_TOAST_DURATION,
    normalizeToastDuration,
} from './Hooks/toastTiming.js'

interface ToastTimer {
    handle: ReturnType<typeof globalThis.setTimeout>
    token: symbol
}

let toastsState: Toast[] = []
const listeners = new Set<() => void>()
const toastTimers = new Map<ToastId, ToastTimer>()

function notifyListeners() {
    listeners.forEach((listener) => listener())
}

function cancelAutoDismiss(id: ToastId) {
    const timer = toastTimers.get(id)

    if (timer === undefined) return

    globalThis.clearTimeout(timer.handle)
    toastTimers.delete(id)
}

function scheduleAutoDismiss(id: ToastId, duration: number) {
    cancelAutoDismiss(id)

    if (duration === 0) return

    const token = Symbol(id)
    const handle = globalThis.setTimeout(() => {
        if (toastTimers.get(id)?.token !== token) return

        toastTimers.delete(id)
        removeToast(id)
    }, duration)

    toastTimers.set(id, { handle, token })
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
        },
    ]
    scheduleAutoDismiss(id, normalizedDuration)
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
    }

    toastsState = toastsState.map((toast, index) =>
        index === toastIndex ? nextToast : toast,
    )

    if (resetsDuration) {
        scheduleAutoDismiss(id, duration)
    }

    notifyListeners()

    return true
}

export function removeToast(id: ToastId) {
    cancelAutoDismiss(id)

    const nextToastsState = toastsState.filter((toast) => toast.id !== id)

    if (nextToastsState.length === toastsState.length) return

    toastsState = nextToastsState
    notifyListeners()
}

export function clearAllToasts() {
    toastTimers.forEach(({ handle }) => globalThis.clearTimeout(handle))
    toastTimers.clear()

    if (toastsState.length === 0) return

    toastsState = []
    notifyListeners()
}
