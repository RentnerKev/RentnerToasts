import { afterEach, describe, expect, spyOn, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createToastStore, ToastProvider, toast, useToast } from '../src/index'
import type { ToastStore } from '../src/types'
import { getToastSnapshot } from '../src/toastStore'

const stores: ToastStore[] = []

function createTestStore() {
    const store = createToastStore()
    stores.push(store)
    return store
}

afterEach(() => {
    stores.splice(0).forEach((store) => store.dispose())
    toast.dismissAll()
})

describe('isolated toast stores', () => {
    test('keeps state, defaults, and ids local to each store', () => {
        const firstStore = createToastStore({
            defaultDuration: 1111,
            maxVisibleToasts: 1,
        })
        stores.push(firstStore)
        const secondStore = createTestStore()

        const firstId = firstStore.toast.info('Erster Root')
        const secondId = secondStore.toast.warning('Zweiter Root', {
            duration: 0,
        })

        expect(firstStore.getToastDefaults()).toEqual({
            duration: 1111,
            maxVisibleToasts: 1,
        })
        expect(secondStore.getToastDefaults()).toEqual({
            duration: 6000,
            maxVisibleToasts: 3,
        })
        expect(firstStore.getToastSnapshot()).toEqual([
            expect.objectContaining({ id: firstId, content: 'Erster Root' }),
        ])
        expect(secondStore.getToastSnapshot()).toEqual([
            expect.objectContaining({ id: secondId, content: 'Zweiter Root' }),
        ])

        firstStore.toast.dismiss(secondId)
        firstStore.toast.dismissAll()

        expect(firstStore.getToastSnapshot()).toEqual([])
        expect(secondStore.getToastSnapshot()).toEqual([
            expect.objectContaining({ id: secondId }),
        ])
    })

    test('renders only the provider store and exposes its api through useToast', () => {
        const scopedStore = createTestStore()
        const globalId = toast.info('Globaler Toast', { duration: 0 })
        const scopedId = scopedStore.toast.success('Scoped Toast', {
            duration: 0,
        })
        function ScopedApiProbe() {
            const scopedApi = useToast()

            return createElement('span', {
                'data-scoped-api':
                    scopedApi === scopedStore.toast ? 'true' : 'false',
            })
        }

        const markup = renderToStaticMarkup(
            createElement(
                ToastProvider,
                { store: scopedStore, position: 'bottom-right' },
                createElement(ScopedApiProbe),
            ),
        )

        expect(markup).toContain('Scoped Toast')
        expect(markup).not.toContain('Globaler Toast')
        expect(markup).toContain('data-scoped-api="true"')

        scopedStore.toast.info('Nur im Scope', { duration: 0 })

        expect(scopedStore.getToastSnapshot().map(({ id }) => id)).toContain(
            scopedId,
        )
        expect(scopedStore.getToastSnapshot()).toHaveLength(2)
        expect(toast.update(globalId, { content: 'Global aktualisiert' })).toBe(
            true,
        )
    })

    test('keeps promise loading and settlement in the scoped store', async () => {
        const scopedStore = createTestStore()
        const resultPromise = scopedStore.toast.promise(
            Promise.resolve({ count: 2 }),
            {
                loading: 'Scoped wird geladen',
                success: ({ count }) => ({
                    content: `${count} scoped Einträge geladen`,
                    duration: 0,
                }),
                error: 'Scoped fehlgeschlagen',
            },
        )

        expect(scopedStore.getToastSnapshot()).toEqual([
            expect.objectContaining({
                content: 'Scoped wird geladen',
                type: 'info',
            }),
        ])

        await expect(resultPromise).resolves.toEqual({ count: 2 })
        expect(scopedStore.getToastSnapshot()).toEqual([
            expect.objectContaining({
                content: '2 scoped Einträge geladen',
                type: 'success',
            }),
        ])
        expect(getToastSnapshot()).toEqual([])
    })

    test('keeps timer and pause state local to each store', () => {
        const scheduledCallbacks: Array<() => void> = []
        const setTimeoutSpy = spyOn(
            globalThis,
            'setTimeout',
        ).mockImplementation(((handler: TimerHandler) => {
            if (typeof handler !== 'function') {
                throw new TypeError('Timer handler must be a function')
            }

            scheduledCallbacks.push(() => handler())

            return scheduledCallbacks.length
        }) as typeof globalThis.setTimeout)
        const clearTimeoutSpy = spyOn(
            globalThis,
            'clearTimeout',
        ).mockImplementation(() => undefined)
        const firstStore = createTestStore()
        const secondStore = createTestStore()

        try {
            const firstId = firstStore.toast.info('Pausiert', { duration: 20 })
            secondStore.toast.info('Läuft', { duration: 20 })

            firstStore.setToastPauseReason(firstId, 'hover', true)
            scheduledCallbacks[0]?.()
            scheduledCallbacks[1]?.()

            expect(firstStore.getToastSnapshot()).toEqual([
                expect.objectContaining({ id: firstId }),
            ])
            expect(secondStore.getToastSnapshot()).toEqual([])

            firstStore.setToastPauseReason(firstId, 'hover', false)
            scheduledCallbacks[2]?.()

            expect(firstStore.getToastSnapshot()).toEqual([])
            expect(clearTimeoutSpy).toHaveBeenCalled()
        } finally {
            setTimeoutSpy.mockRestore()
            clearTimeoutSpy.mockRestore()
        }
    })
})
