import { hasTailwindUtility } from '../../../lib/ToastText/tailwindUtility.ts'
import { parseToastText } from '../../../lib/ToastText/toastText.ts'
import { useToastInteraction } from './useToastInteraction.ts'
import { useCallback, useMemo, type MouseEvent, type Ref } from 'react'
import type { CustomToastProps } from '../Types/toast-ui.types.ts'
import type { CustomToastLogicResult } from '../Types/toast-logic.types.ts'
import {
    getToastExitAnimation,
    getToastInitialAnimation,
    toastAnimate,
    toastDragAnimation,
    toastTransition,
} from '../Animations/toastAnimations.ts'
import { useCopyToastMessage } from './useCopyToastMessage.ts'
import { getRemainingToastTime } from '../../../lib/ToastTiming/toastTiming.ts'
import { useToastReducedMotion } from './useToastReducedMotion.ts'
import { useToastMotion } from './useToastMotion.ts'
import { useToastSwipe } from './useToastSwipe.ts'
import { useToastProgress } from './useToastProgress.ts'
import type { ToastDragEndHandler } from '../Types/toast-animation.types.ts'

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
    onExitComplete?: () => void,
): CustomToastLogicResult {
    const { refs, handler: interactionHandler } = useToastInteraction({
        id: toast.id,
        forwardedRef,
    })
    const { state: copyState, handler: copyHandler } =
        useCopyToastMessage(toast)
    const prefersReducedMotion = useToastReducedMotion()
    const motion = useToastMotion({
        position,
        present,
        reducedMotion: prefersReducedMotion,
        onExitComplete,
    })
    const { setWrapperRef: setInteractionRef } = refs
    const { setNode, stopMotion } = motion.handler
    const {
        refs: { setNode: setSwipeNode },
        handler: swipeHandler,
    } = useToastSwipe({
        enabled: present && !prefersReducedMotion,
        onDismiss: () => onRemove(toast.id),
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

    const remainingTime = getRemainingToastTime(toast)
    const startingScale =
        toast.duration === 0 ? 0 : remainingTime / toast.duration
    const progressDuration = remainingTime / 1000

    const initialAnimation = useMemo(
        () => getToastInitialAnimation(position),
        [position],
    )

    const exitAnimation = useMemo(
        () => getToastExitAnimation(position),
        [position],
    )

    const handleDragEnd: ToastDragEndHandler = (_e, info) => {
        if (Math.abs(info.offset.x) > 80 || Math.abs(info.velocity.x) > 400) {
            onRemove(toast.id)
        }
    }

    function getWrapperClasses() {
        let baseClasses =
            'relative min-w-0 max-w-full overflow-hidden pointer-events-auto'
        if (!prefersReducedMotion) baseClasses += ' cursor-grab'
        if (classNames?.root !== undefined)
            return [baseClasses, classNames.root, className]
                .filter(Boolean)
                .join(' ')
        baseClasses += ' flex items-start gap-3 border backdrop-blur-xl'
        if (!hasTailwindUtility(className, 'w')) baseClasses += ' w-80'
        if (!hasTailwindUtility(className, 'rounded'))
            baseClasses += ' rounded-rentner-control'
        if (!hasTailwindUtility(className, 'p')) {
            if (!hasTailwindUtility(className, 'px')) baseClasses += ' px-4'
            if (!hasTailwindUtility(className, 'py')) baseClasses += ' py-4'
        }
        if (!hasTailwindUtility(className, 'shadow'))
            baseClasses += ' shadow-2xl'
        const statusClasses = {
            success:
                'bg-[var(--rentner-surface,#022c22)]/95 border-[var(--rentner-border,#10b981)]/30 text-[color:var(--rentner-foreground,#ecfdf5)]',
            error: 'bg-[var(--rentner-surface,#4c0519)]/95 border-[var(--rentner-border,#f43f5e)]/30 text-[color:var(--rentner-foreground,#fff1f2)]',
            info: 'bg-[var(--rentner-surface,#172554)]/95 border-[var(--rentner-border,#3b82f6)]/30 text-[color:var(--rentner-foreground,#eff6ff)]',
            warning:
                'bg-[var(--rentner-surface,#451a03)]/95 border-[var(--rentner-border,#f59e0b)]/30 text-[color:var(--rentner-foreground,#fffbeb)]',
        }
        return [
            baseClasses,
            className,
            customDesign?.[`${toast.type}Wrapper`] ??
                customDesign?.wrapper ??
                statusClasses[toast.type],
        ]
            .filter(Boolean)
            .join(' ')
    }

    function getProgressClasses() {
        if (classNames?.progress !== undefined) return classNames.progress
        const color =
            customDesign?.[`${toast.type}Progress`] ??
            {
                success: 'bg-rentner-success',
                error: 'bg-rentner-danger',
                info: 'bg-rentner-info',
                warning: 'bg-rentner-warning',
            }[toast.type]
        return `h-1 ${color}`
    }

    function handleCopyError(event: MouseEvent<HTMLButtonElement>) {
        event.stopPropagation()
        void copyHandler.copyToastMessage()
    }

    const linkClassName =
        classNames?.link ??
        customDesign?.linkText ??
        'font-bold underline decoration-2 underline-offset-2 hover:opacity-80 motion-safe:transition-opacity cursor-pointer inline-block pointer-events-auto'

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
            copied: copyState.copied,
            wrapperClasses: getWrapperClasses(),
            progressClasses: getProgressClasses(),
            linkClassName,
            parsedTitle,
            parsedContent,
            startingScale,
            progressDuration,
            isTimerRunning: toast.timerStartedAt !== undefined,
            initialAnimation,
            animate: toastAnimate,
            exitAnimation,
            transition: toastTransition,
            dragAnimation: toastDragAnimation,
            dragEnabled: !prefersReducedMotion,
        },
        handler: {
            ...swipeHandler,
            handleCopyError,
            handleDragEnd,
            handleMouseEnter: interactionHandler.handleMouseEnter,
            handleMouseLeave: interactionHandler.handleMouseLeave,
            handleFocus: interactionHandler.handleFocus,
            handleBlur: interactionHandler.handleBlur,
        },
    }
}
