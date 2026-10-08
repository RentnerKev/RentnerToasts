import { useToastProviderLogic } from '../Hooks/useToastProviderLogic.ts'
import { ToastStoreContext } from '../Context/ToastStoreContext.ts'
import { ToastInteractionHandoff } from '../Context/ToastInteractionHandoff.ts'
import type { ToastProviderBaseProps } from '../Types/toast-logic.types.ts'

export function ToastProviderBase({
    ToastUI,
    children,
    ...props
}: ToastProviderBaseProps) {
    const { state } = useToastProviderLogic(props)

    return (
        <ToastStoreContext.Provider value={state.storeContext}>
            {children}
            {state.hasToasts && (
                <ToastInteractionHandoff.Provider
                    value={state.interactionEntries}
                >
                    <ToastUI {...state.surfaceProps} />
                </ToastInteractionHandoff.Provider>
            )}
        </ToastStoreContext.Provider>
    )
}
