import {
    createToastStore,
    ToastProvider,
    ToastFocusScopeBranch,
    useToast,
} from '@rentnerkev/toasts'
import {
    useCallback,
    useMemo,
    useEffect,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react'
import { createPortal, flushSync } from 'react-dom'
import type { ToastClassNames, ToastCustomDesign } from '@rentnerkev/toasts'

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

type Mutation = 'messages' | 'design' | 'slots' | 'empty' | 'getters'
let applyMutation: (mutation: Mutation, updateStore: boolean) => void

function PresentationMutationProbe() {
    const [core] = useState(() => {
        const store = createToastStore({ defaultDuration: 0 })
        store.toast.info('Mutable survivor', { title: 'Survivor' })
        store.toast.error('Error survivor', { title: 'Error title' })
        const sibling = store.toast.info('Changed sibling')
        const designParent = { infoWrapper: 'before-inherited-wrapper' }
        const customDesign: ToastCustomDesign = Object.create(designParent)
        Object.defineProperty(customDesign, 'titleText', {
            value: 'before-title',
            writable: true,
            configurable: true,
        })
        const slotParent = { content: 'before-inherited-content' }
        const classNames: ToastClassNames = Object.create(slotParent)
        Object.defineProperty(classNames, 'closeIcon', {
            value: 'before-close-icon',
            writable: true,
            configurable: true,
        })
        const messages = {
            regionLabel: 'Before region',
            closeNotification: 'Before dismiss',
            copyError: 'Before copy',
            errorCopied: 'Before copied',
        }
        return {
            store,
            sibling,
            designParent,
            customDesign,
            slotParent,
            classNames,
            messages,
        }
    })
    useEffect(() => {
        let updates = 0
        applyMutation = (mutation, updateStore) => {
            if (mutation === 'messages') {
                core.messages.regionLabel = 'After region'
                core.messages.closeNotification = 'After dismiss'
                core.messages.copyError = 'After copy'
                core.messages.errorCopied = 'After copied'
            }
            if (mutation === 'design') {
                core.designParent.infoWrapper = 'after-inherited-wrapper'
                core.customDesign.titleText = 'after-title'
            }
            if (mutation === 'slots') {
                core.slotParent.content = 'after-inherited-content'
                core.classNames.closeIcon = 'after-close-icon'
            }
            if (mutation === 'empty') {
                core.messages.closeNotification = ''
                core.messages.copyError = ''
                core.designParent.infoWrapper = ''
                core.customDesign.titleText = ''
                core.slotParent.content = ''
                core.classNames.closeIcon = ''
                core.classNames.root = ''
            }
            if (mutation === 'getters') {
                Object.defineProperty(core.customDesign, 'infoWrapper', {
                    configurable: true,
                    get: () => core.designParent.infoWrapper,
                })
                // An unused status getter must not be eagerly evaluated by the surface.
                Object.defineProperty(core.customDesign, 'warningWrapper', {
                    configurable: true,
                    get: () => {
                        throw new Error('unused warning getter')
                    },
                })
                Object.defineProperty(core.classNames, 'content', {
                    configurable: true,
                    get: () => core.slotParent.content,
                })
            }
            if (updateStore)
                core.store.toast.update(core.sibling, {
                    content: `Changed sibling ${++updates}`,
                })
        }
        window.toastPresentationProbe = {
            mutate: (mutation, updateStore = true) =>
                flushSync(() => applyMutation(mutation, updateStore)),
        }
        return () => {
            delete window.toastPresentationProbe
            core.store.dispose()
        }
    }, [core])
    return (
        <section data-testid="presentation-probe">
            <ToastProvider
                store={core.store}
                locale="en"
                customDesign={core.customDesign}
                classNames={core.classNames}
                messages={core.messages}
            >
                {null}
            </ToastProvider>
        </section>
    )
}

declare global {
    interface Window {
        toastPresentationProbe?: {
            mutate: (mutation: Mutation, updateStore?: boolean) => void
        }
        toastOptimizationProbe?: {
            resetMetrics: () => void
            readMetrics: () => {
                defaultsReads: number
                contentReads: number
                neighborReads: number
                removalVersion: number
            }
            update: (index: number, content: string) => void
            replacePresentation: () => void
        }
    }
}

function ToastOptimizationProbe() {
    const [core] = useState(() => {
        const store = createToastStore({
            defaultDuration: 0,
            maxVisibleToasts: 10,
        })
        const ids = Array.from({ length: 10 }, (_, index) =>
            store.toast.info(`Probe ${index}`),
        )
        return { store, ids }
    })
    const metrics = useRef({
        defaultsReads: 0,
        contentReads: 0,
        neighborReads: 0,
        removalVersion: -1,
    })
    const [version, setVersion] = useState(0)
    const facade = useMemo(() => {
        type ProbeToast = ReturnType<typeof core.store.getToastSnapshot>[number]
        const views = new WeakMap<ProbeToast, ProbeToast>()
        const cache: {
            previous?: readonly ProbeToast[]
            snapshot?: readonly ProbeToast[]
        } = {}
        function snapshotReader() {
            const current = core.store.getToastSnapshot()
            if (current !== cache.previous) {
                cache.previous = current
                cache.snapshot = Object.freeze(
                    current.map((toast) => {
                        let view = views.get(toast)
                        if (!view) {
                            view = new Proxy(toast, {
                                get(target, property, receiver) {
                                    if (property === 'content') {
                                        metrics.current.contentReads++
                                        if (target.id !== core.ids[0])
                                            metrics.current.neighborReads++
                                    }
                                    return Reflect.get(
                                        target,
                                        property,
                                        receiver,
                                    )
                                },
                            })
                            views.set(toast, view)
                        }
                        return view
                    }),
                )
            }
            return cache.snapshot!
        }
        return {
            ...core.store,
            getToastSnapshot: snapshotReader,
            getToastDefaults() {
                metrics.current.defaultsReads++
                return core.store.getToastDefaults()
            },
            removeToast(id: string) {
                metrics.current.removalVersion = version
                core.store.removeToast(id)
            },
        }
    }, [core, version])
    const design = useMemo(
        () => ({ infoWrapper: version ? 'bg-red-950' : 'bg-blue-950' }),
        [version],
    )
    const messages = useMemo(
        () =>
            version
                ? { closeNotification: 'Dismiss updated probe' }
                : undefined,
        [version],
    )
    useEffect(() => {
        window.toastOptimizationProbe = {
            resetMetrics() {
                metrics.current.defaultsReads = 0
                metrics.current.contentReads = 0
                metrics.current.neighborReads = 0
            },
            readMetrics() {
                return { ...metrics.current }
            },
            update(index, content) {
                flushSync(() =>
                    core.store.toast.update(core.ids[index], { content }),
                )
            },
            replacePresentation() {
                setVersion(1)
            },
        }
        return () => {
            delete window.toastOptimizationProbe
        }
    }, [core])
    useEffect(() => () => core.store.dispose(), [core])
    return (
        <section
            aria-label="Optimization probe"
            data-testid="optimization-probe"
            data-version={version}
        >
            <ToastProvider
                store={facade}
                locale={version ? 'de' : 'en'}
                messages={messages}
                customDesign={design}
                position="top-left"
            >
                {null}
            </ToastProvider>
        </section>
    )
}

function subscribeProbeMode() {
    return () => {}
}
function getProbeMode() {
    return new URLSearchParams(window.location.search).has('optimization-probe')
}
function getServerProbeMode() {
    return false
}
function getPresentationProbeMode() {
    return new URLSearchParams(window.location.search).has(
        'presentation-mutations',
    )
}

export function App() {
    const presentationProbeEnabled = useSyncExternalStore(
        subscribeProbeMode,
        getPresentationProbeMode,
        getServerProbeMode,
    )
    const probeEnabled = useSyncExternalStore(
        subscribeProbeMode,
        getProbeMode,
        getServerProbeMode,
    )
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
            {probeEnabled && <ToastOptimizationProbe />}
            {presentationProbeEnabled && <PresentationMutationProbe />}
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
