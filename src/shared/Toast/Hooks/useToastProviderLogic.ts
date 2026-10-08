import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useToastSnapshot } from './useToastSnapshot.ts'
import { defaultToastStore } from '../../../lib/ToastStore/toastApi.ts'
import { registerToastProviderDefaults } from '../../../lib/ToastStore/toastStore.ts'
import type { ToastStore } from '../../../lib/ToastStore/Types/toast.types.ts'
import type {
    ToastProviderLogicResult,
    ToastProviderLogicProps,
} from '../Types/toast-logic.types.ts'

const useIsomorphicLayoutEffect =
    typeof window === 'undefined' ? useEffect : useLayoutEffect

export function useToastProviderLogic({
    store = defaultToastStore,
    customDesign,
    position = 'bottom-right',
    className,
    locale = 'de',
    messages,
    defaultDuration,
    maxVisibleToasts,
}: ToastProviderLogicProps): ToastProviderLogicResult {
    const [defaultsOwner] = useState(() => Symbol('toast-provider-defaults'))
    const defaultsDisposers = useRef(new Map<ToastStore, () => void>())

    useIsomorphicLayoutEffect(() => {
        const dispose = registerToastProviderDefaults(store, defaultsOwner, {
            duration: defaultDuration,
            maxVisibleToasts,
        })
        defaultsDisposers.current.set(store, dispose)
    }, [defaultDuration, defaultsOwner, maxVisibleToasts, store])

    // Changing values preserves provider precedence; only unmount/store switch
    // releases this owner's registration.
    useIsomorphicLayoutEffect(() => {
        const disposers = defaultsDisposers.current
        return () => {
            disposers.get(store)?.()
            disposers.delete(store)
        }
    }, [store])

    const { state } = useToastSnapshot(store)
    const storeContext = useMemo(() => ({ store, toast: store.toast }), [store])

    return {
        state: {
            hasToasts: state.toasts.length > 0,
            storeContext,
            surfaceProps: {
                customDesign,
                position,
                className,
                locale,
                messages,
            },
        },
    }
}
