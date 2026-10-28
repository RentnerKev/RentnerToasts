import type { ToastStore } from './Types/toast.types.ts'

interface BranchRegistry {
    nodes: Map<HTMLElement, HTMLElement>
    listeners: Set<() => void>
    active: HTMLElement | null
}

const registries = new WeakMap<
    ToastStore['subscribeToToasts'],
    BranchRegistry
>()

function parentElement(node: Element): Element | null {
    const root = node.getRootNode()
    return (
        node.parentElement ??
        ('host' in root ? (root as ShadowRoot).host : null)
    )
}

function scopeContains(scope: HTMLElement, node: HTMLElement) {
    let current: Element | null = node
    while (current) {
        if (current === scope) return true
        current = parentElement(current)
    }
    return false
}

export function getToastBranches(store: ToastStore): BranchRegistry {
    let registry = registries.get(store.subscribeToToasts)
    if (!registry) {
        registry = { nodes: new Map(), listeners: new Set(), active: null }
        registries.set(store.subscribeToToasts, registry)
    }
    return registry
}

export function registerToastBranch(store: ToastStore, node: HTMLElement) {
    const registry = getToastBranches(store)
    const dialogs: HTMLDialogElement[] = []
    let parent: Element | null = parentElement(node)
    while (parent) {
        if (parent.tagName === 'DIALOG')
            dialogs.push(parent as HTMLDialogElement)
        parent = parentElement(parent)
    }
    const publish = () => {
        let active: HTMLElement | null = null
        for (const [candidate, scope] of registry.nodes) {
            if (
                !active ||
                !scopeContains(scope, active) ||
                registry.nodes.get(active) === scope
            )
                active = candidate
        }
        if (active !== registry.active) {
            registry.active = active
            for (const listener of registry.listeners) listener()
        }
    }
    const update = () => {
        if (dialogs.every((dialog) => dialog.open))
            registry.nodes.set(node, dialogs[0] ?? node.parentElement ?? node)
        else registry.nodes.delete(node)
        publish()
    }
    const observer = new MutationObserver(update)
    for (const dialog of dialogs)
        observer.observe(dialog, {
            attributes: true,
            attributeFilter: ['open'],
        })
    update()
    return () => {
        observer.disconnect()
        registry.nodes.delete(node)
        publish()
    }
}
