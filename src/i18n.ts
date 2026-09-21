export type ToastLocale = 'de' | 'en'

export interface ToastMessages {
    regionLabel: string
    closeNotification: string
    copyError: string
    errorCopied: string
}

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

export function resolveToastMessages(
    locale: ToastLocale = 'de',
    messages?: Partial<ToastMessages>,
): ToastMessages {
    return {
        ...toastMessageCatalog[locale],
        ...messages,
    }
}
