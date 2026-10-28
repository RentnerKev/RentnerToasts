import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
    classNames,
    portalContainer,
    portalClassName,
    portalZIndex,
    position = 'bottom-right',
    className,
    locale = 'de',
    messages,
    defaultDuration,
    maxVisibleToasts,
    pauseWhenQueued,
}: ToastProviderLogicProps): ToastProviderLogicResult {
    const [defaultsOwner] = useState(() => Symbol('toast-provider-defaults'))
    const defaultsDisposers = useRef(new Map<ToastStore, () => void>())

    useIsomorphicLayoutEffect(() => {
        const dispose = registerToastProviderDefaults(store, defaultsOwner, {
            duration: defaultDuration,
            maxVisibleToasts,
            pauseWhenQueued,
        })
        defaultsDisposers.current.set(store, dispose)
    }, [
        defaultDuration,
        defaultsOwner,
        maxVisibleToasts,
        pauseWhenQueued,
        store,
    ])

    // Changing values preserves provider precedence; only unmount/store switch
    // releases this owner's registration.
    useIsomorphicLayoutEffect(() => {
        const disposers = defaultsDisposers.current
        return () => {
            disposers.get(store)?.()
            disposers.delete(store)
        }
    }, [store])

    const storeContext = useMemo(() => ({ store, toast: store.toast }), [store])

    return {
        state: {
            storeContext,
            surfaceProps: {
                customDesign,
                classNames,
                portalContainer,
                portalClassName,
                portalZIndex,
                position,
                className,
                locale,
                messages,
            },
        },
    }
}
