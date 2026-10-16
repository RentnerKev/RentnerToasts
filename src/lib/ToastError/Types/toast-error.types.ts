import type {
    ToastApi,
    ToastContentOptions,
    ToastId,
    ToastOptions,
} from '../../ToastStore/Types/toast.types.ts'

export interface ToastErrorOptions {
    fallbackMessage?: string
    normalize?: (
        error: unknown,
    ) => string | ToastContentOptions | null | undefined
}

export interface ToastErrorAdapterOptions extends ToastErrorOptions {
    api?: Pick<ToastApi, 'error'>
    dedupeKey?:
        | string
        | ((error: unknown, content: string) => string | undefined)
    dedupeWindow?: number
}

export type ToastErrorAdapter = (
    error: unknown,
    options?: ToastOptions,
) => ToastId
