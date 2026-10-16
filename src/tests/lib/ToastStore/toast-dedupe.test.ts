import { expect, spyOn, test } from 'bun:test'
import { createToastStore } from '../../../lib/ToastStore/toastApi.ts'

test('deduplicates keyed visible and queued notifications without changing timing or content', () => {
    const store = createToastStore({ maxVisibleToasts: 1 })
    try {
        const id = store.toast.error('Original', {
            duration: 0,
            dedupeKey: 'network',
        })
        store.toast.info('Visible', { duration: 0 })
        const snapshot = store.getToastSnapshot()
        expect(store.toast.error('Repeated', { dedupeKey: 'network' })).toBe(id)
        expect(store.getToastSnapshot()).toBe(snapshot)
        expect(snapshot[0]?.content).toBe('Original')
        expect(store.toast.info('Unkeyed', { duration: 0 })).not.toBe(
            store.toast.info('Unkeyed', { duration: 0 }),
        )
    } finally {
        store.dispose()
    }
})

test('uses a fixed creation window and retains a newer key when an older toast is dismissed', () => {
    const store = createToastStore({ dedupeWindow: 100 })
    const now = spyOn(Date, 'now').mockReturnValue(1000)
    try {
        const first = store.toast.info('First', {
            duration: 0,
            dedupeKey: 'key',
        })
        now.mockReturnValue(1099)
        expect(store.toast.info('Duplicate', { dedupeKey: 'key' })).toBe(first)
        now.mockReturnValue(1100)
        const second = store.toast.info('New', {
            duration: 0,
            dedupeKey: 'key',
        })
        expect(second).not.toBe(first)
        store.toast.dismiss(first)
        expect(store.toast.info('Duplicate new', { dedupeKey: 'key' })).toBe(
            second,
        )
        expect(store.getToastSnapshot()).toHaveLength(1)
    } finally {
        now.mockRestore()
        store.dispose()
    }
})

test('releases keys after dismissal, eviction, clear and disposal and isolates stores', () => {
    const store = createToastStore({ maxQueuedToasts: 1 })
    const other = createToastStore()
    const keyed = () =>
        store.toast.error('Keyed', { duration: 0, dedupeKey: 'key' })
    try {
        const first = keyed()
        expect(
            other.toast.error('Other', { duration: 0, dedupeKey: 'key' }),
        ).not.toBe(first)
        store.toast.dismiss(first)
        const second = keyed()
        expect(second).not.toBe(first)
        store.toast.info('Evicts previous', { duration: 0 })
        const third = keyed()
        expect(third).not.toBe(second)
        store.toast.dismissAll()
        const fourth = keyed()
        expect(fourth).not.toBe(third)
        store.dispose()
        expect(keyed()).not.toBe(fourth)
    } finally {
        store.dispose()
        other.dispose()
    }
})

test('supports per-toast windows, zero opt-out and defensive invalid windows', () => {
    const store = createToastStore({ dedupeWindow: 0 })
    try {
        const options = { duration: 0, dedupeKey: 'key' }
        expect(store.toast.info('One', options)).not.toBe(
            store.toast.info('Two', options),
        )
        const first = store.toast.info('Dedupe', {
            ...options,
            dedupeWindow: 500,
        })
        expect(
            store.toast.info('Duplicate', { ...options, dedupeWindow: 500 }),
        ).toBe(first)
        expect(
            store.toast.info('Opt out', { ...options, dedupeWindow: 0 }),
        ).not.toBe(first)
        expect(
            store.toast.info('Invalid', { ...options, dedupeWindow: NaN }),
        ).not.toBe(first)
    } finally {
        store.dispose()
    }
})
