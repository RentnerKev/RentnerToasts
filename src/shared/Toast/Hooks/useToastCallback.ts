import { useCallback, useSyncExternalStore } from 'react'
import type { Toast } from '../../../lib/ToastStore/Types/toast.types.ts'
import {
    isToastActionPending,
    runToastAction,
    subscribeToToastActions,
} from '../../../lib/ToastAction/toastAction.ts'
import { useToastStore } from './useToastStore.ts'

function getServerSnapshot() {
    return false
}

export function useToastCallback(
    toast: Toast,
    present: boolean,
    onRemove: (id: string) => void,
) {
    const store = useToastStore()
    const subscribe = useCallback(
        (listener: () => void) => subscribeToToastActions(store, listener),
        [store],
    )
    const getSnapshot = useCallback(
        () => isToastActionPending(store, toast.id, toast.action),
        [store, toast.id, toast.action],
    )
    const actionPending = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot,
    )

    function handleAction() {
        const action = toast.action
        if (!present || !action) return
        void runToastAction(store, toast.id, action, onRemove)
    }

    return {
        state: { actionPending },
        handler: { handleAction },
    }
}
