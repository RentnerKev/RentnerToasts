import { useLayoutEffect, useRef, type PointerEvent } from 'react'
import {
    createSpringFrames,
    getCloseIconFrames,
    CLOSE_ICON_SPRING_DURATION,
} from '../Animations/nativeToastAnimation.ts'

export function useToastActionLogic(animated: boolean) {
    const button = useRef<HTMLButtonElement | null>(null)
    const scaleAnimation = useRef<Animation | null>(null)
    const iconAnimation = useRef<Animation | null>(null)
    const hovered = useRef(false)

    function animateScale(scale: number) {
        const node = button.current
        if (!node || !animated) return
        const current = new DOMMatrix(getComputedStyle(node).transform).a
        scaleAnimation.current?.cancel()
        node.style.transform = `scale(${scale})`
        if (typeof node.animate !== 'function') return
        scaleAnimation.current = node.animate(
            createSpringFrames(
                current,
                scale,
                500,
                30,
                (value) => `scale(${value})`,
            ),
            { duration: 800, easing: 'linear' },
        )
    }

    function animateIcon(angle: number) {
        const node = button.current?.querySelector<HTMLElement>(
            '[data-toast-close-icon]',
        )
        if (!node || !animated) return
        const matrix = new DOMMatrix(getComputedStyle(node).transform)
        const current = (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI
        iconAnimation.current?.cancel()
        node.style.transform = `rotate(${angle}deg)`
        if (typeof node.animate !== 'function') return
        iconAnimation.current = node.animate(
            getCloseIconFrames(current, angle),
            { duration: CLOSE_ICON_SPRING_DURATION, easing: 'linear' },
        )
    }

    function handlePointerEnter(event: PointerEvent<HTMLButtonElement>) {
        if (event.pointerType === 'touch') return
        hovered.current = true
        animateScale(1.15)
        animateIcon(90)
    }

    function handlePointerLeave() {
        hovered.current = false
        animateScale(1)
        animateIcon(0)
    }

    useLayoutEffect(() => {
        const node = button.current
        if (!animated && node) {
            node.style.transform = 'none'
            const icon = node.querySelector<HTMLElement>(
                '[data-toast-close-icon]',
            )
            if (icon) icon.style.transform = 'none'
        }
        return () => {
            scaleAnimation.current?.cancel()
            iconAnimation.current?.cancel()
        }
    }, [animated])

    return {
        refs: { button },
        handler: {
            handlePointerEnter,
            handlePointerLeave,
            handlePointerDown: () => animateScale(0.85),
            handlePointerUp: () => animateScale(hovered.current ? 1.15 : 1),
            handlePointerCancel: handlePointerLeave,
        },
    }
}
