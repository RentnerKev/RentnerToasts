import type { ToastDefaults } from './toast.types.js'
export interface ToastTimer {
    handle: ReturnType<typeof globalThis.setTimeout>
    token: symbol
}

export type ToastProviderDefaultsRegistrar = (
    owner: symbol,
    defaults: Partial<ToastDefaults>,
) => () => void
