import { useEffect, useLayoutEffect } from 'react'
import { useToastLogic } from '../Hooks/useToastLogic.js'
import { configureToastDefaults, restoreToastDefaults } from '../toastStore.js'
import type { ToastProviderProps } from '../types.js'
import { Toast } from './Toast.js'

const useIsomorphicLayoutEffect =
    typeof window === 'undefined' ? useEffect : useLayoutEffect

export function ToastProvider({
    children,
    customDesign,
    position = 'bottom-right',
    className,
    locale = 'de',
    messages,
    defaultDuration,
    maxVisibleToasts,
}: ToastProviderProps) {
    useIsomorphicLayoutEffect(() => {
        const previousDefaults = configureToastDefaults({
            duration: defaultDuration,
            maxVisibleToasts,
        })

        return () => restoreToastDefaults(previousDefaults)
    }, [defaultDuration, maxVisibleToasts])

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
