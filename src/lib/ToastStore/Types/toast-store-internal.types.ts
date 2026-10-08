import type { ToastDefaults, ToastStore } from './toast.types.ts'
export interface ToastTimer {
    handle: ReturnType<typeof globalThis.setTimeout>
    token: symbol
}

export type ToastProviderDefaultsRegistrar = (
    owner: symbol,
    defaults: Partial<ToastDefaults>,
) => () => void

export type ToastStoreCore = Omit<ToastStore, 'toast'>

export type ToastApiStore = Pick<
    ToastStore,
    | 'getToastDefaults'
    | 'createToast'
    | 'updateToast'
    | 'removeToast'
    | 'clearAllToasts'
>
