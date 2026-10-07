import type { ToastProviderProps } from '../Types/toast-ui.types.js'
import { Toast } from './Toast.js'
import { ToastProviderBase } from './ToastProviderBase.js'

export function ToastProvider(props: ToastProviderProps) {
    return <ToastProviderBase {...props} ToastUI={Toast} />
}
