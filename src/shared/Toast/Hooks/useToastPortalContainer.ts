import { useCallback, useSyncExternalStore } from 'react'
import { useToastStore } from './useToastStore.ts'
import { getToastBranches } from '../../../lib/ToastStore/toastBranches.ts'
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
    const registry = getToastBranches(useToastStore())
    const subscribeToBranches = useCallback(
        (onChange: () => void) => {
            registry.listeners.add(onChange)
            return () => {
                registry.listeners.delete(onChange)
            }
        },
        [registry],
    )
    const getBranch = useCallback(() => registry.active, [registry])
    const branch = useSyncExternalStore(
        subscribeToBranches,
        getBranch,
        () => null,
    )
    const isClient = useSyncExternalStore(
        subscribe,
        getClientSnapshot,
        getServerSnapshot,
    )
    if (container && container !== 'body') return container
    return (
        branch ??
        (container === 'body' ? (isClient ? document.body : null) : container)
    )
}
