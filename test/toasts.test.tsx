import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as publicApi from '../src/index'
import { Toast } from '../src/Components/Toast'
import {
    clearAllToasts,
    customToast,
    getToastSnapshot,
    removeToast,
} from '../src/Hooks/useToastLogic'
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
            'customToast',
            'removeToast',
        ])
    })

    test('adds and removes a toast through the public API', () => {
        const id = publicApi.customToast('Alles gut', 'Erfolg', 'success')

        expect(getToastSnapshot()).toEqual([
            expect.objectContaining({
                id,
                content: 'Alles gut',
                title: 'Erfolg',
                type: 'success',
            }),
        ])

        publicApi.removeToast(id)

        expect(getToastSnapshot()).toEqual([])
    })

    test('supports multiple toasts and removes them independently', () => {
        const firstId = customToast('Erster Toast', undefined, 'info', 0)
        const secondId = customToast('Zweiter Toast', undefined, 'warning', 0)

        expect(getToastSnapshot()).toHaveLength(2)

        removeToast(firstId)
        removeToast(firstId)

        expect(getToastSnapshot().map((toast) => toast.id)).toEqual([secondId])
    })

    test('auto-dismisses a toast and clears its timer on manual removal', async () => {
        const autoDismissId = customToast(
            'Verschwindet automatisch',
            undefined,
            'info',
            20,
        )

        await wait(50)

        expect(
            getToastSnapshot().some((toast) => toast.id === autoDismissId),
        ).toBe(false)

        const clearTimeoutSpy = spyOn(globalThis, 'clearTimeout')
        const manualRemoveId = customToast(
            'Wird manuell entfernt',
            undefined,
            'info',
            100,
        )

        removeToast(manualRemoveId)

        expect(clearTimeoutSpy).toHaveBeenCalledTimes(1)
        clearTimeoutSpy.mockRestore()
    })

    test('normalizes unsafe duration values', () => {
        const defaultId = customToast('Standard')
        const persistentId = customToast('Persistent', undefined, 'info', 0)
        const negativeId = customToast('Negativ', undefined, 'info', -1)
        const nanId = customToast('NaN', undefined, 'info', Number.NaN)
        const infinityId = customToast(
            'Infinity',
            undefined,
            'info',
            Number.POSITIVE_INFINITY,
        )
        const shortId = customToast('Sehr kurz', undefined, 'info', 0.1)
        const longId = customToast(
            'Sehr lang',
            undefined,
            'info',
            Number.MAX_SAFE_INTEGER,
        )
        const toasts = getToastSnapshot()

        expect(toasts.find((toast) => toast.id === defaultId)?.duration).toBe(
            6000,
        )
        expect(
            toasts.find((toast) => toast.id === persistentId)?.duration,
        ).toBe(0)
        expect(toasts.find((toast) => toast.id === negativeId)?.duration).toBe(
            6000,
        )
        expect(toasts.find((toast) => toast.id === nanId)?.duration).toBe(6000)
        expect(toasts.find((toast) => toast.id === infinityId)?.duration).toBe(
            6000,
        )
        expect(toasts.find((toast) => toast.id === shortId)?.duration).toBe(1)
        expect(toasts.find((toast) => toast.id === longId)?.duration).toBe(
            MAX_TOAST_DURATION,
        )
    })

    test('renders status and error toasts as meaningful live regions', () => {
        customToast('Eine Information', 'Info', 'info', 0)

        const statusMarkup = renderToStaticMarkup(
            createElement(Toast, { position: 'bottom-right' }),
        )

        expect(statusMarkup).toContain('role="status"')
        expect(statusMarkup).toContain('aria-live="polite"')
        expect(statusMarkup).toContain(
            'aria-label="Benachrichtigung schließen"',
        )

        clearAllToasts()
        customToast('Ein Fehler', 'Fehler', 'error', 0)

        const alertMarkup = renderToStaticMarkup(
            createElement(Toast, { position: 'bottom-right' }),
        )

        expect(alertMarkup).toContain('role="alert"')
        expect(alertMarkup).toContain('aria-live="assertive"')
        expect(alertMarkup).toContain('aria-label="Fehlermeldung kopieren"')
    })

    test('does not turn unsafe link schemes into anchors', () => {
        customToast(
            'Unsicher: [Link](javascript:alert(1))',
            undefined,
            'warning',
            0,
        )

        const markup = renderToStaticMarkup(
            createElement(Toast, { position: 'bottom-right' }),
        )

        expect(markup).not.toContain('href="javascript:alert(1)"')
        expect(markup).toContain('Unsicher: [Link](javascript:alert(1))')
    })
})
