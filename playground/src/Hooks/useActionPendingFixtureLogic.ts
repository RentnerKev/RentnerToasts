import { useRef, useState } from 'react'
import { createToastStore } from '../../../src/index.ts'
import type { ActionPendingFixtureLogicResult } from '../Types/ActionPendingFixture.types.ts'

export function useActionPendingFixtureLogic(): ActionPendingFixtureLogicResult {
    const [store] = useState(() => createToastStore({ defaultDuration: 0 }))
    const [mounted, setMounted] = useState(true)
    const [calls, setCalls] = useState(0)
    const finish = useRef<(() => void) | undefined>(undefined)
    function handleShow() {
        store.toast.info('Shared action', {
            action: {
                label: 'Run shared action',
                dismissOnSuccess: false,
                onClick: () => {
                    setCalls((current) => current + 1)
                    return new Promise<void>((resolve) => {
                        finish.current = resolve
                    })
                },
            },
        })
    }
    function handleFinish() {
        finish.current?.()
    }
    function handleToggle() {
        setMounted((current) => !current)
    }
    return {
        state: { store, mounted, calls },
        handler: { handleShow, handleFinish, handleToggle },
    }
}
