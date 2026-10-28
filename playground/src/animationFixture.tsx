import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createToastStore, ToastProvider } from '../../src/index.ts'
import type { ToastPosition } from '../../src/index.ts'
// oxlint-disable-next-line import/no-unassigned-import -- Browser fixture uses the playground's real Tailwind build.
import './index.css'

const position = new URLSearchParams(location.search).get('position')
const positions: ToastPosition[] = [
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
]
const store = createToastStore({ defaultDuration: 0, maxVisibleToasts: 5 })

function Fixture() {
    const [portal, setPortal] = useState(false)
    return (
        <ToastProvider
            store={store}
            position={positions.find((value) => value === position)}
            portalContainer={portal ? 'body' : undefined}
        >
            <main
                style={{
                    position: 'absolute',
                    top: '40%',
                    left: '40%',
                    display: 'flex',
                    gap: 16,
                }}
            >
                <button onClick={() => store.toast.info('First sticky toast')}>
                    First
                </button>
                <button onClick={() => store.toast.info('Second sticky toast')}>
                    Second
                </button>
                <button
                    onClick={() =>
                        store.toast.info('Timed toast', { duration: 3000 })
                    }
                >
                    Timed
                </button>
                <button
                    onClick={() =>
                        store.toast.error(
                            'Error with [a link](https://example.com/toast)',
                        )
                    }
                >
                    Error
                </button>
                <button onClick={store.toast.dismissAll}>Dismiss all</button>
                <button onClick={() => setPortal((value) => !value)}>
                    Switch portal
                </button>
            </main>
        </ToastProvider>
    )
}

const root = createRoot(document.getElementById('root')!)
root.render(
    <StrictMode>
        <Fixture />
    </StrictMode>,
)

import.meta.hot?.dispose(() => {
    root.unmount()
    store.dispose()
})
