import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useToastSnapshot } from './useToastSnapshot.js'
import { defaultToastStore } from '../../../toast.js'
import { registerToastProviderDefaults } from '../../../lib/ToastStore/toastStore.js'
import type { ToastStore } from '../../../lib/ToastStore/Types/toast.types.js'
import type { ToastProviderProps } from '../Types/toast-ui.types.js'
import type {
    ToastInteractionEntries,
    ToastProviderLogicResult,
} from '../Types/toast-logic.types.js'

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
}: ToastProviderProps): ToastProviderLogicResult {
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
    const interaction = useMemo(
        () => ({ store, entries: new Map() as ToastInteractionEntries }),
        [store],
    )

    return {
        state: {
            hasToasts: state.toasts.length > 0,
            storeContext,
            interactionEntries: interaction.entries,
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
