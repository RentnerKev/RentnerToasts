import { useToastProviderLogic } from '../Hooks/useToastProviderLogic.js'
import { ToastStoreContext } from '../Context/ToastStoreContext.js'
import { ToastInteractionHandoff } from '../Context/ToastInteractionHandoff.js'
import type { ToastProviderBaseProps } from '../Types/toast-logic.types.js'

export function ToastProviderBase({
    ToastUI,
    children,
    ...props
}: ToastProviderBaseProps) {
    const { state } = useToastProviderLogic({ ...props, children })

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
