import { expect, spyOn, test } from 'bun:test'
import { createToastStore } from '../../../lib/ToastStore/toastApi.ts'
import { registerToastProviderDefaults } from '../../../lib/ToastStore/toastStore.ts'

function withClock(run: (advance: (milliseconds: number) => void) => void) {
    let now = 1000
    let nextId = 0
    const timers = new Map<number, { due: number; run: () => void }>()
    const date = spyOn(Date, 'now').mockImplementation(() => now)
    const schedule = spyOn(globalThis, 'setTimeout').mockImplementation(((
        callback: TimerHandler,
        delay = 0,
    ) => {
        if (typeof callback !== 'function')
            throw new TypeError('Expected callback')
        const id = ++nextId
        timers.set(id, { due: now + Number(delay), run: () => callback() })
        return id
    }) as typeof globalThis.setTimeout)
    const cancel = spyOn(globalThis, 'clearTimeout').mockImplementation(((
        id: number,
    ) => {
        timers.delete(Number(id))
    }) as typeof globalThis.clearTimeout)
    const advance = (milliseconds: number) => {
        const end = now + milliseconds
        for (;;) {
            const next = [...timers.entries()]
                .filter(([, timer]) => timer.due <= end)
                .toSorted((a, b) => a[1].due - b[1].due)[0]
            if (!next) break
            now = next[1].due
            timers.delete(next[0])
            next[1].run()
        }
        now = end
    }
    try {
        run(advance)
    } finally {
        date.mockRestore()
        schedule.mockRestore()
        cancel.mockRestore()
    }
}

test('queued notifications expire from creation when queue pauses are disabled', () =>
    withClock((advance) => {
        const store = createToastStore({
            maxVisibleToasts: 1,
            pauseWhenQueued: false,
        })
        try {
            const first = store.toast.info('Expires while hidden', {
                duration: 1000,
            })
            advance(200)
            const persistent = store.toast.error('Persistent', { duration: 0 })
            advance(800)
            expect(store.getToastSnapshot().map((toast) => toast.id)).toEqual([
                persistent,
            ])
            expect(
                store.toast.update(first, { content: 'Already expired' }),
            ).toBe(false)
            advance(10000)
            expect(store.getToastSnapshot().map((toast) => toast.id)).toEqual([
                persistent,
            ])
        } finally {
            store.dispose()
        }
    }))

test('revealing a queued notification preserves its remaining time and explicit pauses', () =>
    withClock((advance) => {
        const store = createToastStore({
            maxVisibleToasts: 1,
            pauseWhenQueued: false,
        })
        try {
            const first = store.toast.info('First', { duration: 1000 })
            advance(200)
            const second = store.toast.info('Second', { duration: 1000 })
            advance(300)
            store.toast.dismiss(second)
            advance(499)
            expect(store.getToastSnapshot()[0]?.id).toBe(first)
            advance(1)
            expect(store.getToastSnapshot()).toHaveLength(0)
            const paused = store.toast.info('Focused', { duration: 1000 })
            advance(250)
            store.setToastPauseReason(paused, 'focus', true)
            advance(2000)
            store.setToastPauseReason(paused, 'focus', false)
            advance(749)
            expect(store.getToastSnapshot()).toHaveLength(1)
            advance(1)
            expect(store.getToastSnapshot()).toHaveLength(0)
        } finally {
            store.dispose()
        }
    }))

test('legacy queue pauses remain the default and provider policy restores correctly', () =>
    withClock((advance) => {
        const store = createToastStore({ maxVisibleToasts: 1 })
        try {
            const first = store.toast.info('First', { duration: 1000 })
            advance(200)
            const persistent = store.toast.info('Persistent', { duration: 0 })
            advance(5000)
            expect(store.getToastSnapshot()).toHaveLength(2)
            const firstOwner = Symbol('first')
            const removeFirst = registerToastProviderDefaults(
                store,
                firstOwner,
                { pauseWhenQueued: false },
            )
            const removeSecond = registerToastProviderDefaults(
                store,
                Symbol('second'),
                { pauseWhenQueued: true },
            )
            registerToastProviderDefaults(store, firstOwner, {
                pauseWhenQueued: false,
            })
            expect(store.getToastDefaults().pauseWhenQueued).toBe(true)
            removeSecond()
            expect(store.getToastDefaults().pauseWhenQueued).toBe(false)
            advance(799)
            expect(
                store.getToastSnapshot().some((toast) => toast.id === first),
            ).toBe(true)
            advance(1)
            expect(store.getToastSnapshot().map((toast) => toast.id)).toEqual([
                persistent,
            ])
            removeFirst()
            expect(store.getToastDefaults().pauseWhenQueued).toBe(true)
        } finally {
            store.dispose()
        }
    }))

test('queued duration updates, deduplication and eviction do not keep stale timers', () =>
    withClock((advance) => {
        const store = createToastStore({
            maxVisibleToasts: 1,
            maxQueuedToasts: 2,
            pauseWhenQueued: false,
        })
        try {
            const first = store.toast.error('First', {
                duration: 1000,
                dedupeKey: 'first',
            })
            advance(200)
            expect(store.toast.error('Duplicate', { dedupeKey: 'first' })).toBe(
                first,
            )
            const second = store.toast.info('Second', { duration: 0 })
            store.toast.update(first, { duration: 2000 })
            advance(1999)
            expect(store.getToastSnapshot()).toHaveLength(2)
            advance(1)
            expect(store.getToastSnapshot().map((toast) => toast.id)).toEqual([
                second,
            ])
            store.toast.info('Evicted', { duration: 1000 })
            store.toast.info('Evicts oldest', { duration: 0 })
            store.toast.info('Evicts timed', { duration: 0 })
            advance(1000)
            expect(store.getToastSnapshot()).toHaveLength(2)
            store.dispose()
            advance(5000)
            expect(store.getToastSnapshot()).toHaveLength(0)
        } finally {
            store.dispose()
        }
    }))
