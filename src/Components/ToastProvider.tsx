import { useEffect, useLayoutEffect, useMemo } from 'react'
import { useToastLogic } from '../Hooks/useToastLogic.js'
import { defaultToastStore } from '../toast.js'
import { ToastStoreContext } from '../ToastStoreContext.js'
import type { ToastProviderProps } from '../types.js'
import { Toast } from './Toast.js'

const useIsomorphicLayoutEffect =
    typeof window === 'undefined' ? useEffect : useLayoutEffect

export function ToastProvider({
    children,
    store = defaultToastStore,
    customDesign,
    position = 'bottom-right',
    className,
    locale = 'de',
    messages,
    defaultDuration,
    maxVisibleToasts,
}: ToastProviderProps) {
    useIsomorphicLayoutEffect(() => {
        const previousDefaults = store.configureToastDefaults({
            duration: defaultDuration,
            maxVisibleToasts,
        })

        return () => store.restoreToastDefaults(previousDefaults)
    }, [defaultDuration, maxVisibleToasts, store])

    const { state } = useToastLogic(store)
    const contextValue = useMemo(() => ({ store, toast: store.toast }), [store])

    return (
        <ToastStoreContext.Provider value={contextValue}>
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
        </ToastStoreContext.Provider>
    )
}
