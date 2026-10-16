import type { FocusEvent, ReactNode, MouseEvent } from 'react'
import type {
    getToastExitAnimation,
    getToastInitialAnimation,
    toastAnimate,
    toastDragAnimation,
    toastTransition,
} from '../Animations/toastAnimations.ts'
import type { MotionProps } from 'motion/react'
import type {
    ToastLocale,
    ToastMessages,
} from '../../../lib/Messages/Types/messages.types.ts'

import type {
    Toast,
    ToastStore,
    ToastPosition,
} from '../../../lib/ToastStore/Types/toast.types.ts'
export interface ToastClassNames {
    region?: string
    root?: string
    icon?: string
    body?: string
    title?: string
    content?: string
    actions?: string
    closeButton?: string
    closeIcon?: string
    copyButton?: string
    copyIcon?: string
    buttonOverlay?: string
    progress?: string
    link?: string
}

export interface ToastPortalOptions {
    /** Undefined/null preserves the inline surface; an explicit container creates a portal. */
    portalContainer?: Element | DocumentFragment | null
    portalClassName?: string
    portalZIndex?: number
}

export interface CustomToastProps {
    toast: Toast
    position: ToastPosition
    onRemove: (id: string) => void
    customDesign?: ToastCustomDesign
    classNames?: ToastClassNames
    className?: string
    messages: ToastMessages
}

export interface ToastProps extends ToastPortalOptions {
    customDesign?: ToastCustomDesign
    classNames?: ToastClassNames
    position: ToastPosition
    className?: string
    locale?: ToastLocale
    messages?: Partial<ToastMessages>
}

export interface ToastProviderProps extends ToastPortalOptions {
    children: ReactNode
    store?: ToastStore
    customDesign?: ToastCustomDesign
    classNames?: ToastClassNames
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
    /** Shared status appearance; a specific status wrapper takes precedence. */
    wrapper?: string
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
    /** Legacy icon classes. Prefer classNames.closeIcon for new integrations. */
    closeButton?: string
    /** Legacy icon classes. Prefer classNames.copyIcon for new integrations. */
    copyButton?: string
    linkText?: string
}
