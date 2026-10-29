import type { ToastFocusScopeRegistry } from './Types/toast-focus-scope.types.ts'

const registries = new WeakMap<Document, ToastFocusScopeRegistry>()

function getRegistry(document: Document) {
    let registry = registries.get(document)
    if (!registry) {
        registry = {
            hosts: new Map(),
            listeners: new Set(),
            target: null,
            observer: null,
        }
        registries.set(document, registry)
    }
    return registry
}

function isAvailable(host: HTMLElement) {
    if (!host.isConnected) return false
    const view = host.ownerDocument.defaultView
    for (let node: HTMLElement | null = host; node; node = node.parentElement) {
        if (
            node.hidden ||
            node.inert ||
            node.getAttribute('aria-hidden') === 'true' ||
            node.getAttribute('data-state') === 'closed' ||
            (node.tagName === 'DIALOG' && !node.hasAttribute('open'))
        ) {
            return false
        }
        const style = view?.getComputedStyle(node)
        if (
            style?.display === 'none' ||
            style?.visibility === 'hidden' ||
            style?.visibility === 'collapse'
        ) {
            return false
        }
    }
    return true
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
    const activated: HTMLElement[] = []
    for (const [host, previouslyAvailable] of registry.hosts) {
        const available = isAvailable(host)
        registry.hosts.set(host, available)
        if (available && !previouslyAvailable) activated.push(host)
    }
    for (const host of activated) {
        registry.hosts.delete(host)
        registry.hosts.set(host, true)
    }
    let target: HTMLElement | null = null
    let boundary: HTMLElement | null = null
    let modal = false
    for (const [host, available] of registry.hosts) {
        if (!available) continue
        const inModal = Boolean(host.closest('dialog:modal'))
        // Native modal dialogs make everything outside their top layer inert.
        if (modal && !inModal) continue
        if (inModal && !modal) {
            target = null
            modal = true
        }
        const candidate = getToastFocusScopeBoundary(host)
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

function observeHosts(document: Document, registry: ToastFocusScopeRegistry) {
    registry.observer?.disconnect()
    if (!registry.hosts.size) {
        registry.observer = null
        return
    }
    const Observer = document.defaultView?.MutationObserver
    if (!Observer) return
    registry.observer ??= new Observer(() => refresh(registry))
    // Only scope/ancestor attributes matter. Unrelated subtree mutations never
    // trigger a document scan or a React subscription notification.
    for (const host of registry.hosts.keys()) {
        for (
            let node: HTMLElement | null = host;
            node;
            node = node.parentElement
        ) {
            registry.observer.observe(node, {
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
            })
        }
    }
}

export function registerToastFocusScope(host: HTMLElement) {
    const document = host.ownerDocument
    const registry = getRegistry(document)
    registry.hosts.set(host, false)
    observeHosts(document, registry)
    refresh(registry)
    return () => {
        registry.hosts.delete(host)
        observeHosts(document, registry)
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
