import { createToastStore } from '../../src/lib/ToastStore/toastApi.ts'
import type {
    ToastContentOptions,
    ToastPromiseOptions,
} from '../../src/lib/ToastStore/Types/toast.types.ts'

const store = createToastStore()
store.toast.info('Direct', { dedupeKey: 'key', dedupeWindow: 1000 })
const promiseOptions: ToastPromiseOptions<number> = {
    loading: { content: 'Loading' },
    success: (value) => ({ content: String(value), duration: 0 }),
    error: { content: 'Failed' },
}
void promiseOptions
const legacyContent: ToastContentOptions = {
    content: 'Existing typed message',
    duration: 1000,
}
const legacyPromiseOptions: ToastPromiseOptions<number> = {
    loading: legacyContent,
    success: legacyContent,
    error: () => legacyContent,
}
void legacyPromiseOptions
const invalid: ToastPromiseOptions<number> = {
    loading: {
        content: 'Loading',
        // @ts-expect-error Promise notifications own independent lifecycles and cannot share keys.
        dedupeKey: 'ignored',
    },
    success: {
        content: 'Success',
        // @ts-expect-error Dedupe applies to direct status calls, not promise settlement.
        dedupeWindow: 100,
    },
    // @ts-expect-error A resolver cannot silently return ignored dedupe options.
    error: () => ({ content: 'Failed', dedupeKey: 'ignored' }),
}
void invalid
store.dispose()
