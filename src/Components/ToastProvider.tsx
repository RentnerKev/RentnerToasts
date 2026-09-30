import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useToastLogic } from '../Hooks/useToastLogic.js'
import { defaultToastStore } from '../toast.js'
import { registerToastProviderDefaults } from '../toastStore.js'
import { ToastStoreContext } from '../ToastStoreContext.js'
import type { ToastProviderProps, ToastStore } from '../types.js'
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
    const [defaultsOwner] = useState(() => Symbol('toast-provider-defaults'))
    const defaultsDisposers = useRef(new Map<ToastStore, () => void>())

    useIsomorphicLayoutEffect(() => {
        const dispose = registerToastProviderDefaults(store, defaultsOwner, {
            duration: defaultDuration,
            maxVisibleToasts,
        })
        defaultsDisposers.current.set(store, dispose)
    }, [defaultDuration, defaultsOwner, maxVisibleToasts, store])

    // Updating defaults preserves mount order. Only unmounting or switching
    // stores removes this provider's registration.
    useIsomorphicLayoutEffect(() => {
        const disposers = defaultsDisposers.current
        return () => {
            disposers.get(store)?.()
            disposers.delete(store)
        }
    }, [store])

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
