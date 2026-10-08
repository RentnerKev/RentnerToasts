import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { LazyToastProvider } from '../../../shared/Toast/Components/LazyToastProvider.tsx'
import { ToastProvider } from '../../../shared/Toast/Components/ToastProvider.tsx'
import { createToastStore } from '../../../lib/ToastStore/toastApi.ts'

test('renders empty lazy providers during SSR without a Suspense boundary', () => {
    const store = createToastStore()
    try {
        expect(
            renderToStaticMarkup(
                <LazyToastProvider store={store}>
                    <p>Application</p>
                </LazyToastProvider>,
            ),
        ).toBe('<p>Application</p>')
    } finally {
        store.dispose()
    }
})

test('renders queued notifications immediately in a localized SSR fallback', () => {
    const store = createToastStore({ maxVisibleToasts: 2 })
    try {
        store.toast.info('Queued older notification', { duration: 0 })
        store.toast.success('<safe content>', {
            title: 'Success title',
            duration: 0,
        })
        store.toast.error('Error notification', { duration: 0 })
        const markup = renderToStaticMarkup(
            <LazyToastProvider
                store={store}
                locale="en"
                messages={{ closeNotification: 'Dismiss locally' }}
            >
                <p>Application</p>
            </LazyToastProvider>,
        )
        expect(markup).toContain('data-toast-fallback')
        expect(markup).toContain('aria-label="Notifications"')
        expect(markup).toContain('aria-label="Dismiss locally"')
        expect(markup).toContain('role="status"')
        expect(markup).toContain('role="alert"')
        expect(markup).toContain('Success title')
        expect(markup).toContain('&lt;safe content&gt;')
        expect(markup).not.toContain('Queued older notification')
        expect(store.getToastSnapshot()).toHaveLength(3)
    } finally {
        store.dispose()
    }
})

test('retains the synchronous provider surface during SSR', () => {
    const store = createToastStore()
    try {
        store.toast.warning('Synchronous notification', { duration: 0 })
        const markup = renderToStaticMarkup(
            <ToastProvider store={store}>
                <p>Application</p>
            </ToastProvider>,
        )
        expect(markup).toContain('Synchronous notification')
        expect(markup).not.toContain('data-toast-fallback')
    } finally {
        store.dispose()
    }
})
