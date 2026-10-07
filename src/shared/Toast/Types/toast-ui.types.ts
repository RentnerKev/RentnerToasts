import type { FocusEvent, ReactNode, MouseEvent } from 'react'
import type {
    getToastExitAnimation,
    getToastInitialAnimation,
    toastAnimate,
    toastDragAnimation,
    toastTransition,
} from '../Animations/toastAnimations.js'
import type { MotionProps } from 'motion/react'
import type {
    ToastLocale,
    ToastMessages,
} from '../../../lib/Messages/Types/messages.types.js'

import type {
    Toast,
    ToastStore,
    ToastPosition,
} from '../../../lib/ToastStore/Types/toast.types.js'
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
    store?: ToastStore
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
