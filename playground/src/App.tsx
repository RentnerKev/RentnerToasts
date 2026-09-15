import React from 'react'
import { customToast, ToastProvider } from '@rentnerkev/toasts'

function MainApp() {
    function triggerAll() {
        customToast('Alles gut gelaufen 🚀', 'Success', 'success')
        customToast('Irgendwas ist komplett kaputt 💀', 'Error', 'error')
        customToast('Nur zur Info 👀', 'Info', 'info')
    }

    function triggerLinkToast() {
        customToast(
            'Das ist der Link: [#45](https://localhost:3000/ticket/45) hast du ihn angeklickt?',
            'Neues Ticket',
            'info',
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
