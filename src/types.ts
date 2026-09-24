import type { FocusEvent, ReactNode, MouseEvent } from 'react'
import type {
    getToastExitAnimation,
    getToastInitialAnimation,
    toastAnimate,
    toastDragAnimation,
    toastTransition,
} from './Animations/toastAnimations.js'
import type { MotionProps } from 'motion/react'
import type { ToastLocale, ToastMessages } from './i18n.js'

export type ToastType = 'success' | 'error' | 'info' | 'warning'
export type ToastId = string
export type ToastPosition =
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'

export interface Toast {
    id: ToastId
    content: string
    title?: string
    type: ToastType
    duration: number
    createdAt: number
    remaining: number
    timerStartedAt?: number
}

export interface ToastOptions {
    title?: string
    duration?: number
}

export interface ToastContentOptions extends ToastOptions {
    content: string
}

export interface ToastUpdateOptions {
    content?: string
    title?: string | null
    type?: ToastType
    duration?: number
}

export type ToastPromiseMessage<T> =
    | string
    | ToastContentOptions
    | ((value: T) => string | ToastContentOptions)

export type ToastPromiseLoadingMessage =
    | string
    | Omit<ToastContentOptions, 'duration'>

export interface ToastPromiseOptions<T> {
    loading: ToastPromiseLoadingMessage
    success: ToastPromiseMessage<T>
    error: ToastPromiseMessage<unknown>
    duration?: number
}

export type ToastPromiseInput<T> = PromiseLike<T> | (() => PromiseLike<T>)

export interface ToastApi {
    success: (content: string, options?: ToastOptions) => ToastId
    error: (content: string, options?: ToastOptions) => ToastId
    info: (content: string, options?: ToastOptions) => ToastId
    warning: (content: string, options?: ToastOptions) => ToastId
    dismiss: (id: ToastId) => void
    dismissAll: () => void
    update: (id: ToastId, options: ToastUpdateOptions) => boolean
    promise: <T>(
        input: ToastPromiseInput<T>,
        options: ToastPromiseOptions<T>,
    ) => Promise<T>
}

export interface CustomToastProps {
    toast: Toast
    position: ToastPosition
    onRemove: (id: string) => void
    customDesign?: ToastCustomDesign
    className?: string
    messages: ToastMessages
}

export interface ToastProps {
    customDesign?: ToastCustomDesign
    position: ToastPosition
    className?: string
    locale?: ToastLocale
    messages?: Partial<ToastMessages>
}

export interface ToastProviderProps {
    children: ReactNode
    customDesign?: ToastCustomDesign
    position?: ToastPosition
    className?: string
    locale?: ToastLocale
    messages?: Partial<ToastMessages>
    defaultDuration?: number
    maxVisibleToasts?: number
}

export interface UseCustomToastLogicResult {
    state: {
        copied: boolean
        wrapperClasses: string
        toastIcon: ReactNode
        progressClasses: string
        parsedTitle: ReactNode
        parsedContent: ReactNode
        startingScale: number
        progressDuration: number
        isTimerRunning: boolean
        initialAnimation: ReturnType<typeof getToastInitialAnimation>
        animate: typeof toastAnimate
        exitAnimation: ReturnType<typeof getToastExitAnimation>
        transition: typeof toastTransition
        dragAnimation: typeof toastDragAnimation
        dragEnabled: boolean
    }
    handler: {
        handleCopyError: (e: MouseEvent<HTMLButtonElement>) => void
        handleDragEnd: NonNullable<MotionProps['onDragEnd']>
        handleMouseEnter: () => void
        handleMouseLeave: () => void
        handleFocus: () => void
        handleBlur: (event: FocusEvent<HTMLDivElement>) => void
    }
}

export interface ToastCustomDesign {
    successWrapper?: string
    errorWrapper?: string
    infoWrapper?: string
    warningWrapper?: string

    successIcon?: string
    errorIcon?: string
    infoIcon?: string
    warningIcon?: string

    successProgress?: string
    errorProgress?: string
    infoProgress?: string
    warningProgress?: string

    titleText?: string
    contentText?: string
    closeButton?: string
    copyButton?: string
    linkText?: string
}
