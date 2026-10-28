import {
    useCallback,
    useLayoutEffect,
    useRef,
    type MouseEvent,
    type PointerEvent,
} from 'react'
import {
    getToastSnapBackFrames,
    TOAST_SPRING_DURATION,
} from '../Animations/nativeToastAnimation.ts'
import type {
    ToastSwipeProps,
    ToastSwipeSession,
} from '../Types/toast-animation.types.ts'

function releaseCapture(element: HTMLElement, pointerId: number) {
    if (element.hasPointerCapture(pointerId))
        element.releasePointerCapture(pointerId)
}

export function useToastSwipe({
    enabled,
    onDismiss,
    onStart,
}: ToastSwipeProps) {
    const node = useRef<HTMLDivElement | null>(null)
    const setNode = useCallback((element: HTMLDivElement | null) => {
        node.current = element
    }, [])
    const session = useRef<ToastSwipeSession | null>(null)
    const frame = useRef<number | null>(null)
    const snapBack = useRef<Animation | null>(null)
    const suppressClick = useRef(false)

    function cancelFrame() {
        if (frame.current !== null) cancelAnimationFrame(frame.current)
        frame.current = null
    }

    function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
        suppressClick.current = false
        if (!enabled || event.button !== 0 || !event.isPrimary) return
        const target = event.target
        if (
            target instanceof Element &&
            target.closest(
                'a, button, input, textarea, select, [contenteditable="true"], [role="button"]',
            )
        )
            return
        session.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            offset: 0,
            originX: 0,
            dragging: false,
            samples: [{ x: event.clientX, time: event.timeStamp }],
        }
    }

    function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
        const gesture = session.current
        if (!gesture || gesture.pointerId !== event.pointerId || !enabled)
            return
        const x = event.clientX - gesture.startX
        const y = event.clientY - gesture.startY
        if (!gesture.dragging) {
            if (Math.abs(y) > 10 && Math.abs(y) > Math.abs(x)) {
                session.current = null
                return
            }
            if (Math.abs(x) < 3) return
            gesture.dragging = true
            gesture.originX = new DOMMatrix(
                getComputedStyle(event.currentTarget).transform,
            ).m41
            snapBack.current?.cancel()
            snapBack.current = null
            onStart()
            event.currentTarget.setPointerCapture(event.pointerId)
            event.currentTarget.style.cursor = 'grabbing'
            event.currentTarget.style.userSelect = 'none'
        }
        gesture.offset = x
        gesture.samples.push({ x: event.clientX, time: event.timeStamp })
        while (
            gesture.samples.length > 1 &&
            gesture.samples[1]!.time < event.timeStamp - 100
        ) {
            gesture.samples.shift()
        }
        if (frame.current === null) {
            frame.current = requestAnimationFrame(() => {
                frame.current = null
                if (node.current && session.current === gesture) {
                    node.current.style.transform = `translateX(${gesture.originX + gesture.offset * 0.7}px) scale(1.02)`
                }
            })
        }
    }

    function finishGesture(
        event: PointerEvent<HTMLDivElement>,
        cancelled: boolean,
    ) {
        const gesture = session.current
        if (!gesture || gesture.pointerId !== event.pointerId) return
        session.current = null
        cancelFrame()
        const element = event.currentTarget
        releaseCapture(element, event.pointerId)
        element.style.cursor = ''
        element.style.userSelect = enabled ? 'none' : ''
        if (!gesture.dragging) return
        const offset = gesture.originX + gesture.offset * 0.7
        element.style.transform = `translateX(${offset}px) scale(1.02)`
        suppressClick.current = !cancelled
        const sample =
            gesture.samples.find(
                (item) => item.time >= event.timeStamp - 100,
            ) ?? gesture.samples.at(-1)!
        const elapsed = event.timeStamp - sample.time
        const velocity =
            elapsed > 0 ? ((event.clientX - sample.x) * 1000) / elapsed : 0
        if (
            !cancelled &&
            enabled &&
            (Math.abs(gesture.offset) > 80 || Math.abs(velocity) > 400)
        ) {
            onDismiss()
            return
        }
        element.style.transform = 'none'
        if (typeof element.animate !== 'function') return
        const animation = element.animate(
            getToastSnapBackFrames(offset, 1.02, cancelled ? 0 : velocity),
            {
                duration: TOAST_SPRING_DURATION,
                easing: 'linear',
            },
        )
        snapBack.current = animation
        animation.onfinish = () => {
            animation.cancel()
            if (snapBack.current === animation) snapBack.current = null
        }
    }

    function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
        if (suppressClick.current && event.detail > 0) {
            suppressClick.current = false
            event.preventDefault()
            event.stopPropagation()
        }
    }

    useLayoutEffect(() => {
        if (enabled) return
        const element = node.current
        const gesture = session.current
        session.current = null
        if (frame.current !== null) cancelAnimationFrame(frame.current)
        frame.current = null
        snapBack.current?.cancel()
        snapBack.current = null
        if (element && gesture) {
            if (element.hasPointerCapture(gesture.pointerId))
                element.releasePointerCapture(gesture.pointerId)
            element.style.transform = 'none'
            element.style.cursor = ''
            element.style.userSelect = ''
        }
    }, [enabled, node])

    useLayoutEffect(
        () => () => {
            if (frame.current !== null) cancelAnimationFrame(frame.current)
            snapBack.current?.cancel()
            session.current = null
        },
        [],
    )

    return {
        refs: { setNode },
        handler: {
            handlePointerDown,
            handlePointerMove,
            handlePointerUp: (event: PointerEvent<HTMLDivElement>) =>
                finishGesture(event, false),
            handlePointerCancel: (event: PointerEvent<HTMLDivElement>) =>
                finishGesture(event, true),
            handleLostPointerCapture: (event: PointerEvent<HTMLDivElement>) =>
                finishGesture(event, true),
            handleClickCapture,
        },
    }
}
