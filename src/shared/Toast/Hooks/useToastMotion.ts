import { useCallback, useLayoutEffect, useRef } from 'react'
import {
    getToastCornerTransform,
    getToastEnterFrames,
    TOAST_SPRING_DURATION,
} from '../Animations/nativeToastAnimation.ts'
import type { ToastMotionProps } from '../Types/toast-animation.types.ts'

export function useToastMotion({
    position,
    present,
    reducedMotion,
    onExitComplete,
}: ToastMotionProps) {
    const node = useRef<HTMLDivElement | null>(null)
    const transform = useRef<Animation | null>(null)
    const opacity = useRef<Animation | null>(null)
    const mounted = useRef(false)
    const complete = useRef(onExitComplete)
    const interrupted = useRef<{ transform: string; opacity: string } | null>(
        null,
    )

    const setNode = useCallback((element: HTMLDivElement | null) => {
        if (node.current !== element) mounted.current = false
        node.current = element
    }, [])

    const stopMotion = useCallback(() => {
        transform.current?.cancel()
        opacity.current?.cancel()
        transform.current = null
        opacity.current = null
    }, [])

    useLayoutEffect(() => {
        complete.current = onExitComplete
    }, [onExitComplete])

    useLayoutEffect(() => {
        const element = node.current
        if (!element) return
        const initial = !mounted.current
        mounted.current = true
        const current = !initial ? getComputedStyle(element) : null
        const from =
            interrupted.current?.transform ?? current?.transform ?? 'none'
        const fromOpacity =
            interrupted.current?.opacity ?? current?.opacity ?? '0'
        interrupted.current = null
        stopMotion()
        element.style.transform = 'none'
        element.style.opacity = '1'
        element.style.touchAction = reducedMotion ? '' : 'pan-y'
        // Text selection can start a native drag before Firefox delivers the
        // next pointer move. Match the draggable surface's selection policy.
        element.style.userSelect = reducedMotion ? '' : 'none'
        element.style.setProperty(
            '-webkit-user-select',
            reducedMotion ? '' : 'none',
        )
        element.style.setProperty(
            '-webkit-touch-callout',
            reducedMotion ? '' : 'none',
        )

        if (reducedMotion || typeof element.animate !== 'function') {
            if (!present) complete.current?.()
            return stopMotion
        }

        if (present) {
            transform.current = element.animate(
                initial
                    ? getToastEnterFrames(position)
                    : [{ transform: from }, { transform: 'none' }],
                {
                    duration: initial ? TOAST_SPRING_DURATION : 220,
                    easing: initial ? 'linear' : 'ease-out',
                },
            )
            opacity.current = element.animate(
                [{ opacity: initial ? 0 : fromOpacity }, { opacity: 1 }],
                { duration: 200, easing: 'ease-out' },
            )
        } else {
            transform.current = element.animate(
                [
                    { transform: from },
                    { transform: getToastCornerTransform(position) },
                ],
                { duration: 300, easing: 'ease-out', fill: 'forwards' },
            )
            opacity.current = element.animate(
                [{ opacity: fromOpacity }, { opacity: 0 }],
                { duration: 300, easing: 'ease-out', fill: 'forwards' },
            )
            opacity.current.onfinish = () => complete.current?.()
        }
        return () => {
            const style = getComputedStyle(element)
            interrupted.current = {
                transform: style.transform,
                opacity: style.opacity,
            }
            stopMotion()
        }
    }, [position, present, reducedMotion, stopMotion])

    return { refs: { node }, handler: { stopMotion, setNode } }
}
