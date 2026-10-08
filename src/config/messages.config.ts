import type {
    ToastLocale,
    ToastMessages,
} from '../lib/Messages/Types/messages.types.ts'
export const toastMessageCatalog: Record<ToastLocale, ToastMessages> = {
    de: {
        regionLabel: 'Benachrichtigungen',
        closeNotification: 'Benachrichtigung schließen',
        copyError: 'Fehlermeldung kopieren',
        errorCopied: 'Fehlermeldung kopiert',
    },
    en: {
        regionLabel: 'Notifications',
        closeNotification: 'Close notification',
        copyError: 'Copy error message',
        errorCopied: 'Error message copied',
    },
}
