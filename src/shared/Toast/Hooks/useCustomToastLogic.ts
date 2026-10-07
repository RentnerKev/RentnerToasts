import { hasTailwindUtility } from '../../../lib/ToastText/tailwindUtility.js'
import { parseToastText } from '../../../lib/ToastText/toastText.js'
import { useToastInteraction } from './useToastInteraction.js'
import { useMemo, type MouseEvent, type Ref } from 'react'
import { useReducedMotion, type MotionProps } from 'motion/react'
import type { CustomToastProps } from '../Types/toast-ui.types.js'
import type { CustomToastLogicResult } from '../Types/toast-logic.types.js'
import {
    getToastExitAnimation,
    getToastInitialAnimation,
    toastAnimate,
    toastDragAnimation,
    toastTransition,
} from '../Animations/toastAnimations.js'
import { useCopyToastMessage } from './useCopyToastMessage.js'
import { getRemainingToastTime } from '../../../lib/ToastTiming/toastTiming.js'

export function useCustomToastLogic(
    { toast, position, onRemove, customDesign, className }: CustomToastProps,
    forwardedRef?: Ref<HTMLDivElement>,
): CustomToastLogicResult {
    const { refs, handler: interactionHandler } = useToastInteraction({
        id: toast.id,
        forwardedRef,
    })
    const { state: copyState, handler: copyHandler } =
        useCopyToastMessage(toast)
    const prefersReducedMotion = useReducedMotion() === true

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

    const handleDragEnd: NonNullable<MotionProps['onDragEnd']> = (_e, info) => {
        if (Math.abs(info.offset.x) > 80 || Math.abs(info.velocity.x) > 400) {
            onRemove(toast.id)
        }
    }

    function getWrapperClasses() {
        let baseClasses =
            'relative min-w-0 max-w-full overflow-hidden pointer-events-auto flex items-start gap-3 border backdrop-blur-xl'

        if (!prefersReducedMotion) baseClasses += ' cursor-grab'

        if (!hasTailwindUtility(className, 'w')) baseClasses += ' w-80'
        if (!hasTailwindUtility(className, 'rounded')) {
            baseClasses += ' rounded-xl'
        }

        if (!hasTailwindUtility(className, 'p')) {
            if (!hasTailwindUtility(className, 'px')) baseClasses += ' px-4'
            if (!hasTailwindUtility(className, 'py')) baseClasses += ' py-4'
        }

        if (!hasTailwindUtility(className, 'shadow')) {
            baseClasses += ' shadow-2xl'
        }

        if (className) {
            baseClasses += ` ${className}`
        }

        if (toast.type === 'success') {
            return `${baseClasses} ${
                customDesign?.successWrapper ||
                'bg-emerald-950/95 border-emerald-500/30 text-emerald-50'
            }`
        }

        if (toast.type === 'error') {
            return `${baseClasses} ${
                customDesign?.errorWrapper ||
                'bg-rose-950/95 border-rose-500/30 text-rose-50'
            }`
        }

        if (toast.type === 'info') {
            return `${baseClasses} ${
                customDesign?.infoWrapper ||
                'bg-blue-950/95 border-blue-500/30 text-blue-50'
            }`
        }

        if (toast.type === 'warning') {
            return `${baseClasses} ${
                customDesign?.warningWrapper ||
                'bg-amber-950/95 border-amber-500/30 text-amber-50'
            }`
        }

        return baseClasses
    }

    function getProgressClasses() {
        if (toast.type === 'success') {
            return customDesign?.successProgress || 'bg-emerald-500'
        }

        if (toast.type === 'error') {
            return customDesign?.errorProgress || 'bg-rose-500'
        }

        if (toast.type === 'info') {
            return customDesign?.infoProgress || 'bg-blue-500'
        }

        if (toast.type === 'warning') {
            return customDesign?.warningProgress || 'bg-amber-500'
        }

        return 'bg-white'
    }

    function handleCopyError(event: MouseEvent<HTMLButtonElement>) {
        event.stopPropagation()
        void copyHandler.copyToastMessage()
    }

    const linkClassName =
        customDesign?.linkText ||
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
        refs,
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
            handleCopyError,
            handleDragEnd,
            ...interactionHandler,
        },
    }
}
