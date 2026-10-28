import { useId } from 'react'
import { useToastSnapshot } from './useToastSnapshot.ts'
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
    const { state, handler } = useToastSnapshot()
    const { state: presence, handler: presenceHandler } = useToastPresence(
        state.visibleToasts,
    )
    const reducedMotion = useToastReducedMotion()
    const region = useToastLayout(presence.items, position, reducedMotion)
    return {
        refs: { region },
        state: {
            regionId,
            visibleToasts: state.visibleToasts,
            items: presence.items,
            messages: resolveToastMessages(locale, messages),
            positionClasses:
                toastPositionClasses[position] ??
                toastPositionClasses['bottom-right'],
            anchorX: position.includes('right') ? 'right' : 'left',
            anchorY: position.includes('bottom') ? 'bottom' : 'top',
        },
        handler: {
            handleRemoveToast: handler.handleRemoveToast,
            handleExitComplete: presenceHandler.handleExitComplete,
        },
    }
}
