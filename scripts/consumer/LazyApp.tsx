import { useEffect, useState } from 'react'
import { LazyToastProvider, useToast } from '@rentnerkev/toasts/lazy-provider'
import { createToastStore } from '@rentnerkev/toasts/toast'

function LazyControls() {
    const toast = useToast()
    return (
        <>
            <button
                type="button"
                onClick={() =>
                    toast.info('Lazy notification', {
                        title: 'Lazy title',
                        duration: 0,
                    })
                }
            >
                Show lazy toast
            </button>
            <button
                type="button"
                onClick={() => toast.error('Lazy error', { duration: 0 })}
            >
                Show lazy error
            </button>
            <button
                type="button"
                onClick={() =>
                    toast.info('Timed lazy notification', { duration: 1200 })
                }
            >
                Show timed lazy toast
            </button>
            <button type="button" onClick={() => toast.dismissAll()}>
                Clear lazy notifications
            </button>
        </>
    )
}

export function LazyApp() {
    const [store] = useState(() => createToastStore())
    useEffect(() => () => store.dispose(), [store])
    return (
        <main>
            <h1>Lazy packaged consumer</h1>
            <LazyToastProvider store={store} locale="en">
                <LazyControls />
            </LazyToastProvider>
        </main>
    )
}
