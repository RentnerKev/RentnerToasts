export interface ToastFocusScopeRegistry {
    hosts: Map<HTMLElement, boolean>
    listeners: Set<() => void>
    target: HTMLElement | null
    observer: MutationObserver | null
}
