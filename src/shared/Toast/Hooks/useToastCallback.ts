import { useCallback, useSyncExternalStore } from 'react'
import type { Toast } from '../../../lib/ToastStore/Types/toast.types.ts'
import {
    isToastActionPending,
    runToastAction,
    subscribeToToastActions,
} from '../../../lib/ToastAction/toastAction.ts'
import { useToastStore } from './useToastStore.ts'

function noop() {}
function noopSubscribe() {
    return noop
}
function getFalseSnapshot() {
    return false
}

export function useToastCallback(
    toast: Toast,
    present: boolean,
    onRemove: (id: string) => void,
) {
    const store = useToastStore()
    const hasAction = toast.action !== undefined
    const subscribe = useCallback(
        (listener: () => void) => subscribeToToastActions(store, listener),
        [store],
    )
    const getSnapshot = useCallback(
        () => isToastActionPending(store, toast.id, toast.action),
        [store, toast.id, toast.action],
    )
    const actionPending = useSyncExternalStore(
        hasAction ? subscribe : noopSubscribe,
        hasAction ? getSnapshot : getFalseSnapshot,
        getFalseSnapshot,
    )

    const handleAction = useCallback(() => {
        const action = toast.action
        if (!present || !action) return
        void runToastAction(store, toast.id, action, onRemove)
    }, [onRemove, present, store, toast.action, toast.id])

    return {
        state: { actionPending },
        handler: { handleAction },
    }
}
