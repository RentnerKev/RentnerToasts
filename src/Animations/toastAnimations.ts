import type { MotionProps } from 'motion/react'
import type { ToastPosition } from '../types.js'

function getToastCornerOffset(position: ToastPosition) {
    return {
        x: position.includes('right') ? 100 : -100,
        y: position.includes('top') ? -80 : 80,
    }
}

export function getToastInitialAnimation(position: ToastPosition) {
    const { x, y } = getToastCornerOffset(position)

    return { opacity: 0, x, y, scale: 0.9 } satisfies MotionProps['initial']
}

export function getToastExitAnimation(position: ToastPosition) {
    const { x, y } = getToastCornerOffset(position)

    return {
        opacity: 0,
        x,
        y,
        scale: 0.9,
        transition: { duration: 0.3, ease: 'easeOut' },
    } satisfies MotionProps['exit']
}

export const toastAnimate = {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
} satisfies MotionProps['animate']

export const toastTransition = {
    layout: { type: 'tween', duration: 0.22, ease: 'easeOut' },
    x: { type: 'spring', stiffness: 200, damping: 24 },
    y: { type: 'spring', stiffness: 200, damping: 24 },
    scale: { type: 'spring', stiffness: 200, damping: 24 },
    opacity: { duration: 0.2 },
} satisfies MotionProps['transition']

export const toastDragAnimation = {
    scale: 1.02,
    cursor: 'grabbing',
} satisfies MotionProps['whileDrag']

export const closeButtonIconTransition = {
    type: 'spring',
    stiffness: 300,
    damping: 20,
} satisfies MotionProps['transition']

export const closeButtonIconVariants = {
    idle: { rotate: 0 },
    hover: { rotate: 90 },
} satisfies MotionProps['variants']
