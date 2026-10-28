import { useId, useMemo } from 'react'
import { useToastSnapshot } from './useToastSnapshot.ts'
import { useToastPresentation } from './useToastPresentation.ts'
import { resolveToastMessages } from '../../../lib/Messages/toastMessages.ts'
import { toastPositionClasses } from '../../../config/toast-position.config.ts'
import type {
    ToastSurfaceProps,
    ToastSurfaceResult,
} from '../Types/toast-logic.types.ts'

export function useToastSurface({
    position,
    locale = 'de',
    messages,
    customDesign,
    classNames,
}: ToastSurfaceProps): ToastSurfaceResult {
    const regionId = useId()
    const { state, handler } = useToastSnapshot()
    // Resolve on every surface render: callers may mutate an existing messages
    // object. The spread in the resolver retains its own/enumerable semantics.
    const resolvedMessages = resolveToastMessages(locale, messages)
    const stableMessages = useMemo(
        () => ({
            regionLabel: resolvedMessages.regionLabel,
            closeNotification: resolvedMessages.closeNotification,
            copyError: resolvedMessages.copyError,
            errorCopied: resolvedMessages.errorCopied,
        }),
        [
            resolvedMessages.regionLabel,
            resolvedMessages.closeNotification,
            resolvedMessages.copyError,
            resolvedMessages.errorCopied,
        ],
    )
    const presentation = useToastPresentation(customDesign, classNames)
    return {
        state: {
            regionId,
            visibleToasts: state.visibleToasts,
            messages: stableMessages,
            presentation,
            positionClasses:
                toastPositionClasses[position] ??
                toastPositionClasses['bottom-right'],
            anchorX: position.includes('right') ? 'right' : 'left',
            anchorY: position.includes('bottom') ? 'bottom' : 'top',
        },
        handler: { handleRemoveToast: handler.handleRemoveToast },
    }
}
