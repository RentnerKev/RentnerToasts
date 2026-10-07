import { useToastSnapshot } from './useToastSnapshot.js'
import { resolveToastMessages } from '../../../lib/Messages/toastMessages.js'
import { toastPositionClasses } from '../../../config/toast-position.config.js'
import type { ToastProps } from '../Types/toast-ui.types.js'
import type { ToastSurfaceLogicResult } from '../Types/toast-logic.types.js'

export function useToastSurfaceLogic({
    position,
    locale = 'de',
    messages,
}: ToastProps): ToastSurfaceLogicResult {
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
