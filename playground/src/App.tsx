import React from 'react'
import { toast, ToastProvider } from '@rentnerkev/toasts'

function MainApp() {
    function triggerAll() {
        toast.success('Alles gut gelaufen 🚀', { title: 'Success' })
        toast.error('Irgendwas ist komplett kaputt 💀', { title: 'Error' })
        toast.info('Nur zur Info 👀', { title: 'Info' })
    }

    function triggerLinkToast() {
        toast.info(
            'Das ist der Link: [#45](https://localhost:3000/ticket/45) hast du ihn angeklickt?',
            { title: 'Neues Ticket' },
        )
    }

    return (
        <div className="flex flex-col gap-2 p-10">
            <button
                className="bg-blue-600 text-white p-2 rounded"
                onClick={triggerAll}
            >
                3 Toasts anzeigen
            </button>

            <button
                className="bg-purple-600 text-white p-2 rounded"
                onClick={triggerLinkToast}
            >
                Toast mit Link anzeigen
            </button>

            <button
                className="bg-gray-600 text-white p-2 rounded"
                onClick={toast.dismissAll}
            >
                Alle Toasts schließen
            </button>
        </div>
    )
}

export function App() {
    return (
        <ToastProvider className="w-100" position="bottom-left">
            <MainApp />
        </ToastProvider>
    )
}
