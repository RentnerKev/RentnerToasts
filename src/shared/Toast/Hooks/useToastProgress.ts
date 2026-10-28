import { useLayoutEffect, useRef } from 'react'
import { getRemainingToastTime } from '../../../lib/ToastTiming/toastTiming.ts'
import type { Toast } from '../../../lib/ToastStore/Types/toast.types.ts'

export function useToastProgress(toast: Toast, reducedMotion: boolean) {
    const progress = useRef<HTMLDivElement | null>(null)
    const { duration, remaining, timerStartedAt } = toast

    useLayoutEffect(() => {
        const element = progress.current
        if (!element || duration === 0) return
        const time = getRemainingToastTime({
            duration,
            remaining,
            timerStartedAt,
        })
        const scale = time / duration
        element.style.transform = `scaleX(${scale})`
        if (
            reducedMotion ||
            timerStartedAt === undefined ||
            !time ||
            typeof element.animate !== 'function'
        ) {
            return
        }
        const animation = element.animate(
            [{ transform: `scaleX(${scale})` }, { transform: 'scaleX(0)' }],
            { duration: time, easing: 'linear', fill: 'forwards' },
        )
        return () => animation.cancel()
    }, [duration, reducedMotion, remaining, timerStartedAt])

    return progress
}
