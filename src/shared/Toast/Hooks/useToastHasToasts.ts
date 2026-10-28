import { useCallback, useSyncExternalStore } from 'react'
import type { ToastStore } from '../../../lib/ToastStore/Types/toast.types.ts'

/** Keep provider mounting tied only to the empty/nonempty transition. */
export function useToastHasToasts(store: ToastStore): boolean {
    const getHasToasts = useCallback(
        () => store.getToastSnapshot().length > 0,
        [store],
    )
    return useSyncExternalStore(
        store.subscribeToToasts,
        getHasToasts,
        getHasToasts,
    )
}
