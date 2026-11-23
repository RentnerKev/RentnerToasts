import { useSyncExternalStore } from 'react'

const query = '(prefers-reduced-motion: reduce)'

let cachedMatchMedia: typeof window.matchMedia | null = null
let cachedMedia: MediaQueryList | null = null
const listeners = new Set<() => void>()

function handleMediaChange() {
    for (const listener of listeners) listener()
}

function getSharedMedia(): MediaQueryList | null {
    if (
        typeof window === 'undefined' ||
        typeof window.matchMedia !== 'function'
    )
        return null
    if (cachedMedia && cachedMatchMedia === window.matchMedia) {
        return cachedMedia
    }
    if (cachedMedia) {
        cachedMedia.removeEventListener('change', handleMediaChange)
    }
    cachedMatchMedia = window.matchMedia
    cachedMedia = window.matchMedia(query)
    if (listeners.size > 0) {
        cachedMedia.addEventListener('change', handleMediaChange)
    }
    return cachedMedia
}

function subscribe(listener: () => void) {
    const media = getSharedMedia()
    if (!media) return () => {}
    if (listeners.size === 0) {
        media.addEventListener('change', handleMediaChange)
    }
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
        if (listeners.size === 0 && cachedMedia) {
            cachedMedia.removeEventListener('change', handleMediaChange)
            cachedMedia = null
            cachedMatchMedia = null
        }
    }
}

function getSnapshot() {
    const media = getSharedMedia()
    return media ? media.matches : false
}

function getServerSnapshot() {
    return false
}

export function useToastReducedMotion() {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
