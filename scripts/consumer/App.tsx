import {
    createToastStore,
    ToastProvider,
    ToastFocusScopeBranch,
    useToast,
} from '@rentnerkev/toasts'
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react'
import { createPortal } from 'react-dom'

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
        <>
            <button
                type="button"
                className="px-4 py-2"
                onClick={() =>
                    toast.info('Consumer notification', { duration: 0 })
                }
            >
                Show toast
            </button>
            <button
                type="button"
                onClick={() =>
                    toast.error('Consumer error details', {
                        title: 'Consumer error',
                        duration: 0,
                    })
                }
            >
                Show error toast
            </button>
        </>
    )
}

function ShadowScopeBranch() {
    const [target, setTarget] = useState<ShadowRoot | null>(null)
    const setHost = useCallback((element: HTMLDivElement | null) => {
        setTarget(
            element
                ? (element.shadowRoot ?? element.attachShadow({ mode: 'open' }))
                : null,
        )
    }, [])
    return (
        <>
            <div ref={setHost} data-testid="shadow-toast-scope" />
            {target && createPortal(<ToastFocusScopeBranch />, target)}
        </>
    )
}

function NativeScopeFixture() {
    const [store] = useState(() => createToastStore())
    const [other] = useState(() => createToastStore())
    const [custom] = useState(() => createToastStore())
    const [customTarget, setCustomTarget] = useState<HTMLDivElement | null>(
        null,
    )
    const [branchMounted, setBranchMounted] = useState(true)
    const outer = useRef<HTMLDialogElement>(null)
    const inner = useRef<HTMLDialogElement>(null)
    useEffect(
        () => () => {
            store.dispose()
            other.dispose()
            custom.dispose()
        },
        [store, other, custom],
    )
    const notify = () => {
        if (store.getToastSnapshot().length === 0)
            store.toast.info('Scoped native notification', { duration: 0 })
    }
    return (
        <>
            <button
                type="button"
                onClick={() => {
                    outer.current?.showModal()
                    notify()
                    custom.toast.info('Explicit container notification', {
                        duration: 0,
                    })
                    other.toast.info('Other store notification', {
                        duration: 0,
                    })
                }}
            >
                Open native scope
            </button>
            <div ref={setCustomTarget} data-testid="explicit-toast-container" />
            <ToastProvider store={other} locale="en">
                {null}
            </ToastProvider>
            <ToastProvider store={store} locale="en" portalContainer="body">
                <dialog ref={outer} aria-label="Native outer scope">
                    {branchMounted && <ShadowScopeBranch />}
                    <ToastProvider
                        store={custom}
                        locale="en"
                        portalContainer={customTarget}
                    >
                        <ToastFocusScopeBranch />
                    </ToastProvider>
                    <button
                        type="button"
                        onClick={() => inner.current?.showModal()}
                    >
                        Open nested scope
                    </button>
                    <button
                        type="button"
                        onClick={() => outer.current?.close()}
                    >
                        Close native scope
                    </button>
                    <button
                        type="button"
                        onClick={() => setBranchMounted(false)}
                    >
                        Remove native branch
                    </button>
                    <dialog ref={inner} aria-label="Native inner scope">
                        <ToastFocusScopeBranch />
                        <button
                            type="button"
                            onClick={() => inner.current?.close()}
                        >
                            Close nested scope
                        </button>
                    </dialog>
                </dialog>
            </ToastProvider>
        </>
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
            <NativeScopeFixture />
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
