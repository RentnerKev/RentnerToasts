import {
    DEFAULT_UTILITY_P,
    DEFAULT_UTILITY_PX,
    DEFAULT_UTILITY_PY,
    DEFAULT_UTILITY_ROUNDED,
    DEFAULT_UTILITY_SHADOW,
    DEFAULT_UTILITY_W,
    getPresentDefaultUtilities,
} from '../../../lib/ToastText/tailwindUtility.ts'
import { parseToastText } from '../../../lib/ToastText/toastText.ts'
import { useToastInteraction } from './useToastInteraction.ts'
import { useCallback, useMemo, type MouseEvent, type Ref } from 'react'
import type { CustomToastProps } from '../Types/toast-ui.types.ts'
import type { CustomToastLogicResult } from '../Types/toast-logic.types.ts'
import { useCopyToastMessage } from './useCopyToastMessage.ts'
import { useToastMotion } from './useToastMotion.ts'
import { useToastSwipe } from './useToastSwipe.ts'
import { useToastCallback } from './useToastCallback.ts'
import { useToastProgress } from './useToastProgress.ts'

const STATUS_WRAPPER_CLASSES = {
    success:
        'bg-[var(--rentner-surface,#022c22)]/95 border-[var(--rentner-border,#10b981)]/30 text-[color:var(--rentner-foreground,#ecfdf5)]',
    error: 'bg-[var(--rentner-surface,#4c0519)]/95 border-[var(--rentner-border,#f43f5e)]/30 text-[color:var(--rentner-foreground,#fff1f2)]',
    info: 'bg-[var(--rentner-surface,#172554)]/95 border-[var(--rentner-border,#3b82f6)]/30 text-[color:var(--rentner-foreground,#eff6ff)]',
    warning:
        'bg-[var(--rentner-surface,#451a03)]/95 border-[var(--rentner-border,#f59e0b)]/30 text-[color:var(--rentner-foreground,#fffbeb)]',
} as const

const STATUS_PROGRESS_CLASSES = {
    success: 'h-1 bg-rentner-success',
    error: 'h-1 bg-rentner-danger',
    info: 'h-1 bg-rentner-info',
    warning: 'h-1 bg-rentner-warning',
} as const

const DEFAULT_LINK_CLASS =
    'font-bold underline decoration-2 underline-offset-2 hover:opacity-80 motion-safe:transition-opacity cursor-pointer inline-block pointer-events-auto'

export function useCustomToastLogic(
    {
        toast,
        position,
        onRemove,
        customDesign,
        classNames,
        className,
    }: CustomToastProps,
    forwardedRef?: Ref<HTMLDivElement>,
    present = true,
    onExitComplete?: (id: string) => void,
    prefersReducedMotion = false,
): CustomToastLogicResult {
    const { refs, handler: interactionHandler } = useToastInteraction({
        id: toast.id,
        forwardedRef,
    })
    const { state: copyState, handler: copyHandler } =
        useCopyToastMessage(toast)
    const action = useToastCallback(toast, present, onRemove)
    const motion = useToastMotion({
        toastId: toast.id,
        position,
        present,
        reducedMotion: prefersReducedMotion,
        onExitComplete,
    })
    const { setWrapperRef: setInteractionRef } = refs
    const { setNode, stopMotion } = motion.handler
    const handleDismiss = useCallback(
        () => onRemove(toast.id),
        [onRemove, toast.id],
    )
    const {
        refs: { setNode: setSwipeNode },
        handler: swipeHandler,
    } = useToastSwipe({
        enabled: present && !prefersReducedMotion,
        onDismiss: handleDismiss,
        onStart: stopMotion,
    })
    const setWrapperRef = useCallback(
        (node: HTMLDivElement | null) => {
            setNode(node)
            setSwipeNode(node)
            setInteractionRef(node)
        },
        [setInteractionRef, setNode, setSwipeNode],
    )
    const progress = useToastProgress(toast, prefersReducedMotion)

    const rootClassName = classNames?.root
    const statusWrapperClass = customDesign?.[`${toast.type}Wrapper`]
    const sharedWrapperClass = customDesign?.wrapper
    const wrapperClasses = useMemo(() => {
        let baseClasses = prefersReducedMotion
            ? 'relative min-w-0 max-w-full overflow-hidden pointer-events-auto'
            : 'relative min-w-0 max-w-full overflow-hidden pointer-events-auto cursor-grab'
        if (rootClassName !== undefined) {
            if (rootClassName) baseClasses += ` ${rootClassName}`
            if (className) baseClasses += ` ${className}`
            return baseClasses
        }
        baseClasses += ' flex items-start gap-3 border backdrop-blur-xl'
        const presentMask = getPresentDefaultUtilities(className)
        if ((presentMask & DEFAULT_UTILITY_W) === 0) baseClasses += ' w-80'
        if ((presentMask & DEFAULT_UTILITY_ROUNDED) === 0)
            baseClasses += ' rounded-rentner-control'
        if ((presentMask & DEFAULT_UTILITY_P) === 0) {
            if ((presentMask & DEFAULT_UTILITY_PX) === 0) baseClasses += ' px-4'
            if ((presentMask & DEFAULT_UTILITY_PY) === 0) baseClasses += ' py-4'
        }
        if ((presentMask & DEFAULT_UTILITY_SHADOW) === 0)
            baseClasses += ' shadow-2xl'
        if (className) baseClasses += ` ${className}`
        const appearance =
            statusWrapperClass ??
            sharedWrapperClass ??
            STATUS_WRAPPER_CLASSES[toast.type]
        if (appearance) baseClasses += ` ${appearance}`
        return baseClasses
    }, [
        className,
        prefersReducedMotion,
        rootClassName,
        sharedWrapperClass,
        statusWrapperClass,
        toast.type,
    ])

    const progressSlotClass = classNames?.progress
    const statusProgressClass = customDesign?.[`${toast.type}Progress`]
    const progressClasses = useMemo(() => {
        if (progressSlotClass !== undefined) return progressSlotClass
        if (statusProgressClass !== undefined)
            return `h-1 ${statusProgressClass}`
        return STATUS_PROGRESS_CLASSES[toast.type]
    }, [progressSlotClass, statusProgressClass, toast.type])

    const copyToastMessage = copyHandler.copyToastMessage
    const handleCopyError = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation()
            void copyToastMessage()
        },
        [copyToastMessage],
    )

    const linkClassName =
        classNames?.link ?? customDesign?.linkText ?? DEFAULT_LINK_CLASS

    const parsedTitle = useMemo(
        () => parseToastText(toast.title),
        [toast.title],
    )

    const parsedContent = useMemo(
        () => parseToastText(toast.content),
        [toast.content],
    )

    return {
        refs: { setWrapperRef, progress },
        state: {
            actionPending: action.state.actionPending,
            copied: copyState.copied,
            wrapperClasses,
            progressClasses,
            linkClassName,
            parsedTitle,
            parsedContent,
            dragEnabled: !prefersReducedMotion,
        },
        handler: {
            ...swipeHandler,
            handleAction: action.handler.handleAction,
            handleCopyError,
            handleMouseEnter: interactionHandler.handleMouseEnter,
            handleMouseLeave: interactionHandler.handleMouseLeave,
            handleFocus: interactionHandler.handleFocus,
            handleBlur: interactionHandler.handleBlur,
        },
    }
}
