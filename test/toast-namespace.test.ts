import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'
import { toast } from '../src/toast'
import { clearAllToasts, getToastSnapshot } from '../src/toastStore'

describe('toast namespace', () => {
    beforeEach(() => {
        clearAllToasts()
    })

    afterEach(() => {
        clearAllToasts()
    })

    test('creates every status through named shortcuts', () => {
        const successId = toast.success('Gespeichert', {
            title: 'Erfolg',
            duration: 0,
        })
        const errorId = toast.error('Fehlgeschlagen', { duration: 0 })
        const infoId = toast.info('Zur Information', { duration: 0 })
        const warningId = toast.warning('Bitte prüfen', { duration: 0 })

        expect(getToastSnapshot()).toEqual([
            expect.objectContaining({
                id: successId,
                content: 'Gespeichert',
                title: 'Erfolg',
                type: 'success',
                duration: 0,
            }),
            expect.objectContaining({ id: errorId, type: 'error' }),
            expect.objectContaining({ id: infoId, type: 'info' }),
            expect.objectContaining({ id: warningId, type: 'warning' }),
        ])
    })

    test('dismisses one toast or all toasts without leaving active timers', () => {
        const clearTimeoutSpy = spyOn(globalThis, 'clearTimeout')
        const ids = [
            toast.info('Eins', { duration: 1000 }),
            toast.info('Zwei', { duration: 1000 }),
            toast.info('Drei', { duration: 1000 }),
            toast.info('Vier', { duration: 1000 }),
        ]

        toast.dismiss(ids[0])
        toast.dismiss(ids[0])

        expect(getToastSnapshot().map(({ id }) => id)).toEqual(ids.slice(1))

        toast.dismissAll()
        toast.dismissAll()

        expect(getToastSnapshot()).toEqual([])
        expect(clearTimeoutSpy).toHaveBeenCalledTimes(4)
        clearTimeoutSpy.mockRestore()
    })

    test('updates a toast in place and can remove its title', () => {
        const firstId = toast.info('Wird aktualisiert', {
            title: 'Alt',
            duration: 0,
        })
        const secondId = toast.warning('Bleibt unverändert', { duration: 0 })

        expect(
            toast.update(firstId, {
                content: 'Ist aktualisiert',
                title: null,
                type: 'success',
                duration: 0,
            }),
        ).toBe(true)
        expect(toast.update('unbekannt', { content: 'Ignoriert' })).toBe(false)
        expect(getToastSnapshot()).toEqual([
            expect.objectContaining({
                id: firstId,
                content: 'Ist aktualisiert',
                title: undefined,
                type: 'success',
                duration: 0,
            }),
            expect.objectContaining({
                id: secondId,
                content: 'Bleibt unverändert',
            }),
        ])
    })

    test('ignores a stale auto-dismiss callback after an update', () => {
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

        try {
            const id = toast.info('Noch sichtbar', { duration: 25 })

            toast.update(id, { duration: 100 })

            scheduledCallbacks[0]?.()
            expect(
                getToastSnapshot().some((current) => current.id === id),
            ).toBe(true)

            scheduledCallbacks[1]?.()
            expect(
                getToastSnapshot().some((current) => current.id === id),
            ).toBe(false)
            expect(clearTimeoutSpy).toHaveBeenCalledTimes(1)
        } finally {
            setTimeoutSpy.mockRestore()
            clearTimeoutSpy.mockRestore()
        }
    })

    test('updates a promise toast on success and preserves the result', async () => {
        const resultPromise = toast.promise(
            () => Promise.resolve({ count: 3 }),
            {
                loading: { content: 'Wird gespeichert', title: 'Bitte warten' },
                success: ({ count }) => ({
                    content: `${count} Einträge gespeichert`,
                    title: 'Fertig',
                    duration: 0,
                }),
                error: 'Speichern fehlgeschlagen',
            },
        )
        const loadingToast = getToastSnapshot()[0]

        expect(loadingToast).toEqual(
            expect.objectContaining({
                content: 'Wird gespeichert',
                title: 'Bitte warten',
                type: 'info',
                duration: 0,
            }),
        )

        await expect(resultPromise).resolves.toEqual({ count: 3 })
        expect(getToastSnapshot()).toEqual([
            expect.objectContaining({
                id: loadingToast.id,
                content: '3 Einträge gespeichert',
                title: 'Fertig',
                type: 'success',
                duration: 0,
            }),
        ])
    })

    test('updates a promise toast on failure and preserves the reason', async () => {
        const reason = new Error('Netzwerkfehler')
        const resultPromise = toast.promise(Promise.reject(reason), {
            loading: 'Wird geladen',
            success: 'Geladen',
            error: (error) => ({
                content:
                    error instanceof Error
                        ? error.message
                        : 'Unbekannter Fehler',
                title: 'Fehler',
                duration: 0,
            }),
        })
        const loadingId = getToastSnapshot()[0].id
        let receivedReason: unknown

        try {
            await resultPromise
        } catch (error) {
            receivedReason = error
        }

        expect(receivedReason).toBe(reason)
        expect(getToastSnapshot()).toEqual([
            expect.objectContaining({
                id: loadingId,
                content: 'Netzwerkfehler',
                title: 'Fehler',
                type: 'error',
                duration: 0,
            }),
        ])
    })

    test('does not restore a dismissed promise toast', async () => {
        let resolvePromise: ((value: string) => void) | undefined
        const pendingPromise = new Promise<string>((resolve) => {
            resolvePromise = resolve
        })
        const resultPromise = toast.promise(pendingPromise, {
            loading: 'Wird verarbeitet',
            success: 'Verarbeitet',
            error: 'Fehlgeschlagen',
            duration: 0,
        })
        const id = getToastSnapshot()[0].id

        toast.dismiss(id)
        resolvePromise?.('Ergebnis')

        await expect(resultPromise).resolves.toBe('Ergebnis')
        expect(getToastSnapshot()).toEqual([])
    })
})
