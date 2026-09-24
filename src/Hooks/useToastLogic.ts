import { useMemo, useSyncExternalStore } from 'react'
import {
    getToastDefaults,
    getToastSnapshot,
    removeToast,
    subscribeToToasts,
} from '../toastStore.js'

export function useToastLogic() {
    const toasts = useSyncExternalStore(
        subscribeToToasts,
        getToastSnapshot,
        getToastSnapshot,
    )

    const maxVisibleToasts = getToastDefaults().maxVisibleToasts
    const visibleToasts = useMemo(
        () => toasts.slice(-maxVisibleToasts),
        [maxVisibleToasts, toasts],
    )

    return {
        handler: { removeToast },
        state: { toasts, visibleToasts },
    }
}
