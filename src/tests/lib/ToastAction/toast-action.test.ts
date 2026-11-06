import { expect, test } from 'bun:test'
import { createToastStore } from '../../../lib/ToastStore/toastApi.ts'
import {
    runToastAction,
    isToastActionPending,
    subscribeToToastActions,
} from '../../../lib/ToastAction/toastAction.ts'
import type { ToastAction } from '../../../lib/ToastStore/Types/toast.types.ts'

function deferred() {
    let resolve!: () => void
    const promise = new Promise<void>((done) => {
        resolve = done
    })
    return { promise, resolve: () => resolve() }
}

test('copies immutable actions and preserves timing, queue order and deduplication on updates', () => {
    const store = createToastStore({ maxVisibleToasts: 1 })
    try {
        const action = { label: 'Undo', onClick: () => {} }
        const id = store.toast.info('Original', {
            action,
            duration: 5000,
            dedupeKey: 'save',
        })
        const original = store.getToastSnapshot()[0]
        expect(original.action).not.toBe(action)
        expect(Object.isFrozen(original.action)).toBe(true)
        action.label = 'Mutated outside'
        expect(original.action?.label).toBe('Undo')
        store.toast.info('Cover', { duration: 0 })
        const paused = store.getToastSnapshot()[0]
        expect(paused.timerStartedAt).toBeUndefined()
        expect(
            store.toast.info('Duplicate', { action, dedupeKey: 'save' }),
        ).toBe(id)
        expect(store.getToastSnapshot()[0].action).toBe(original.action)
        store.toast.update(id, { content: 'Updated' })
        expect(store.getToastSnapshot()[0].action).toBe(original.action)
        store.toast.update(id, { action })
        const updated = store.getToastSnapshot()[0]
        expect(updated.id).toBe(id)
        expect(updated.action?.label).toBe('Mutated outside')
        expect(updated.remaining).toBe(paused.remaining)
        expect(updated.createdAt).toBe(paused.createdAt)
        store.toast.update(id, { action: null })
        expect(store.getToastSnapshot()[0].action).toBeUndefined()
    } finally {
        store.dispose()
    }
})

test('passes IDs, prevents duplicate async calls across surfaces and pauses pending actions', async () => {
    const store = createToastStore()
    const task = deferred()
    let calls = 0
    let receivedId = ''
    try {
        const id = store.toast.info('Working', {
            duration: 1000,
            action: {
                label: 'Undo',
                onClick: (currentId) => {
                    calls += 1
                    receivedId = currentId
                    return task.promise
                },
            },
        })
        const action = store.getToastSnapshot()[0].action!
        const first = runToastAction(store, id, action)
        await runToastAction(store, id, action)
        expect(calls).toBe(1)
        expect(receivedId).toBe(id)
        expect(store.getToastSnapshot()[0].timerStartedAt).toBeUndefined()
        task.resolve()
        await first
        expect(store.getToastSnapshot()).toHaveLength(0)
        await runToastAction(store, id, action)
        expect(calls).toBe(1)
    } finally {
        store.dispose()
    }
})

test('contains sync and async failures including failing error handlers and permits retry', async () => {
    const store = createToastStore()
    const failure = new Error('Try again')
    let calls = 0
    const errors: unknown[] = []
    try {
        const id = store.toast.error('Failed', {
            duration: 1000,
            action: {
                label: 'Retry',
                onClick: () => {
                    calls += 1
                    if (calls === 1) throw failure
                    return Promise.reject(failure)
                },
                onError: (error, currentId) => {
                    errors.push(error, currentId)
                    return Promise.reject(new Error('Error handler failed'))
                },
            },
        })
        const action = store.getToastSnapshot()[0].action!
        await runToastAction(store, id, action)
        await runToastAction(store, id, action)
        expect(calls).toBe(2)
        expect(errors).toEqual([failure, id, failure, id])
        expect(store.getToastSnapshot()[0].id).toBe(id)
        expect(store.getToastSnapshot()[0].timerStartedAt).toBeDefined()
        store.toast.update(id, {
            action: {
                label: 'No error handler',
                onClick: () => Promise.reject(failure),
            },
        })
        await runToastAction(store, id, store.getToastSnapshot()[0].action!)
        expect(store.getToastSnapshot()).toHaveLength(1)
    } finally {
        store.dispose()
    }
})

test('respects retained actions and never dismisses a replacement action after old work settles', async () => {
    const store = createToastStore()
    const task = deferred()
    try {
        const id = store.toast.info('Retained', {
            duration: 0,
            action: {
                label: 'Again',
                onClick: () => {},
                dismissOnSuccess: false,
            },
        })
        await runToastAction(store, id, store.getToastSnapshot()[0].action!)
        expect(store.getToastSnapshot()).toHaveLength(1)
        store.toast.update(id, {
            action: { label: 'Pending', onClick: () => task.promise },
        })
        const originalAction = store.getToastSnapshot()[0].action!
        const pending = runToastAction(store, id, originalAction)
        store.toast.update(id, {
            action: { label: 'Replacement', onClick: () => {} },
        })
        expect(isToastActionPending(store, id, originalAction)).toBe(true)
        expect(
            isToastActionPending(store, id, store.getToastSnapshot()[0].action),
        ).toBe(false)
        task.resolve()
        await pending
        expect(store.getToastSnapshot()[0].action?.label).toBe('Replacement')
    } finally {
        store.dispose()
    }
})

test('releases only its own pause and safely completes after dismissal or disposal', async () => {
    const store = createToastStore()
    const task = deferred()
    const id = store.toast.info('Focused', {
        duration: 1000,
        action: {
            label: 'Run',
            onClick: () => task.promise,
            dismissOnSuccess: false,
        },
    })
    store.setToastPauseReason(id, 'focus', true)
    const pending = runToastAction(
        store,
        id,
        store.getToastSnapshot()[0].action!,
    )
    task.resolve()
    await pending
    expect(store.getToastSnapshot()[0].timerStartedAt).toBeUndefined()
    store.setToastPauseReason(id, 'focus', false)
    expect(store.getToastSnapshot()[0].timerStartedAt).toBeDefined()
    const disposed = runToastAction(
        store,
        id,
        store.getToastSnapshot()[0].action!,
    )
    store.dispose()
    await disposed
    expect(store.getToastSnapshot()).toHaveLength(0)
})

test('carries promise actions through settlement and removes loading actions for plain messages', async () => {
    const store = createToastStore()
    const action: ToastAction = { label: 'Retry', onClick: () => {} }
    try {
        const task = deferred()
        const result = store.toast.promise(task.promise, {
            loading: { content: 'Loading', action },
            success: { content: 'Done', action },
            error: 'Failed',
        })
        expect(store.getToastSnapshot()[0].action?.label).toBe('Retry')
        task.resolve()
        await result
        expect(store.getToastSnapshot()[0].action?.label).toBe('Retry')
        await store.toast.promise(Promise.resolve(), {
            loading: { content: 'Loading', action },
            success: 'Done',
            error: 'Failed',
        })
        expect(store.getToastSnapshot()[1].action).toBeUndefined()
        await expect(
            store.toast.promise(Promise.reject(new Error('Failure')), {
                loading: 'Loading',
                success: 'Done',
                error: () => ({ content: 'Failed', action }),
            }),
        ).rejects.toThrow('Failure')
        expect(store.getToastSnapshot()[2].action?.label).toBe('Retry')
    } finally {
        store.dispose()
    }
})

test('isolates concurrent actions in different stores even when custom stores share action objects and IDs', async () => {
    const first = createToastStore()
    const second = createToastStore()
    const task = deferred()
    let calls = 0
    const action: ToastAction = {
        label: 'Run',
        onClick: () => {
            calls += 1
            return task.promise
        },
    }
    const id = 'shared-id'
    const snapshot = [
        {
            id,
            action,
            content: 'Shared',
            type: 'info' as const,
            duration: 0,
            remaining: 0,
            createdAt: 0,
        },
    ]
    // Compatible stores need not copy actions or allocate globally unique IDs.
    const firstCustom = { ...first, getToastSnapshot: () => snapshot }
    const secondCustom = { ...second, getToastSnapshot: () => snapshot }
    try {
        const runningFirst = runToastAction(firstCustom, id, action)
        const runningSecond = runToastAction(secondCustom, id, action)
        expect(calls).toBe(2)
        task.resolve()
        await Promise.all([runningFirst, runningSecond])
    } finally {
        first.dispose()
        second.dispose()
    }
})

test('notifies every surface and isolates pending snapshots by store, ID and action', async () => {
    const store = createToastStore()
    const other = createToastStore()
    const task = deferred()
    const id = store.toast.info('Pending', {
        duration: 0,
        action: {
            label: 'Run',
            onClick: () => task.promise,
            dismissOnSuccess: false,
        },
    })
    const action = store.getToastSnapshot()[0].action!
    const first: boolean[] = []
    const second: boolean[] = []
    let otherCalls = 0
    const unsubscribeFirst = subscribeToToastActions(store, () =>
        first.push(isToastActionPending(store, id, action)),
    )
    const unsubscribeSecond = subscribeToToastActions(store, () =>
        second.push(isToastActionPending(store, id, action)),
    )
    const unsubscribeOther = subscribeToToastActions(other, () => {
        otherCalls += 1
    })
    try {
        expect(isToastActionPending(store, id, action)).toBe(false)
        const pending = runToastAction(store, id, action)
        expect(first).toEqual([true])
        expect(second).toEqual([true])
        expect(isToastActionPending(other, id, action)).toBe(false)
        expect(isToastActionPending(store, 'another-id', action)).toBe(false)
        expect(isToastActionPending(store, id, { ...action })).toBe(false)
        unsubscribeFirst()
        task.resolve()
        await pending
        expect(first).toEqual([true])
        expect(second).toEqual([true, false])
        expect(otherCalls).toBe(0)
    } finally {
        unsubscribeFirst()
        unsubscribeSecond()
        unsubscribeOther()
        store.dispose()
        other.dispose()
    }
})
