import { expect, test } from 'bun:test'
import { createToastStore } from '../../../lib/ToastStore/toastApi.ts'
import {
    createToastErrorAdapter,
    resolveToastError,
} from '../../../lib/ToastError/toastError.ts'

test('normalizes readable errors and falls back for empty, unknown and failed mappers', () => {
    expect(
        resolveToastError(new Error('Übertragung fehlgeschlagen')).content,
    ).toBe('Übertragung fehlgeschlagen')
    expect(resolveToastError('Nachricht').content).toBe('Nachricht')
    expect(resolveToastError({ message: 'Serverfehler' }).content).toBe(
        'Serverfehler',
    )
    for (const value of [null, undefined, {}, 0, { message: '' }, '  ']) {
        expect(
            resolveToastError(value, {
                fallbackMessage: 'Bitte erneut versuchen.',
            }),
        ).toEqual({ content: 'Bitte erneut versuchen.' })
    }
    expect(
        resolveToastError(null, {
            normalize: () => {
                throw new Error('Mapper failure')
            },
            fallbackMessage: 'Fallback',
        }),
    ).toEqual({ content: 'Fallback' })
})

test('adapts domain errors with a scoped API, dedupe and explicit per-call overrides', () => {
    const store = createToastStore()
    try {
        const reportError = createToastErrorAdapter({
            api: store.toast,
            dedupeKey: (_error, content) => content,
            normalize: (error) => ({
                content: String((error as { code: number }).code),
                title: 'API',
                duration: 0,
            }),
        })
        const first = reportError({ code: 403 }, { title: 'Kein Zugriff' })
        expect(reportError({ code: 403 })).toBe(first)
        expect(store.getToastSnapshot()).toEqual([
            expect.objectContaining({
                id: first,
                content: '403',
                title: 'Kein Zugriff',
                duration: 0,
                type: 'error',
            }),
        ])
        expect(reportError({ code: 403 }, { dedupeWindow: 0 })).not.toBe(first)
    } finally {
        store.dispose()
    }
})
