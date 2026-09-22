import type {
    ToastApi,
    ToastContentOptions,
    ToastId,
    ToastOptions,
    ToastPromiseInput,
    ToastPromiseLoadingMessage,
    ToastPromiseMessage,
    ToastPromiseOptions,
    ToastType,
    ToastUpdateOptions,
} from './types.js'
import { DEFAULT_TOAST_DURATION } from './Hooks/toastTiming.js'
import {
    clearAllToasts,
    createToast,
    removeToast,
    updateToast,
} from './toastStore.js'

function showToast(type: ToastType, content: string, options?: ToastOptions) {
    return createToast(content, options?.title, type, options?.duration)
}

function resolveLoadingMessage(message: ToastPromiseLoadingMessage) {
    return typeof message === 'string' ? { content: message } : message
}

function resolvePromiseMessage<T>(
    message: ToastPromiseMessage<T>,
    value: T,
): ToastContentOptions {
    const resolvedMessage =
        typeof message === 'function' ? message(value) : message

    return typeof resolvedMessage === 'string'
        ? { content: resolvedMessage }
        : resolvedMessage
}

function settlePromiseToast<T>(
    id: ToastId,
    type: Extract<ToastType, 'success' | 'error'>,
    message: ToastPromiseMessage<T>,
    value: T,
    duration?: number,
) {
    try {
        const resolvedMessage = resolvePromiseMessage(message, value)

        updateToast(id, {
            content: resolvedMessage.content,
            title: resolvedMessage.title ?? null,
            type,
            duration:
                resolvedMessage.duration ?? duration ?? DEFAULT_TOAST_DURATION,
        })
    } catch {
        updateToast(id, {
            title: null,
            type,
            duration: duration ?? DEFAULT_TOAST_DURATION,
        })
    }
}

function runPromise<T>(input: ToastPromiseInput<T>) {
    try {
        return Promise.resolve(typeof input === 'function' ? input() : input)
    } catch (error) {
        return Promise.reject(error)
    }
}

function promiseToast<T>(
    input: ToastPromiseInput<T>,
    options: ToastPromiseOptions<T>,
) {
    const loadingMessage = resolveLoadingMessage(options.loading)
    const id = createToast(
        loadingMessage.content,
        loadingMessage.title,
        'info',
        0,
    )

    return runPromise(input).then(
        (value) => {
            settlePromiseToast(
                id,
                'success',
                options.success,
                value,
                options.duration,
            )

            return value
        },
        (error: unknown) => {
            settlePromiseToast(
                id,
                'error',
                options.error,
                error,
                options.duration,
            )

            throw error
        },
    )
}

export function customToast(
    content: string,
    title?: string,
    type: ToastType = 'success',
    duration: number = DEFAULT_TOAST_DURATION,
): ToastId {
    return createToast(content, title, type, duration)
}

export { removeToast }

const toastApi: ToastApi = {
    success: (content, options) => showToast('success', content, options),
    error: (content, options) => showToast('error', content, options),
    info: (content, options) => showToast('info', content, options),
    warning: (content, options) => showToast('warning', content, options),
    dismiss: removeToast,
    dismissAll: clearAllToasts,
    update: (id: ToastId, options: ToastUpdateOptions) =>
        updateToast(id, options),
    promise: promiseToast,
}

export const toast: ToastApi = Object.freeze(toastApi)
