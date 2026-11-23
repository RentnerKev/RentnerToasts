import { useMemo, useSyncExternalStore } from 'react'
import { useToastStore } from './useToastStore.ts'
import { getVisibleToastSnapshotAccessor } from '../../../lib/ToastStore/toastStore.ts'
import type { ToastStore } from '../../../lib/ToastStore/Types/toast.types.ts'
import type { ToastSnapshotResult } from '../Types/toast-logic.types.ts'

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

export function useVisibleToastSnapshot(store?: ToastStore) {
    const contextStore = useToastStore()
    const activeStore = store ?? contextStore
    const visibleAccessor = getVisibleToastSnapshotAccessor(activeStore)
    const getSnapshot = visibleAccessor ?? activeStore.getToastSnapshot
    const snapshot = useSyncExternalStore(
        activeStore.subscribeToToasts,
        getSnapshot,
        getSnapshot,
    )

    const maxVisibleToasts = activeStore.getToastDefaults().maxVisibleToasts
    const visibleToasts = useMemo(
        () => (visibleAccessor ? snapshot : snapshot.slice(-maxVisibleToasts)),
        [maxVisibleToasts, snapshot, visibleAccessor],
    )

    return {
        handler: { handleRemoveToast: activeStore.removeToast },
        state: { visibleToasts },
    }
}
