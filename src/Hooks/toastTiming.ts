import type { Toast } from '../types.js'

export const DEFAULT_TOAST_DURATION = 6000
export const MAX_TOAST_DURATION = 2_147_483_647

export function normalizeToastDuration(duration?: number) {
    if (duration === undefined || duration === 0) {
        return duration ?? DEFAULT_TOAST_DURATION
    }

    if (!Number.isFinite(duration) || duration < 0) {
        return DEFAULT_TOAST_DURATION
    }

    return Math.min(Math.max(Math.round(duration), 1), MAX_TOAST_DURATION)
}

export function getRemainingToastTime(
    toast: Pick<Toast, 'duration' | 'createdAt'>,
) {
    if (toast.duration === 0) return 0

    const elapsedTime = Math.max(0, Date.now() - toast.createdAt)

    return Math.min(toast.duration, Math.max(0, toast.duration - elapsedTime))
}
