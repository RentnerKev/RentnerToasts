export type ToastType = 'success' | 'error' | 'info' | 'warning'
export type ToastId = string
export type ToastPauseReason = 'hover' | 'focus'
export type ToastPosition =
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'

export interface Toast {
    readonly id: ToastId
    readonly content: string
    readonly title?: string
    readonly type: ToastType
    readonly duration: number
    readonly createdAt: number
    readonly remaining: number
    readonly timerStartedAt?: number
}

export interface ToastOptions {
    title?: string
    duration?: number
}

export interface ToastContentOptions extends ToastOptions {
    content: string
}

export interface ToastUpdateOptions {
    content?: string
    title?: string | null
    type?: ToastType
    duration?: number
}

export type ToastPromiseMessage<T> =
    | string
    | ToastContentOptions
    | ((value: T) => string | ToastContentOptions)

export type ToastPromiseLoadingMessage =
    | string
    | Omit<ToastContentOptions, 'duration'>

export interface ToastPromiseOptions<T> {
    loading: ToastPromiseLoadingMessage
    success: ToastPromiseMessage<T>
    error: ToastPromiseMessage<unknown>
    duration?: number
}

export type ToastPromiseInput<T> = PromiseLike<T> | (() => PromiseLike<T>)

export interface ToastApi {
    success: (content: string, options?: ToastOptions) => ToastId
    error: (content: string, options?: ToastOptions) => ToastId
    info: (content: string, options?: ToastOptions) => ToastId
    warning: (content: string, options?: ToastOptions) => ToastId
    dismiss: (id: ToastId) => void
    dismissAll: () => void
    update: (id: ToastId, options: ToastUpdateOptions) => boolean
    promise: <T>(
        input: ToastPromiseInput<T>,
        options: ToastPromiseOptions<T>,
    ) => Promise<T>
}

export interface ToastDefaults {
    readonly duration: number
    readonly maxVisibleToasts: number
}

export interface ToastStoreOptions {
    defaultDuration?: number
    maxVisibleToasts?: number
    /** Optional total queue limit, including visible toasts. Evicts the oldest. */
    maxQueuedToasts?: number
}

export interface ToastStore {
    readonly toast: ToastApi
    getToastDefaults: () => ToastDefaults
    configureToastDefaults: (defaults: Partial<ToastDefaults>) => ToastDefaults
    restoreToastDefaults: (defaults: ToastDefaults) => void
    subscribeToToasts: (listener: () => void) => () => void
    getToastSnapshot: () => readonly Toast[]
    createToast: (
        content: string,
        title?: string,
        type?: ToastType,
        duration?: number,
    ) => ToastId
    updateToast: (id: ToastId, options: ToastUpdateOptions) => boolean
    removeToast: (id: ToastId) => void
    setToastPauseReason: (
        id: ToastId,
        reason: ToastPauseReason,
        paused: boolean,
        owner?: symbol,
    ) => void
    clearAllToasts: () => void
    dispose: () => void
}
