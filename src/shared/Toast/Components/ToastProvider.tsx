import type { ToastProviderProps } from '../Types/toast-ui.types.ts'
import { Toast } from './Toast.tsx'
import { ToastProviderBase } from './ToastProviderBase.tsx'

export function ToastProvider(props: ToastProviderProps) {
    return <ToastProviderBase {...props} ToastUI={Toast} />
}
