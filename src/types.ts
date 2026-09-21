import type { ReactNode, MouseEvent } from 'react'
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
export type ToastPosition =
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'

export interface Toast {
    id: string
    content: string
    title?: string
    type: ToastType
    duration: number
    createdAt: number
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
}

export interface UseCustomToastLogicResult {
    state: {
        copied: boolean
        wrapperClasses: string
        toastIcon: ReactNode
        progressClasses: string
        parsedTitle: ReactNode
        parsedContent: ReactNode
        startingWidth: string
        progressDuration: number
        initialAnimation: ReturnType<typeof getToastInitialAnimation>
        animate: typeof toastAnimate
        exitAnimation: ReturnType<typeof getToastExitAnimation>
        transition: typeof toastTransition
        dragAnimation: typeof toastDragAnimation
    }
    handler: {
        handleCopyError: (e: MouseEvent<HTMLButtonElement>) => void
        handleDragEnd: NonNullable<MotionProps['onDragEnd']>
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
