import { toastMessageCatalog } from '../../config/messages.config.js'
import type { ToastLocale, ToastMessages } from './Types/messages.types.js'

export function resolveToastMessages(
    locale: ToastLocale = 'de',
    messages?: Partial<ToastMessages>,
): ToastMessages {
    return {
        ...toastMessageCatalog[locale],
        ...messages,
    }
}
