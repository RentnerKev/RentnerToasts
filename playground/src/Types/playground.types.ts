import type { Dispatch, SetStateAction } from 'react'
export interface PlaygroundLogicResult {
    state: { darkMode: boolean }
    handler: {
        handleDarkModeChange: () => void
        handleShowToasts: () => void
        handleShowLinkToast: () => void
        handleDismissAll: () => void
    }
    setter: { setDarkMode: Dispatch<SetStateAction<boolean>> }
}
export interface ToastActionsProps {
    handler: PlaygroundLogicResult['handler']
}
