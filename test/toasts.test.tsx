import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as publicApi from '../src/index'
import { Toast } from '../src/Components/Toast'
import { toast } from '../src/toast'
import {
    clearAllToasts,
    configureToastDefaults,
    getToastSnapshot,
    restoreToastDefaults,
    setToastPauseReason,
} from '../src/toastStore'
import { MAX_TOAST_DURATION } from '../src/Hooks/toastTiming'

function wait(milliseconds: number) {
    return new Promise<void>((resolve) => {
        globalThis.setTimeout(resolve, milliseconds)
    })
}

describe('toast API', () => {
    beforeEach(() => {
        clearAllToasts()
    })

    afterEach(() => {
        clearAllToasts()
    })

    test('exposes only the intended public API', () => {
        expect(Object.keys(publicApi).toSorted()).toEqual([
            'ToastProvider',
            'resolveToastMessages',
            'toast',
            'toastMessageCatalog',
        ])
    })

    test('adds and removes a toast through the public API', () => {
        const id = publicApi.toast.success('Alles gut', { title: 'Erfolg' })

        expect(getToastSnapshot()).toEqual([
            expect.objectContaining({
                id,
                content: 'Alles gut',
                title: 'Erfolg',
                type: 'success',
            }),
        ])

        publicApi.toast.dismiss(id)

        expect(getToastSnapshot()).toEqual([])
    })

    test('supports multiple toasts and removes them independently', () => {
        const firstId = toast.info('Erster Toast', { duration: 0 })
        const secondId = toast.warning('Zweiter Toast', { duration: 0 })

        expect(getToastSnapshot()).toHaveLength(2)

        toast.dismiss(firstId)
        toast.dismiss(firstId)

        expect(getToastSnapshot().map((item) => item.id)).toEqual([secondId])
    })

    test('uses centrally configured defaults for duration and visible timers', () => {
        const beforeConfiguration = getToastSnapshot()
        const previousDefaults = configureToastDefaults({
            duration: 1234,
            maxVisibleToasts: 2,
        })

        try {
            const ids = [
                toast.info('Eins'),
                toast.info('Zwei'),
                toast.info('Drei'),
            ]
            const snapshot = getToastSnapshot()

            expect(snapshot).not.toBe(beforeConfiguration)
            expect(snapshot.map(({ duration }) => duration)).toEqual([
                1234, 1234, 1234,
            ])
            expect(
                snapshot.find(({ id }) => id === ids[0])?.timerStartedAt,
            ).toBeUndefined()
            expect(
                snapshot.find(({ id }) => id === ids[1])?.timerStartedAt,
            ).toBeDefined()
            expect(
                snapshot.find(({ id }) => id === ids[2])?.timerStartedAt,
            ).toBeDefined()
        } finally {
            restoreToastDefaults(previousDefaults)
            clearAllToasts()
        }
    })

    test('auto-dismisses a toast and clears its timer on manual removal', async () => {
        const autoDismissId = toast.info('Verschwindet automatisch', {
            duration: 20,
        })

        await wait(50)

        expect(
            getToastSnapshot().some((item) => item.id === autoDismissId),
        ).toBe(false)

        const clearTimeoutSpy = spyOn(globalThis, 'clearTimeout')
        const manualRemoveId = toast.info('Wird manuell entfernt', {
            duration: 100,
        })

        toast.dismiss(manualRemoveId)

        expect(clearTimeoutSpy).toHaveBeenCalledTimes(1)
        clearTimeoutSpy.mockRestore()
    })

    test('starts a queued toast timer only when it becomes visible', async () => {
        const queuedId = toast.info('Wartet', { duration: 60 })
        const coveringIds = [
            toast.info('Zwei', { duration: 0 }),
            toast.info('Drei', { duration: 0 }),
            toast.info('Vier', { duration: 0 }),
        ]

        await wait(90)
        expect(getToastSnapshot().some(({ id }) => id === queuedId)).toBe(true)
        expect(
            getToastSnapshot().find(({ id }) => id === queuedId)
                ?.timerStartedAt,
        ).toBeUndefined()

        toast.dismiss(coveringIds[0])
        expect(
            getToastSnapshot().find(({ id }) => id === queuedId)
                ?.timerStartedAt,
        ).toBeDefined()

        await wait(90)
        expect(getToastSnapshot().some(({ id }) => id === queuedId)).toBe(false)
    })

    test('pauses expiration until hover and focus have both ended', async () => {
        const id = toast.info('Interaktiv', { duration: 70 })
        await wait(20)

        setToastPauseReason(id, 'hover', true)
        setToastPauseReason(id, 'focus', true)
        const paused = getToastSnapshot().find((current) => current.id === id)
        expect(paused?.timerStartedAt).toBeUndefined()
        expect(paused?.remaining).toBeGreaterThan(0)
        expect(paused?.remaining).toBeLessThan(70)

        await wait(90)
        setToastPauseReason(id, 'hover', false)
        await wait(80)
        expect(getToastSnapshot().some((current) => current.id === id)).toBe(
            true,
        )

        setToastPauseReason(id, 'focus', false)
        await wait(80)
        expect(getToastSnapshot().some((current) => current.id === id)).toBe(
            false,
        )
    })

    test('normalizes unsafe duration values', () => {
        const defaultId = toast.info('Standard')
        const persistentId = toast.info('Persistent', { duration: 0 })
        const negativeId = toast.info('Negativ', { duration: -1 })
        const nanId = toast.info('NaN', { duration: Number.NaN })
        const infinityId = toast.info('Infinity', {
            duration: Number.POSITIVE_INFINITY,
        })
        const shortId = toast.info('Sehr kurz', { duration: 0.1 })
        const longId = toast.info('Sehr lang', {
            duration: Number.MAX_SAFE_INTEGER,
        })
        const toasts = getToastSnapshot()

        expect(toasts.find((item) => item.id === defaultId)?.duration).toBe(
            6000,
        )
        expect(toasts.find((item) => item.id === persistentId)?.duration).toBe(
            0,
        )
        expect(toasts.find((item) => item.id === negativeId)?.duration).toBe(
            6000,
        )
        expect(toasts.find((item) => item.id === nanId)?.duration).toBe(6000)
        expect(toasts.find((item) => item.id === infinityId)?.duration).toBe(
            6000,
        )
        expect(toasts.find((item) => item.id === shortId)?.duration).toBe(1)
        expect(toasts.find((item) => item.id === longId)?.duration).toBe(
            MAX_TOAST_DURATION,
        )
    })

    test('renders status and error toasts as meaningful live regions', () => {
        toast.info('Eine Information', { title: 'Info', duration: 0 })

        const statusMarkup = renderToStaticMarkup(
            createElement(Toast, { position: 'bottom-right' }),
        )

        expect(statusMarkup).toContain('role="status"')
        expect(statusMarkup).toContain('aria-live="polite"')
        expect(statusMarkup).toContain(
            'aria-label="Benachrichtigung schließen"',
        )

        clearAllToasts()
        toast.error('Ein Fehler', { title: 'Fehler', duration: 0 })

        const alertMarkup = renderToStaticMarkup(
            createElement(Toast, { position: 'bottom-right' }),
        )

        expect(alertMarkup).toContain('role="alert"')
        expect(alertMarkup).toContain('aria-live="assertive"')
        expect(alertMarkup).toContain('aria-label="Fehlermeldung kopieren"')
    })

    test('renders English accessibility messages', () => {
        toast.error('An error occurred', { title: 'Error', duration: 0 })

        const markup = renderToStaticMarkup(
            createElement(Toast, {
                position: 'bottom-right',
                locale: 'en',
            }),
        )

        expect(markup).toContain('aria-label="Notifications"')
        expect(markup).toContain('aria-label="Copy error message"')
        expect(markup).toContain('aria-label="Close notification"')
    })

    test('merges message overrides with the selected locale', () => {
        expect(
            publicApi.resolveToastMessages('en', {
                closeNotification: 'Dismiss',
            }),
        ).toEqual({
            regionLabel: 'Notifications',
            closeNotification: 'Dismiss',
            copyError: 'Copy error message',
            errorCopied: 'Error message copied',
        })
    })

    test('does not turn unsafe link schemes into anchors', () => {
        toast.warning('Unsicher: [Link](javascript:alert(1))', {
            duration: 0,
        })

        const markup = renderToStaticMarkup(
            createElement(Toast, { position: 'bottom-right' }),
        )

        expect(markup).not.toContain('href="javascript:alert(1)"')
        expect(markup).toContain('Unsicher: [Link](javascript:alert(1))')
    })
})
