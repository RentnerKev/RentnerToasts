import { useState } from 'react'

export function usePlaygroundLogic() {
    const [darkMode, setDarkMode] = useState(true)

    function handleDarkModeChange() {
        setDarkMode((current) => !current)
    }

    return {
        state: { darkMode },
        handler: { handleDarkModeChange },
        setter: { setDarkMode },
    }
}
