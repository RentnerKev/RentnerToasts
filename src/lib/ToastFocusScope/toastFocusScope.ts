import type { ToastFocusScopeRegistry } from './Types/toast-focus-scope.types.ts'

const registries = new WeakMap<Document, ToastFocusScopeRegistry>()

const OBSERVE_OPTIONS: MutationObserverInit = {
    attributes: true,
    attributeFilter: [
        'open',
        'hidden',
        'inert',
        'aria-hidden',
        'data-state',
        'class',
        'style',
    ],
}

function getRegistry(document: Document) {
    let registry = registries.get(document)
    if (!registry) {
        registry = {
            hosts: new Map(),
            listeners: new Set(),
            target: null,
            observer: null,
            observedNodes: new Set(),
        }
        registries.set(document, registry)
    }
    return registry
}

interface HostInspection {
    available: boolean
    boundary: HTMLElement
    inModal: boolean
}

function inspectHost(
    host: HTMLElement,
    styleCache: Map<HTMLElement, CSSStyleDeclaration | null>,
): HostInspection {
    if (!host.isConnected) {
        return { available: false, boundary: host, inModal: false }
    }
    let boundary: HTMLElement | null = null
    let inModal = false
    // Pass 1: fast attribute-only ancestor scan; also collects dialog boundary and modal status.
    for (let node: HTMLElement | null = host; node; node = node.parentElement) {
        const tag = node.tagName
        if (
            node.hidden ||
            node.inert ||
            node.getAttribute('aria-hidden') === 'true' ||
            node.getAttribute('data-state') === 'closed' ||
            (tag === 'DIALOG' && !node.hasAttribute('open'))
        ) {
            return { available: false, boundary: host, inModal: false }
        }
        if (tag === 'DIALOG') {
            if (!boundary) boundary = node
            if (!inModal && node.matches(':modal')) inModal = true
        } else if (!boundary) {
            const role = node.getAttribute('role')
            if (role === 'dialog' || role === 'alertdialog') boundary = node
        }
    }
    // Pass 2: computed visibility check with per-refresh ancestor memoization.
    const view = host.ownerDocument.defaultView
    if (view) {
        for (
            let node: HTMLElement | null = host;
            node;
            node = node.parentElement
        ) {
            let style = styleCache.get(node)
            if (style === undefined) {
                style = view.getComputedStyle(node)
                styleCache.set(node, style)
            }
            if (
                style &&
                (style.display === 'none' ||
                    style.visibility === 'hidden' ||
                    style.visibility === 'collapse')
            ) {
                return { available: false, boundary: host, inModal: false }
            }
        }
    }
    return { available: true, boundary: boundary ?? host, inModal }
}

export function getToastFocusScopeBoundary(host: HTMLElement) {
    return (
        host.closest<HTMLElement>(
            'dialog,[role="dialog"],[role="alertdialog"]',
        ) ?? host
    )
}

function setTopLayer(host: HTMLElement | null, open: boolean) {
    if (!host?.isConnected || typeof host.showPopover !== 'function') return
    if (open) {
        if (!host.matches(':popover-open')) host.showPopover()
    } else if (host.matches(':popover-open')) {
        host.hidePopover()
    }
}

function refresh(registry: ToastFocusScopeRegistry) {
    const styleCache = new Map<HTMLElement, CSSStyleDeclaration | null>()
    const inspections = new Map<HTMLElement, HostInspection>()
    let activated: HTMLElement[] | null = null
    for (const [host, previouslyAvailable] of registry.hosts) {
        const info = inspectHost(host, styleCache)
        inspections.set(host, info)
        registry.hosts.set(host, info.available)
        if (info.available && !previouslyAvailable) {
            ;(activated ??= []).push(host)
        }
    }
    if (activated) {
        for (let index = 0; index < activated.length; index += 1) {
            const host = activated[index]!
            registry.hosts.delete(host)
            registry.hosts.set(host, true)
        }
    }
    let target: HTMLElement | null = null
    let boundary: HTMLElement | null = null
    let modal = false
    for (const [host, available] of registry.hosts) {
        if (!available) continue
        const info = inspections.get(host)!
        const inModal = info.inModal
        // Native modal dialogs make everything outside their top layer inert.
        if (modal && !inModal) continue
        if (inModal && !modal) {
            target = null
            modal = true
        }
        const candidate = info.boundary
        // Compare dialog boundaries: the layoutless hosts are usually siblings
        // of nested dialogs, so their own containment cannot establish nesting.
        if (
            !target ||
            candidate === boundary ||
            !candidate.contains(boundary)
        ) {
            target = host
            boundary = candidate
        }
    }
    if (target === registry.target) return
    setTopLayer(registry.target, false)
    registry.target = target
    // Keep viewport anchoring even inside transformed or clipped dialog content.
    setTopLayer(target, true)
    for (const listener of registry.listeners) listener()
}

function ensureObserver(document: Document, registry: ToastFocusScopeRegistry) {
    if (registry.observer) return registry.observer
    const Observer = document.defaultView?.MutationObserver
    if (!Observer) return null
    registry.observer = new Observer(() => refresh(registry))
    return registry.observer
}

function observeHostAncestors(
    observer: MutationObserver,
    observedNodes: Set<HTMLElement>,
    host: HTMLElement,
) {
    // Only scope/ancestor attributes matter. Unrelated subtree mutations never
    // trigger a document scan or a React subscription notification.
    for (let node: HTMLElement | null = host; node; node = node.parentElement) {
        if (observedNodes.has(node)) break
        observedNodes.add(node)
        observer.observe(node, OBSERVE_OPTIONS)
    }
}

function rebuildObserver(
    document: Document,
    registry: ToastFocusScopeRegistry,
) {
    registry.observer?.disconnect()
    registry.observedNodes.clear()
    if (!registry.hosts.size) {
        registry.observer = null
        return
    }
    const observer = ensureObserver(document, registry)
    if (!observer) return
    for (const host of registry.hosts.keys()) {
        observeHostAncestors(observer, registry.observedNodes, host)
    }
}

export function registerToastFocusScope(host: HTMLElement) {
    const document = host.ownerDocument
    const registry = getRegistry(document)
    registry.hosts.set(host, false)
    const observer = ensureObserver(document, registry)
    if (observer) {
        observeHostAncestors(observer, registry.observedNodes, host)
    }
    refresh(registry)
    return () => {
        registry.hosts.delete(host)
        rebuildObserver(document, registry)
        refresh(registry)
    }
}

export function subscribeToastFocusScope(
    document: Document | undefined,
    listener: () => void,
) {
    const registry = document && getRegistry(document)
    registry?.listeners.add(listener)
    return () => {
        registry?.listeners.delete(listener)
    }
}

export function getToastFocusScope(document: Document | undefined) {
    return (document && registries.get(document)?.target) ?? null
}
