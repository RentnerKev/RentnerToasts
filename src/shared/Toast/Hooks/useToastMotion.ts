import { useCallback, useLayoutEffect, useRef } from 'react'
import {
    getToastCornerTransform,
    getToastEnterFrames,
    TOAST_SPRING_DURATION,
} from '../Animations/nativeToastAnimation.ts'
import type { ToastMotionProps } from '../Types/toast-animation.types.ts'

export function useToastMotion({
    toastId = '',
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
    const idRef = useRef(toastId)
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
        idRef.current = toastId
    }, [onExitComplete, toastId])

    useLayoutEffect(() => {
        const element = node.current
        if (!element) return
        const initial = !mounted.current
        mounted.current = true
        const saved = interrupted.current
        interrupted.current = null
        const current = !initial && !saved ? getComputedStyle(element) : null
        const from = saved?.transform ?? current?.transform ?? 'none'
        const fromOpacity = saved?.opacity ?? current?.opacity ?? '0'
        stopMotion()
        const style = element.style
        style.transform = 'none'
        style.opacity = '1'
        style.touchAction = reducedMotion ? '' : 'pan-y'
        // Text selection can start a native drag before Firefox delivers the
        // next pointer move. Match the draggable surface's selection policy.
        style.userSelect = reducedMotion ? '' : 'none'
        style.setProperty('-webkit-user-select', reducedMotion ? '' : 'none')
        style.setProperty('-webkit-touch-callout', reducedMotion ? '' : 'none')

        if (reducedMotion || typeof element.animate !== 'function') {
            if (!present) complete.current?.(idRef.current)
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
            opacity.current.onfinish = () => complete.current?.(idRef.current)
        }
        return () => {
            const bothFinished =
                transform.current?.playState === 'finished' &&
                opacity.current?.playState === 'finished'
            if (!bothFinished) {
                const computed = getComputedStyle(element)
                interrupted.current = {
                    transform: computed.transform,
                    opacity: computed.opacity,
                }
            }
            stopMotion()
        }
    }, [position, present, reducedMotion, stopMotion])

    return { refs: { node }, handler: { stopMotion, setNode } }
}
