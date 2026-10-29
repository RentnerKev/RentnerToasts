import { useRef, useState } from 'react'
import { createToastStore } from '../../../src/index.ts'

export const focusScopeStores = {
    inline: createToastStore({ defaultDuration: 0 }),
    body: createToastStore({ defaultDuration: 0 }),
    custom: createToastStore({ defaultDuration: 0 }),
}

export function useFocusScopeFixtureLogic() {
    const parent = useRef<HTMLDialogElement>(null)
    const child = useRef<HTMLDialogElement>(null)
    const [customActive, setCustomActive] = useState(false)
    const [parentActive, setParentActive] = useState(true)
    const [container, setContainer] = useState<HTMLDivElement | null>(null)

    return {
        refs: { parent, child, container: setContainer },
        state: { customActive, parentActive, container },
        handler: {
            openParent: () => parent.current?.showModal(),
            closeParent: () => parent.current?.close(),
            openChild: () => child.current?.showModal(),
            closeChild: () => child.current?.close(),
            toggleCustom: () => setCustomActive((value) => !value),
            toggleParent: () => setParentActive((value) => !value),
            addAll: () => {
                focusScopeStores.inline.toast.info('Inline notification')
                focusScopeStores.body.toast.info('Body notification')
                focusScopeStores.custom.toast.info('Custom notification')
            },
            addError: () =>
                focusScopeStores.inline.toast.error('Copy this error'),
            addTimed: () =>
                focusScopeStores.inline.toast.info('Timed notification', {
                    duration: 2000,
                }),
        },
    }
}
