import React from 'react'
import { toast, ToastProvider } from '@rentnerkev/toasts'
import { usePlaygroundLogic } from './Hooks/usePlaygroundLogic.js'

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
                data-testid="show-toasts"
                onClick={triggerAll}
            >
                3 Toasts anzeigen
            </button>

            <button
                className="bg-purple-600 text-white p-2 rounded"
                data-testid="show-link-toast"
                onClick={triggerLinkToast}
            >
                Toast mit Link anzeigen
            </button>

            <button
                className="bg-gray-600 text-white p-2 rounded"
                data-testid="dismiss-all"
                onClick={toast.dismissAll}
            >
                Alle Toasts schließen
            </button>
        </div>
    )
}

export function App() {
    const { state, handler } = usePlaygroundLogic()

    return (
        <div
            className={`min-h-screen ${state.darkMode ? 'dark bg-background-dark text-gray-100' : 'bg-gray-100 text-gray-900'}`}
        >
            <div className="flex items-center justify-between gap-4 px-10 pt-8">
                <h1 className="text-xl font-semibold">Toast playground</h1>
                <button
                    type="button"
                    aria-pressed={state.darkMode}
                    onClick={handler.handleDarkModeChange}
                    className="rounded border border-gray-400 px-3 py-2 text-sm hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-gray-600 dark:hover:bg-gray-800"
                >
                    {state.darkMode ? 'Light mode' : 'Dark mode'}
                </button>
            </div>
            <ToastProvider className="w-100" position="bottom-left">
                <MainApp />
            </ToastProvider>
        </div>
    )
}
