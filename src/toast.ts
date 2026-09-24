import type {
    ToastApi,
    ToastContentOptions,
    ToastId,
    ToastOptions,
    ToastPromiseInput,
    ToastPromiseLoadingMessage,
    ToastPromiseMessage,
    ToastPromiseOptions,
    ToastStore,
    ToastStoreOptions,
    ToastType,
    ToastUpdateOptions,
} from './types.js'
import {
    createToastStoreCore,
    defaultToastStore as defaultToastStoreCore,
} from './toastStore.js'

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

function runPromise<T>(input: ToastPromiseInput<T>) {
    try {
        return Promise.resolve(typeof input === 'function' ? input() : input)
    } catch (error) {
        return Promise.reject(error)
    }
}

export function createToastApi(store: {
    getToastDefaults: ToastStore['getToastDefaults']
    createToast: ToastStore['createToast']
    updateToast: ToastStore['updateToast']
    removeToast: ToastStore['removeToast']
    clearAllToasts: ToastStore['clearAllToasts']
}): ToastApi {
    function showToast(
        type: ToastType,
        content: string,
        options?: ToastOptions,
    ) {
        return store.createToast(
            content,
            options?.title,
            type,
            options?.duration,
        )
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

            store.updateToast(id, {
                content: resolvedMessage.content,
                title: resolvedMessage.title ?? null,
                type,
                duration:
                    resolvedMessage.duration ??
                    duration ??
                    store.getToastDefaults().duration,
            })
        } catch {
            store.updateToast(id, {
                title: null,
                type,
                duration: duration ?? store.getToastDefaults().duration,
            })
        }
    }

    function promiseToast<T>(
        input: ToastPromiseInput<T>,
        options: ToastPromiseOptions<T>,
    ) {
        const loadingMessage = resolveLoadingMessage(options.loading)
        const id = store.createToast(
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

    return Object.freeze({
        success: (content, options) => showToast('success', content, options),
        error: (content, options) => showToast('error', content, options),
        info: (content, options) => showToast('info', content, options),
        warning: (content, options) => showToast('warning', content, options),
        dismiss: store.removeToast,
        dismissAll: store.clearAllToasts,
        update: (id: ToastId, options: ToastUpdateOptions) =>
            store.updateToast(id, options),
        promise: promiseToast,
    } satisfies ToastApi)
}

function attachToastApi(store: Omit<ToastStore, 'toast'>): ToastStore {
    return Object.freeze({
        ...store,
        toast: createToastApi(store),
    })
}

export function createToastStore(options: ToastStoreOptions = {}): ToastStore {
    return attachToastApi(createToastStoreCore(options))
}

export const defaultToastStore = attachToastApi(defaultToastStoreCore)

export const toast: ToastApi = defaultToastStore.toast
