import { createToastStore, ToastProvider, useToast } from '@rentnerkev/toasts'
import { useEffect, useState, useSyncExternalStore } from 'react'

function Defaults({ store }: { store: ReturnType<typeof createToastStore> }) {
    const defaults = useSyncExternalStore(
        store.subscribeToToasts,
        store.getToastDefaults,
        store.getToastDefaults,
    )
    return <span data-testid="shared-duration">{defaults.duration}</span>
}

function Controls() {
    const toast = useToast()
    return (
        <button
            type="button"
            className="px-4 py-2"
            onClick={() => toast.info('Consumer notification', { duration: 0 })}
        >
            Show toast
        </button>
    )
}

export function App() {
    const [store] = useState(() => createToastStore())
    const [storeFacade, setStoreFacade] = useState(store)
    const [sharedStore] = useState(() =>
        createToastStore({ defaultDuration: 1000 }),
    )
    const [className, setClassName] = useState('')
    const [showProvider, setShowProvider] = useState(true)
    const [showShared, setShowShared] = useState(false)
    const [showEarlier, setShowEarlier] = useState(true)
    const [showLater, setShowLater] = useState(true)
    const [earlierDuration, setEarlierDuration] = useState(2000)
    useEffect(
        () => () => {
            store.dispose()
            sharedStore.dispose()
        },
        [sharedStore, store],
    )
    return (
        <>
            <label htmlFor="toast-style">Toast style</label>
            <select
                id="toast-style"
                value={className}
                onChange={(event) => setClassName(event.target.value)}
            >
                <option value="">Default</option>
                <option value="px-8">Horizontal padding</option>
                <option value="py-8">Vertical padding</option>
                <option value="hover:p-8">Hover padding</option>
                <option value="sm:w-96">Responsive width</option>
            </select>
            <button
                type="button"
                onClick={() =>
                    store.toast.info('Timed notification', { duration: 1200 })
                }
            >
                Show timed toast
            </button>
            <button
                type="button"
                onClick={() => setShowProvider((visible) => !visible)}
            >
                Toggle toast provider
            </button>
            <button type="button" onClick={() => setStoreFacade({ ...store })}>
                Switch store facade
            </button>
            {showProvider && (
                <ToastProvider
                    store={storeFacade}
                    position="bottom-left"
                    locale="en"
                    className={className}
                >
                    <Controls />
                </ToastProvider>
            )}
            <button type="button" onClick={() => setShowShared(true)}>
                Mount shared providers
            </button>
            <button type="button" onClick={() => setEarlierDuration(3000)}>
                Update earlier defaults
            </button>
            <button type="button" onClick={() => setShowEarlier(false)}>
                Remove earlier provider
            </button>
            <button type="button" onClick={() => setShowLater(false)}>
                Remove later provider
            </button>
            <button
                type="button"
                onClick={() =>
                    sharedStore.toast.info('Shared timed notification', {
                        duration: 1200,
                    })
                }
            >
                Show shared timed toast
            </button>
            <Defaults store={sharedStore} />
            {showShared && (
                <>
                    {showEarlier && (
                        <section aria-label="Earlier display">
                            <ToastProvider
                                store={sharedStore}
                                locale="en"
                                position="top-left"
                                defaultDuration={earlierDuration}
                            >
                                <span>Earlier provider</span>
                            </ToastProvider>
                        </section>
                    )}
                    {showLater && (
                        <section aria-label="Later display">
                            <ToastProvider
                                store={sharedStore}
                                locale="en"
                                position="top-right"
                                defaultDuration={7000}
                            >
                                <span>Later provider</span>
                            </ToastProvider>
                        </section>
                    )}
                </>
            )}
        </>
    )
}
