import { useMemo, useSyncExternalStore } from 'react'
import { useToastStore } from './useToastStore.js'
import type { ToastStore } from '../../../lib/ToastStore/Types/toast.types.js'

import type { ToastSnapshotResult } from '../Types/toast-logic.types.js'

export function useToastSnapshot(store?: ToastStore): ToastSnapshotResult {
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
        handler: { handleRemoveToast: activeStore.removeToast },
        state: { toasts, visibleToasts },
    }
}
