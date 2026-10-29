/* eslint-disable jsx-a11y/prefer-tag-over-role -- Deliberately measure bridge hosts without browser-native dialog focus behavior. */
import { createRoot } from 'react-dom/client'
import { ToastProvider, createToastStore } from '../../src/index.ts'
import { ToastFocusScopeBranch } from '../../src/radix.ts'

const hosts = Number(new URLSearchParams(location.search).get('hosts')) || 1
const store = createToastStore()
for (let index = 0; index < 3; index++) {
    store.toast.info(`Persistent benchmark toast ${index + 1}`, {
        duration: 0,
    })
}

createRoot(document.getElementById('root')!).render(
    <ToastProvider store={store} portalContainer="body">
        {Array.from({ length: hosts }, (_, index) => (
            <div
                role="dialog"
                aria-label={`Bridge host ${index + 1}`}
                key={index}
            >
                <ToastFocusScopeBranch />
            </div>
        ))}
    </ToastProvider>,
)
