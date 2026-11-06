import { toast } from '@rentnerkev/toasts'
import type { PlaygroundLogicResult } from '../Types/playground.types.ts'
import { useState } from 'react'

function handleShowToasts() {
    toast.success('Alles gut gelaufen 🚀', { title: 'Success' })
    toast.error('Irgendwas ist komplett kaputt 💀', { title: 'Error' })
    toast.info('Nur zur Info 👀', { title: 'Info' })
}

function handleShowLinkToast() {
    toast.info(
        'Das ist der Link: [#45](https://localhost:3000/ticket/45) hast du ihn angeklickt?',
        { title: 'Neues Ticket' },
    )
}

function handleShowActionToast() {
    toast.info('Die Datei wurde gelöscht.', {
        title: 'Rückgängig machen',
        action: {
            label: 'Datei wiederherstellen',
            onClick: async () => {
                await new Promise<void>((resolve) =>
                    globalThis.setTimeout(resolve, 250),
                )
                toast.success('Datei wiederhergestellt.', { duration: 0 })
            },
        },
    })
}

export function usePlaygroundLogic(): PlaygroundLogicResult {
    const [darkMode, setDarkMode] = useState(true)

    function handleDarkModeChange() {
        setDarkMode((current) => !current)
    }

    return {
        state: { darkMode },
        handler: {
            handleDarkModeChange,
            handleShowToasts,
            handleShowLinkToast,
            handleShowActionToast,
            handleDismissAll: toast.dismissAll,
        },
    }
}
