import { useCallback, useState } from 'react'
import type { Toast } from '../../../lib/ToastStore/Types/toast.types.ts'
import type { ToastPresenceItem } from '../Types/toast-animation.types.ts'

export function useToastPresence(toasts: readonly Toast[]) {
    const [snapshot, setSnapshot] = useState(() => ({
        source: toasts,
        items: toasts.map((toast): ToastPresenceItem => ({
            toast,
            present: true,
        })),
    }))

    // Reconcile before committing so an exiting card keeps the same DOM node.
    // The store remains the sole owner of queue membership and timer state.
    if (snapshot.source !== toasts) {
        const ids = new Set(toasts.map((toast) => toast.id))
        const items = toasts.map((toast): ToastPresenceItem => ({
            toast,
            present: true,
        }))
        snapshot.items.forEach((item, index) => {
            if (!ids.has(item.toast.id)) {
                items.splice(index, 0, { ...item, present: false })
            }
        })
        setSnapshot({ source: toasts, items })
    }

    const handleExitComplete = useCallback((id: string) => {
        setSnapshot((previous) => {
            const items = previous.items.filter(
                (item) => item.toast.id !== id || item.present,
            )
            return items.length === previous.items.length
                ? previous
                : { ...previous, items }
        })
    }, [])

    return {
        state: { items: snapshot.items },
        handler: { handleExitComplete },
    }
}
