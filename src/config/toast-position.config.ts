import type { ToastPosition } from '../lib/ToastStore/Types/toast.types.js'
export const toastPositionClasses: Record<ToastPosition, string> = {
    'top-left': 'top-0 left-0 p-4 flex-col-reverse',
    'top-right': 'top-0 right-0 p-4 flex-col-reverse',
    'bottom-left': 'bottom-0 left-0 p-4 flex-col',
    'bottom-right': 'bottom-0 right-0 p-4 flex-col',
}
