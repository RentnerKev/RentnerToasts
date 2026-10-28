import type { ToastPosition } from '../../../lib/ToastStore/Types/toast.types.ts'

function getToastCornerOffset(position: ToastPosition) {
    return {
        x: position.includes('right') ? 100 : -100,
        y: position.includes('top') ? -80 : 80,
    }
}

export function getToastInitialAnimation(position: ToastPosition) {
    const { x, y } = getToastCornerOffset(position)

    return { opacity: 0, x, y, scale: 0.9 }
}

export function getToastExitAnimation(position: ToastPosition) {
    const { x, y } = getToastCornerOffset(position)

    return {
        opacity: 0,
        x,
        y,
        scale: 0.9,
        transition: { duration: 0.3, ease: 'easeOut' as const },
    }
}

export const toastAnimate = {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
}

export const toastTransition = {
    layout: {
        type: 'tween' as const,
        duration: 0.22,
        ease: 'easeOut' as const,
    },
    x: { type: 'spring' as const, stiffness: 200, damping: 24 },
    y: { type: 'spring' as const, stiffness: 200, damping: 24 },
    scale: { type: 'spring' as const, stiffness: 200, damping: 24 },
    opacity: { duration: 0.2 },
}

export const toastDragAnimation = {
    scale: 1.02,
    cursor: 'grabbing',
}

export const closeButtonIconTransition = {
    type: 'spring' as const,
    stiffness: 300,
    damping: 20,
}

export const closeButtonIconVariants = {
    idle: { rotate: 0 },
    hover: { rotate: 90 },
}
