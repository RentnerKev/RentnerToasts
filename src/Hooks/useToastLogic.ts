import { useMemo, useSyncExternalStore } from 'react'
import { useToastStore } from '../ToastStoreContext.js'
import type { ToastStore } from '../types.js'

export function useToastLogic(store?: ToastStore) {
    const contextStore = useToastStore()
    const activeStore = store ?? contextStore
    const toasts = useSyncExternalStore(
        activeStore.subscribeToToasts,
        activeStore.getToastSnapshot,
        activeStore.getToastSnapshot,
    )

    const maxVisibleToasts = activeStore.getToastDefaults().maxVisibleToasts
    const visibleToasts = useMemo(
        () => toasts.slice(-maxVisibleToasts),
        [maxVisibleToasts, toasts],
    )

    return {
        handler: { removeToast: activeStore.removeToast },
        state: { toasts, visibleToasts },
    }
}
