import type { ButtonHTMLAttributes } from 'react'
import type {
    Toast,
    ToastPosition,
} from '../../../lib/ToastStore/Types/toast.types.ts'

export interface ToastPresenceItem {
    toast: Toast
    present: boolean
}

export interface ToastActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    animated: boolean
}

export interface ToastMotionProps {
    position: ToastPosition
    present: boolean
    reducedMotion: boolean
    onExitComplete?: () => void
}

export interface ToastSwipeProps {
    enabled: boolean
    onDismiss: () => void
    onStart: () => void
}

export interface ToastLayoutBox {
    left: number
    top: number
    width: number
    height: number
    offsetLeft: number
    offsetTop: number
    parentWidth: number
    parentHeight: number
}

export interface ToastPointerSample {
    x: number
    time: number
}

export interface ToastSwipeSession {
    pointerId: number
    startX: number
    startY: number
    offset: number
    originX: number
    dragging: boolean
    samples: ToastPointerSample[]
}

/** Structural compatibility for the former Motion drag callback type. */
export interface ToastDragInfo {
    point: { x: number; y: number }
    delta: { x: number; y: number }
    offset: { x: number; y: number }
    velocity: { x: number; y: number }
}

export type ToastDragEndHandler = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: ToastDragInfo,
) => void
