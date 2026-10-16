import { toast } from '../ToastStore/toastApi.ts'
import type { ToastContentOptions } from '../ToastStore/Types/toast.types.ts'
import type {
    ToastErrorAdapter,
    ToastErrorAdapterOptions,
    ToastErrorOptions,
} from './Types/toast-error.types.ts'
export type {
    ToastErrorAdapter,
    ToastErrorAdapterOptions,
    ToastErrorOptions,
} from './Types/toast-error.types.ts'

function defaultErrorMessage(error: unknown): string | undefined {
    if (typeof error === 'string') return error
    if (
        error !== null &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string'
    )
        return error.message
    return undefined
}

/** Resolves only readable strings/message objects. Applications own domain-specific normalization. */
export function resolveToastError(
    error: unknown,
    {
        fallbackMessage = 'Ein unerwarteter Fehler ist aufgetreten.',
        normalize,
    }: ToastErrorOptions = {},
): ToastContentOptions {
    try {
        const result = normalize ? normalize(error) : defaultErrorMessage(error)
        const message =
            typeof result === 'string' ? { content: result } : result
        if (
            message &&
            typeof message.content === 'string' &&
            message.content.trim()
        )
            return message
    } catch {
        // A display adapter must not replace the original failure with a mapping failure.
    }
    return { content: fallbackMessage }
}

export function createToastErrorAdapter({
    api = toast,
    dedupeKey,
    dedupeWindow,
    ...options
}: ToastErrorAdapterOptions = {}): ToastErrorAdapter {
    return (error, overrides) => {
        const { content, ...resolved } = resolveToastError(error, options)
        const key =
            typeof dedupeKey === 'function'
                ? dedupeKey(error, content)
                : dedupeKey
        return api.error(content, {
            dedupeKey: key,
            dedupeWindow,
            ...resolved,
            ...overrides,
        })
    }
}
