import { useCallback, useState } from 'react'
import type { Toast } from '../../../lib/ToastStore/Types/toast.types.ts'
import type { ToastPresenceItem } from '../Types/toast-animation.types.ts'

const EMPTY_ITEMS: ToastPresenceItem[] = []

function toPresentItems(toasts: readonly Toast[]): ToastPresenceItem[] {
    if (toasts.length === 0) return EMPTY_ITEMS
    const items: ToastPresenceItem[] = []
    for (let index = 0; index < toasts.length; index += 1) {
        items.push({ toast: toasts[index]!, present: true })
    }
    return items
}

export function useToastPresence(toasts: readonly Toast[]) {
    const [snapshot, setSnapshot] = useState(() => ({
        source: toasts,
        items: toPresentItems(toasts),
    }))

    // Reconcile before committing so an exiting card keeps the same DOM node.
    // The store remains the sole owner of queue membership and timer state.
    if (snapshot.source !== toasts) {
        let items: ToastPresenceItem[]
        if (snapshot.items.length === 0) {
            items = toPresentItems(toasts)
        } else if (toasts.length === 0) {
            items = snapshot.items.map((item) =>
                item.present ? { toast: item.toast, present: false } : item,
            )
        } else {
            const ids = new Set<string>()
            items = []
            for (let index = 0; index < toasts.length; index += 1) {
                const toast = toasts[index]!
                ids.add(toast.id)
                items.push({ toast, present: true })
            }
            for (let index = 0; index < snapshot.items.length; index += 1) {
                const item = snapshot.items[index]!
                if (!ids.has(item.toast.id)) {
                    items.splice(
                        index,
                        0,
                        item.present
                            ? { toast: item.toast, present: false }
                            : item,
                    )
                }
            }
        }
        setSnapshot({ source: toasts, items })
    }

    const handleExitComplete = useCallback((id: string) => {
        setSnapshot((previous) => {
            let changed = false
            const items: ToastPresenceItem[] = []
            for (let index = 0; index < previous.items.length; index += 1) {
                const item = previous.items[index]!
                if (item.toast.id === id && !item.present) {
                    changed = true
                } else {
                    items.push(item)
                }
            }
            return changed ? { ...previous, items } : previous
        })
    }, [])

    return {
        state: { items: snapshot.items },
        handler: { handleExitComplete },
    }
}
