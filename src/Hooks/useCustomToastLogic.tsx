import { useMemo, type MouseEvent, type ReactNode } from 'react'
import { AlertCircle, CheckCircle, Info, TriangleAlert } from 'lucide-react'
import { useReducedMotion, type MotionProps } from 'motion/react'
import type { CustomToastProps, UseCustomToastLogicResult } from '../types.js'
import {
    getToastExitAnimation,
    getToastInitialAnimation,
    toastAnimate,
    toastDragAnimation,
    toastTransition,
} from '../Animations/toastAnimations.js'
import { useCopyToastMessage } from './useCopyToastMessage.js'
import { getRemainingToastTime } from './toastTiming.js'

const MARKDOWN_LINK_REGEX = /\[([^\]]+)]\(([^)]+)\)/g

function isSafeToastLink(url: string) {
    try {
        const parsedUrl = new URL(url, 'https://rentnertoasts.invalid')

        return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
    } catch {
        return false
    }
}

function parseTextWithLinks(
    text: string | undefined,
    linkClassName: string,
): ReactNode[] | null {
    if (!text) return null

    const parts: ReactNode[] = []
    let lastIndex = 0
    let match

    MARKDOWN_LINK_REGEX.lastIndex = 0

    while ((match = MARKDOWN_LINK_REGEX.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index))
        }

        if (!isSafeToastLink(match[2])) {
            parts.push(match[0])
            lastIndex = MARKDOWN_LINK_REGEX.lastIndex
            continue
        }

        parts.push(
            <a
                key={match.index}
                href={match[2]}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClassName}
                onClick={(event) => event.stopPropagation()}
            >
                {match[1]}
            </a>,
        )

        lastIndex = MARKDOWN_LINK_REGEX.lastIndex
    }

    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex))
    }

    return parts
}

export function useCustomToastLogic({
    toast,
    position,
    onRemove,
    customDesign,
    className,
}: CustomToastProps): UseCustomToastLogicResult {
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
            'relative overflow-hidden pointer-events-auto flex items-start gap-3 border backdrop-blur-xl'

        if (!prefersReducedMotion) baseClasses += ' cursor-grab'

        if (!className?.includes('w-')) baseClasses += ' w-80'
        if (!className?.includes('rounded')) baseClasses += ' rounded-xl'

        if (
            !className?.includes('p-') &&
            !className?.includes('px-') &&
            !className?.includes('py-')
        ) {
            baseClasses += ' px-4 py-4'
        }

        if (!className?.includes('shadow')) {
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

    function getIcon() {
        if (toast.type === 'success') {
            return (
                <CheckCircle
                    size={18}
                    aria-hidden="true"
                    className={customDesign?.successIcon || 'text-emerald-400'}
                />
            )
        }

        if (toast.type === 'error') {
            return (
                <AlertCircle
                    size={18}
                    aria-hidden="true"
                    className={customDesign?.errorIcon || 'text-rose-400'}
                />
            )
        }

        if (toast.type === 'info') {
            return (
                <Info
                    size={18}
                    aria-hidden="true"
                    className={customDesign?.infoIcon || 'text-blue-400'}
                />
            )
        }

        if (toast.type === 'warning') {
            return (
                <TriangleAlert
                    size={18}
                    aria-hidden="true"
                    className={customDesign?.warningIcon || 'text-amber-400'}
                />
            )
        }

        return null
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
        () => parseTextWithLinks(toast.title, linkClassName),
        [toast.title, linkClassName],
    )

    const parsedContent = useMemo(
        () => parseTextWithLinks(toast.content, linkClassName),
        [toast.content, linkClassName],
    )

    return {
        state: {
            copied: copyState.copied,
            wrapperClasses: getWrapperClasses(),
            toastIcon: getIcon(),
            progressClasses: getProgressClasses(),
            parsedTitle,
            parsedContent,
            startingScale,
            progressDuration,
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
        },
    }
}
