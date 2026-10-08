import { describe, expect, spyOn, test } from 'bun:test'
import { createToastStore } from '../../../lib/ToastStore/toastApi.ts'

describe('indexed toast queue', () => {
    test('resubscribing during notification does not repeat the same callback', () => {
        const store = createToastStore({ defaultDuration: 0 })
        let calls = 0
        let unsubscribe: () => void
        const listener = () => {
            calls++
            if (calls === 1) {
                unsubscribe()
                unsubscribe = store.subscribeToToasts(listener)
            }
        }
        unsubscribe = store.subscribeToToasts(listener)
        store.toast.info('First')
        expect(calls).toBe(1)
        store.toast.info('Second')
        expect(calls).toBe(2)
        unsubscribe()
        store.dispose()
    })

    test('a reentrant dismissal sees coherent state and preserves old snapshots', () => {
        const store = createToastStore({ defaultDuration: 0 })
        const id = store.toast.info('Existing')
        const old = store.getToastSnapshot()
        let removed = false
        store.subscribeToToasts(() => {
            if (!removed) {
                removed = true
                store.toast.dismiss(id)
            }
        })
        store.toast.info('New')
        expect(store.getToastSnapshot().map(({ content }) => content)).toEqual([
            'New',
        ])
        expect(old.map(({ content }) => content)).toEqual(['Existing'])
        store.dispose()
    })

    test('keeps immutable snapshots stable for no-op updates', () => {
        const store = createToastStore({ defaultDuration: 0 })
        const id = store.toast.info('First', { title: 'Title' })
        const before = store.getToastSnapshot()
        let notifications = 0
        store.subscribeToToasts(() => notifications++)
        expect(store.toast.update(id, {})).toBe(true)
        expect(
            store.toast.update(id, {
                content: 'First',
                title: 'Title',
                type: 'info',
            }),
        ).toBe(true)
        expect(store.getToastSnapshot()).toBe(before)
        expect(notifications).toBe(0)
        store.toast.update(id, { content: 'Second', title: null })
        const after = store.getToastSnapshot()
        expect(after).not.toBe(before)
        expect(after[0].content).toBe('Second')
        expect(after[0].title).toBeUndefined()
        expect(before[0].content).toBe('First')
        expect(before[0].title).toBe('Title')
        expect(Object.isFrozen(after)).toBe(true)
        expect(Object.isFrozen(after[0])).toBe(true)
        expect(notifications).toBe(1)
        store.dispose()
    })

    test('an explicit equal duration still resets timing and notifies', () => {
        const store = createToastStore()
        try {
            const id = store.toast.info('Timed', { duration: 10000 })
            const before = store.getToastSnapshot()
            let notifications = 0
            store.subscribeToToasts(() => notifications++)
            store.toast.update(id, { duration: 10000 })
            expect(store.getToastSnapshot()).not.toBe(before)
            expect(store.getToastSnapshot()[0].createdAt).toBeGreaterThan(
                before[0].createdAt,
            )
            expect(store.getToastSnapshot()[0].remaining).toBe(10000)
            expect(store.getToastSnapshot()[0].timerStartedAt).toBeDefined()
            expect(notifications).toBe(1)
        } finally {
            store.dispose()
        }
    })

    test('an opted-in queue limit evicts oldest toasts and releases their timers', () => {
        const store = createToastStore({ maxQueuedToasts: 2 })
        const clear = spyOn(globalThis, 'clearTimeout')
        try {
            const oldest = store.toast.info('Oldest')
            const previous = store.getToastSnapshot()
            store.setToastPauseReason(oldest, 'hover', true)
            const second = store.toast.info('Second')
            const third = store.toast.info('Third')
            expect(store.getToastSnapshot().map(({ id }) => id)).toEqual([
                second,
                third,
            ])
            expect(previous).toHaveLength(1)
            expect(previous[0].id).toBe(oldest)
            expect(store.toast.update(oldest, { content: 'Evicted' })).toBe(
                false,
            )
            expect(clear).toHaveBeenCalledTimes(1)
            store.setToastPauseReason(oldest, 'hover', false)
            store.toast.dismiss(third)
            expect(store.getToastSnapshot()[0].id).toBe(second)
        } finally {
            store.dispose()
            clear.mockRestore()
        }
    })

    test('unlimited and invalid limits preserve all persistent notifications', () => {
        for (const maxQueuedToasts of [
            undefined,
            0,
            -1,
            1.5,
            Number.NaN,
            Number.POSITIVE_INFINITY,
        ]) {
            const store = createToastStore({
                maxQueuedToasts,
                defaultDuration: 0,
            })
            try {
                const ids = Array.from({ length: 1000 }, (_, i) =>
                    store.toast.info(String(i)),
                )
                expect(store.getToastSnapshot().map(({ id }) => id)).toEqual(
                    ids,
                )
                store.toast.update(ids[500], { content: 'Middle updated' })
                store.toast.dismiss(ids[1])
                const snapshot = store.getToastSnapshot()
                expect(snapshot).toHaveLength(999)
                expect(
                    snapshot.find(({ id }) => id === ids[500])?.content,
                ).toBe('Middle updated')
                expect(snapshot[1].id).toBe(ids[2])
            } finally {
                store.dispose()
            }
        }
    })

    test('listeners can read each mutation and old snapshots retain their state', () => {
        const store = createToastStore({ defaultDuration: 0 })
        const lengths: number[] = []
        store.subscribeToToasts(() =>
            lengths.push(store.getToastSnapshot().length),
        )
        const first = store.toast.info('One')
        const old = store.getToastSnapshot()
        store.toast.info('Two')
        store.toast.update(first, { content: 'New one' })
        store.toast.dismiss(first)
        store.toast.dismiss('missing')
        store.toast.dismissAll()
        expect(lengths).toEqual([1, 2, 2, 1, 0])
        expect(old.map(({ content }) => content)).toEqual(['One'])
        store.dispose()
    })
})
