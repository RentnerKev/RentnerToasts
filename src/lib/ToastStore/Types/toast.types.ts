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

export interface ToastDedupeOptions {
    /** Reuse an active notification with this key instead of adding a duplicate. */
    dedupeKey?: string
    /** Milliseconds from creation; defaults to the store window (active lifetime). Zero disables deduplication. */
    dedupeWindow?: number
}

export interface ToastOptions extends ToastDedupeOptions {
    title?: string
    duration?: number
}

export interface ToastContentOptions extends Omit<
    ToastOptions,
    keyof ToastDedupeOptions
> {
    content: string
}

export interface ToastUpdateOptions {
    content?: string
    title?: string | null
    type?: ToastType
    duration?: number
}

/** Promise notifications have independent lifecycles; deduplication is only supported by direct status calls. */
export type ToastPromiseContentOptions = Omit<
    ToastContentOptions,
    keyof ToastDedupeOptions
> & {
    dedupeKey?: never
    dedupeWindow?: never
}

export type ToastPromiseMessage<T> =
    | string
    | ToastPromiseContentOptions
    | ((value: T) => string | ToastPromiseContentOptions)

export type ToastPromiseLoadingMessage =
    | string
    | Omit<ToastPromiseContentOptions, 'duration'>

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
    /** Default deduplication window for keyed notifications. Defaults to Infinity. */
    dedupeWindow?: number
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
        options?: ToastDedupeOptions,
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
