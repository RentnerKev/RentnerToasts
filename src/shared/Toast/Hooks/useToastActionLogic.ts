import { useCallback, useLayoutEffect, useRef, type PointerEvent } from 'react'
import {
    createSpringFrames,
    getCloseIconFrames,
    CLOSE_ICON_SPRING_DURATION,
} from '../Animations/nativeToastAnimation.ts'

export function useToastActionLogic(animated: boolean) {
    const button = useRef<HTMLButtonElement | null>(null)
    const iconRef = useRef<HTMLElement | null>(null)
    const scaleAnimation = useRef<Animation | null>(null)
    const iconAnimation = useRef<Animation | null>(null)
    const hovered = useRef(false)

    const getIcon = useCallback(
        (node: HTMLButtonElement): HTMLElement | null => {
            const cached = iconRef.current
            if (cached && cached.isConnected && node.contains(cached))
                return cached
            const found = node.querySelector<HTMLElement>(
                '[data-toast-close-icon]',
            )
            iconRef.current = found
            return found
        },
        [],
    )

    const animateScale = useCallback(
        (scale: number) => {
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
                    550,
                    30,
                    (value) => `scale(${value})`,
                ),
                { duration: 800, easing: 'linear' },
            )
        },
        [animated],
    )

    const animateHoverState = useCallback(
        (scale: number, angle: number) => {
            const node = button.current
            if (!node || !animated) return
            const icon = getIcon(node)
            // Read both computed transforms before writing either inline style.
            const currentScale = new DOMMatrix(getComputedStyle(node).transform)
                .a
            let currentAngle = 0
            if (icon) {
                const matrix = new DOMMatrix(getComputedStyle(icon).transform)
                currentAngle = (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI
            }

            scaleAnimation.current?.cancel()
            node.style.transform = `scale(${scale})`
            if (typeof node.animate === 'function') {
                scaleAnimation.current = node.animate(
                    createSpringFrames(
                        currentScale,
                        scale,
                        550,
                        30,
                        (value) => `scale(${value})`,
                    ),
                    { duration: 800, easing: 'linear' },
                )
            }

            if (icon) {
                iconAnimation.current?.cancel()
                icon.style.transform = `rotate(${angle}deg)`
                if (typeof icon.animate === 'function') {
                    iconAnimation.current = icon.animate(
                        getCloseIconFrames(currentAngle, angle),
                        {
                            duration: CLOSE_ICON_SPRING_DURATION,
                            easing: 'linear',
                        },
                    )
                }
            }
        },
        [animated, getIcon],
    )

    const handlePointerEnter = useCallback(
        (event: PointerEvent<HTMLButtonElement>) => {
            if (event.pointerType === 'touch') return
            hovered.current = true
            animateHoverState(1.15, 90)
        },
        [animateHoverState],
    )

    const handlePointerLeave = useCallback(() => {
        hovered.current = false
        animateHoverState(1, 0)
    }, [animateHoverState])

    const handlePointerDown = useCallback(
        () => animateScale(0.85),
        [animateScale],
    )

    const handlePointerUp = useCallback(
        () => animateScale(hovered.current ? 1.15 : 1),
        [animateScale],
    )

    useLayoutEffect(() => {
        const node = button.current
        if (!animated && node) {
            node.style.transform = 'none'
            const icon = getIcon(node)
            if (icon) icon.style.transform = 'none'
        }
        return () => {
            scaleAnimation.current?.cancel()
            iconAnimation.current?.cancel()
        }
    }, [animated, getIcon])

    return {
        refs: { button },
        handler: {
            handlePointerEnter,
            handlePointerLeave,
            handlePointerDown,
            handlePointerUp,
            handlePointerCancel: handlePointerLeave,
        },
    }
}
