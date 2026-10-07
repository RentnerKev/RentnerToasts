import { toast } from '@rentnerkev/toasts'
import type { PlaygroundLogicResult } from '../Types/playground.types.js'
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
            handleDismissAll: toast.dismissAll,
        },
        setter: { setDarkMode },
    }
}
