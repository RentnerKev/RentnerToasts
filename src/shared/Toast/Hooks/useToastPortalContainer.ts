import { useSyncExternalStore } from 'react'
import type { ToastPortalOptions } from '../Types/toast-ui.types.ts'

function subscribe() {
    return () => {}
}
function getClientSnapshot() {
    return true
}
function getServerSnapshot() {
    return false
}

export function useToastPortalContainer(
    container: ToastPortalOptions['portalContainer'],
) {
    const isClient = useSyncExternalStore(
        subscribe,
        getClientSnapshot,
        getServerSnapshot,
    )
    return container === 'body' ? (isClient ? document.body : null) : container
}
