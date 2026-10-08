import { useToastSnapshot } from './useToastSnapshot.ts'
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
}: ToastSurfaceProps): ToastSurfaceResult {
    const { state, handler } = useToastSnapshot()
    return {
        state: {
            visibleToasts: state.visibleToasts,
            messages: resolveToastMessages(locale, messages),
            positionClasses:
                toastPositionClasses[position] ??
                toastPositionClasses['bottom-right'],
            anchorX: position.includes('right') ? 'right' : 'left',
            anchorY: position.includes('bottom') ? 'bottom' : 'top',
        },
        handler: { handleRemoveToast: handler.handleRemoveToast },
    }
}
