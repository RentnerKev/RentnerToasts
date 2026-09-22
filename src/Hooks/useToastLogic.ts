import { useMemo, useSyncExternalStore } from 'react'
import {
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

    const visibleToasts = useMemo(() => toasts.slice(-3), [toasts])

    return {
        handler: { removeToast },
        state: { toasts, visibleToasts },
    }
}
