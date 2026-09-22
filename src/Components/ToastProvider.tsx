import { useToastLogic } from '../Hooks/useToastLogic.js'
import type { ToastProviderProps } from '../types.js'
import { Toast } from './Toast.js'

export function ToastProvider({
    children,
    customDesign,
    position = 'bottom-right',
    className,
    locale = 'de',
    messages,
}: ToastProviderProps) {
    const { state } = useToastLogic()

    return (
        <>
            {children}
            {state.toasts.length > 0 && (
                <Toast
                    customDesign={customDesign}
                    position={position}
                    className={className}
                    locale={locale}
                    messages={messages}
                />
            )}
        </>
    )
}
