import { useSyncExternalStore } from 'react'

const emptyRegions: readonly HTMLElement[] = Object.freeze([])
let cachedRegions = emptyRegions

function subscribe(onChange: () => void) {
    const observer = new MutationObserver(onChange)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
}

function getSnapshot() {
    const regions = [
        ...document.querySelectorAll<HTMLElement>(
            '[data-rentner-toast-region]',
        ),
    ]
    if (
        regions.length !== cachedRegions.length ||
        regions.some((node, i) => node !== cachedRegions[i])
    ) {
        cachedRegions = Object.freeze(regions)
    }
    return cachedRegions
}

function getServerSnapshot() {
    return emptyRegions
}

export function useToastRegions() {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
