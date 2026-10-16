import { useCallback, useEffect, useState } from 'react'
import { createToastStore, createToastErrorAdapter } from '@rentnerkev/toasts'

export function useDesignExamplesLogic() {
    const [store] = useState(() => createToastStore())
    const [portalContainer, setPortalContainer] =
        useState<HTMLDivElement | null>(null)
    useEffect(() => () => store.dispose(), [store])
    function handleShow() {
        store.toast.dismissAll()
        const reportError = createToastErrorAdapter({
            api: store.toast,
            dedupeKey: 'design-error',
        })
        reportError(new Error('Fehler ohne Titel'), { duration: 0 })
        reportError(new Error('Wiederholter Fehler'), { duration: 0 })
        store.toast.success('Text mit Titel', {
            title: 'Erfolgreich',
            duration: 0,
        })
    }
    const portalContainerRef = useCallback((element: HTMLDivElement | null) => {
        setPortalContainer(element)
    }, [])
    return {
        state: { store, portalContainer },
        handler: { handleShow },
        refs: { portalContainerRef },
    }
}
