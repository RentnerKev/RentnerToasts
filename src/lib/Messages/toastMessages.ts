import { toastMessageCatalog } from '../../config/messages.config.ts'
import type { ToastLocale, ToastMessages } from './Types/messages.types.ts'

export function resolveToastMessages(
    locale: ToastLocale = 'de',
    messages?: Partial<ToastMessages>,
): ToastMessages {
    return {
        ...toastMessageCatalog[locale],
        ...messages,
    }
}

export { toastMessageCatalog }
export type { ToastLocale, ToastMessages } from './Types/messages.types.ts'
