import type { ToastProviderProps } from '../Types/toast-ui.types.ts'
import { Toast } from './Toast.tsx'
import { useToastProviderLogic } from '../Hooks/useToastProviderLogic.ts'
import { ToastStoreContext } from '../Context/ToastStoreContext.ts'

export function ToastProvider({ children, ...props }: ToastProviderProps) {
    const { state } = useToastProviderLogic(props)

    return (
        <ToastStoreContext.Provider value={state.storeContext}>
            {children}
            {state.hasToasts && <Toast {...state.surfaceProps} />}
        </ToastStoreContext.Provider>
    )
}

// Preserve the public entry without replacing the first notification's surface.
export const LazyToastProvider = ToastProvider
export { useToast } from '../Hooks/useToastStore.ts'
export type { ToastProviderProps } from '../Types/toast-ui.types.ts'
