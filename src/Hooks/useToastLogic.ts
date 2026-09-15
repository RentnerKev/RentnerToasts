import { useMemo, useSyncExternalStore } from 'react'
import type { Toast, ToastType } from '../types.js'
import {
    DEFAULT_TOAST_DURATION,
    normalizeToastDuration,
} from './toastTiming.js'

let toastsState: Toast[] = []
const listeners = new Set<() => void>()
const toastTimers = new Map<string, ReturnType<typeof globalThis.setTimeout>>()

function notifyListeners() {
    listeners.forEach((listener) => listener())
}

function subscribeToToasts(listener: () => void) {
    listeners.add(listener)

    return () => {
        listeners.delete(listener)
    }
}

export function getToastSnapshot() {
    return toastsState
}

function scheduleAutoDismiss(id: string, duration: number) {
    if (duration === 0) return

    const timer = globalThis.setTimeout(() => {
        toastTimers.delete(id)
        removeToast(id)
    }, duration)

    toastTimers.set(id, timer)
}

export function customToast(
    content: string,
    title?: string,
    type: ToastType = 'success',
    duration: number = DEFAULT_TOAST_DURATION,
): string {
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
    notifyListeners()

    scheduleAutoDismiss(id, normalizedDuration)

    return id
}

export function removeToast(id: string) {
    const timer = toastTimers.get(id)

    if (timer !== undefined) {
        globalThis.clearTimeout(timer)
        toastTimers.delete(id)
    }

    const nextToastsState = toastsState.filter((toast) => toast.id !== id)

    if (nextToastsState.length === toastsState.length) return

    toastsState = nextToastsState
    notifyListeners()
}

export function clearAllToasts() {
    toastTimers.forEach((timer) => globalThis.clearTimeout(timer))
    toastTimers.clear()

    if (toastsState.length === 0) return

    toastsState = []
    notifyListeners()
}

export function useToastLogic() {
    const toasts = useSyncExternalStore(
        subscribeToToasts,
        getToastSnapshot,
        getToastSnapshot,
    )

    const visibleToasts = useMemo(() => toasts.slice(-3), [toasts])

    return {
        handler: { removeToast },
        state: { toasts, visibleToasts },
    }
}
