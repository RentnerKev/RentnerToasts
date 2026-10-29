import { useCallback, useSyncExternalStore } from 'react'
import type { ToastPortalOptions } from '../Types/toast-ui.types.ts'
import {
    getToastFocusScope,
    getToastFocusScopeBoundary,
    subscribeToastFocusScope,
} from '../../../lib/ToastFocusScope/toastFocusScope.ts'

function subscribe() {
    return () => {}
}
function getClientSnapshot() {
    return true
}
function getServerSnapshot() {
    return false
}
function getServerScope() {
    return null
}

export function useToastPortalContainer(
    container: ToastPortalOptions['portalContainer'],
) {
    const ownerDocument =
        container && container !== 'body'
            ? container.ownerDocument
            : typeof document === 'undefined'
              ? undefined
              : document
    const subscribeScope = useCallback(
        (onChange: () => void) =>
            subscribeToastFocusScope(ownerDocument, onChange),
        [ownerDocument],
    )
    const getScope = useCallback(
        () => getToastFocusScope(ownerDocument),
        [ownerDocument],
    )
    const scope = useSyncExternalStore(subscribeScope, getScope, getServerScope)
    const isClient = useSyncExternalStore(
        subscribe,
        getClientSnapshot,
        getServerSnapshot,
    )
    if (scope) {
        // Keep an explicit destination that is already inside the active scope.
        return container &&
            container !== 'body' &&
            getToastFocusScopeBoundary(scope).contains(container)
            ? container
            : scope
    }
    return container === 'body' ? (isClient ? document.body : null) : container
}
