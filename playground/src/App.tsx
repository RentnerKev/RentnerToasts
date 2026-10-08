import { ToastActions } from './Components/ToastActions.tsx'
import { ToastProvider } from '@rentnerkev/toasts'
import { usePlaygroundLogic } from './Hooks/usePlaygroundLogic.ts'

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
                <ToastActions handler={handler} />
            </ToastProvider>
        </div>
    )
}
