import { ToastProvider } from '../../src/index.ts'

export function NotificationShell() {
    return (
        <ToastProvider>
            <main>Application content</main>
        </ToastProvider>
    )
}
