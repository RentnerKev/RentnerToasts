import type { ToastActionsProps } from '../Types/playground.types.js'
export function ToastActions({ handler }: ToastActionsProps) {
    return (
        <div className="flex flex-col gap-2 p-10">
            <button
                className="bg-blue-600 text-white p-2 rounded"
                data-testid="show-toasts"
                onClick={handler.handleShowToasts}
            >
                3 Toasts anzeigen
            </button>

            <button
                className="bg-purple-600 text-white p-2 rounded"
                data-testid="show-link-toast"
                onClick={handler.handleShowLinkToast}
            >
                Toast mit Link anzeigen
            </button>

            <button
                className="bg-gray-600 text-white p-2 rounded"
                data-testid="dismiss-all"
                onClick={handler.handleDismissAll}
            >
                Alle Toasts schließen
            </button>
        </div>
    )
}
