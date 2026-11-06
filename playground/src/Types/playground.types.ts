export interface PlaygroundLogicResult {
    state: { darkMode: boolean }
    handler: {
        handleDarkModeChange: () => void
        handleShowToasts: () => void
        handleShowActionToast: () => void
        handleShowLinkToast: () => void
        handleDismissAll: () => void
    }
}
export interface ToastActionsProps {
    handler: PlaygroundLogicResult['handler']
}
