import { useId, useMemo } from 'react'
import { useVisibleToastSnapshot } from './useToastSnapshot.ts'
import { resolveToastMessages } from '../../../lib/Messages/toastMessages.ts'
import { toastPositionClasses } from '../../../config/toast-position.config.ts'
import type {
    ToastSurfaceProps,
    ToastSurfaceResult,
} from '../Types/toast-logic.types.ts'
import { useToastPresence } from './useToastPresence.ts'
import { useToastLayout } from './useToastLayout.ts'
import { useToastReducedMotion } from './useToastReducedMotion.ts'

export function useToastSurface({
    position,
    locale = 'de',
    messages,
}: ToastSurfaceProps): ToastSurfaceResult {
    const regionId = useId()
    const { state, handler } = useVisibleToastSnapshot()
    const { state: presence, handler: presenceHandler } = useToastPresence(
        state.visibleToasts,
    )
    const reducedMotion = useToastReducedMotion()
    const region = useToastLayout(presence.items, position, reducedMotion)
    const hasMessages = messages !== undefined
    const regionLabel = messages?.regionLabel
    const closeNotification = messages?.closeNotification
    const copyError = messages?.copyError
    const errorCopied = messages?.errorCopied
    const resolvedMessages = useMemo(() => {
        if (
            !hasMessages ||
            (regionLabel === undefined &&
                closeNotification === undefined &&
                copyError === undefined &&
                errorCopied === undefined)
        ) {
            return resolveToastMessages(locale)
        }
        const overrides: Partial<ToastSurfaceResult['state']['messages']> = {}
        if (regionLabel !== undefined) overrides.regionLabel = regionLabel
        if (closeNotification !== undefined)
            overrides.closeNotification = closeNotification
        if (copyError !== undefined) overrides.copyError = copyError
        if (errorCopied !== undefined) overrides.errorCopied = errorCopied
        return resolveToastMessages(locale, overrides)
    }, [
        locale,
        hasMessages,
        regionLabel,
        closeNotification,
        copyError,
        errorCopied,
    ])

    return {
        refs: { region },
        state: {
            regionId,
            visibleToasts: state.visibleToasts,
            items: presence.items,
            messages: resolvedMessages,
            positionClasses:
                toastPositionClasses[position] ??
                toastPositionClasses['bottom-right'],
            anchorX: position.includes('right') ? 'right' : 'left',
            anchorY: position.includes('bottom') ? 'bottom' : 'top',
            reducedMotion,
        },
        handler: {
            handleRemoveToast: handler.handleRemoveToast,
            handleExitComplete: presenceHandler.handleExitComplete,
        },
    }
}
