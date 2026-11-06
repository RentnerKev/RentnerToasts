import type {
    ToastAction,
    ToastId,
    ToastStore,
} from '../ToastStore/Types/toast.types.ts'

const runningActions = new WeakMap<ToastStore, Map<ToastId, Set<ToastAction>>>()

const actionListeners = new WeakMap<ToastStore, Set<() => void>>()

export function subscribeToToastActions(
    store: ToastStore,
    listener: () => void,
) {
    const listeners = actionListeners.get(store) ?? new Set<() => void>()
    listeners.add(listener)
    actionListeners.set(store, listeners)
    return () => {
        listeners.delete(listener)
        if (listeners.size === 0 && actionListeners.get(store) === listeners)
            actionListeners.delete(store)
    }
}

export function isToastActionPending(
    store: ToastStore,
    id: ToastId,
    action: ToastAction | undefined,
): boolean {
    return (
        action !== undefined &&
        runningActions.get(store)?.get(id)?.has(action) === true
    )
}

function notifyActionListeners(store: ToastStore) {
    for (const listener of actionListeners.get(store) ?? []) listener()
}

/** One in-flight invocation per immutable action, shared by all mounted surfaces. */
export async function runToastAction(
    store: ToastStore,
    id: ToastId,
    action: ToastAction,
    onRemove: (id: ToastId) => void = store.removeToast,
): Promise<void> {
    const storeActions =
        runningActions.get(store) ?? new Map<ToastId, Set<ToastAction>>()
    const actions = storeActions.get(id) ?? new Set<ToastAction>()
    if (
        actions.has(action) ||
        store.getToastSnapshot().find((toast) => toast.id === id)?.action !==
            action
    )
        return
    actions.add(action)
    storeActions.set(id, actions)
    runningActions.set(store, storeActions)
    const owner = Symbol('toast-action')
    store.setToastPauseReason(id, 'action', true, owner)
    notifyActionListeners(store)
    try {
        await action.onClick(id)
        // A callback can replace the notification/action or dismiss it itself.
        if (
            action.dismissOnSuccess !== false &&
            store.getToastSnapshot().find((toast) => toast.id === id)
                ?.action === action
        )
            onRemove(id)
    } catch (error) {
        try {
            await action.onError?.(error, id)
        } catch {
            // Application error handlers must not leak rejected event promises.
        }
    } finally {
        actions.delete(action)
        if (actions.size === 0) storeActions.delete(id)
        if (storeActions.size === 0) runningActions.delete(store)
        store.setToastPauseReason(id, 'action', false, owner)
        notifyActionListeners(store)
    }
}
