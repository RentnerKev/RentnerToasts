import { lazy, Suspense } from 'react'
import { useToastLogic } from '../Hooks/useToastLogic.js'
import type { ToastProviderProps } from '../types.js'

const LazyToast = lazy(async () => {
    const { Toast } = await import('./Toast.js')

    return { default: Toast }
})

export function ToastProvider({
    children,
    customDesign,
    position = 'bottom-right',
    className,
}: ToastProviderProps) {
    const { state } = useToastLogic()

    return (
        <>
            {children}
            {state.toasts.length > 0 && (
                <Suspense fallback={null}>
                    <LazyToast
                        customDesign={customDesign}
                        position={position}
                        className={className}
                    />
                </Suspense>
            )}
        </>
    )
}
