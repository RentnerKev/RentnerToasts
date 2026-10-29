import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { ToastFocusScopeBranch, ToastProvider } from '../../src/index.ts'
import { ToastFocusScopeBranch as CompatibilityBranch } from '../../src/radix.ts'
import {
    focusScopeStores,
    useFocusScopeFixtureLogic,
} from './Hooks/useFocusScopeFixtureLogic.ts'
// oxlint-disable-next-line import/no-unassigned-import -- Exercise the real playground styles.
import './index.css'

function Fixture() {
    const {
        refs: { parent, child, container },
        state,
        handler,
    } = useFocusScopeFixtureLogic()
    return (
        <main style={{ padding: 32, paddingTop: 240 }}>
            <div id="custom-container" ref={container} />
            <div id="inline-provider">
                <ToastProvider store={focusScopeStores.inline} locale="en">
                    {null}
                </ToastProvider>
            </div>
            <ToastProvider
                store={focusScopeStores.body}
                locale="en"
                position="top-left"
                portalContainer="body"
            >
                {null}
            </ToastProvider>
            {state.container && (
                <ToastProvider
                    store={focusScopeStores.custom}
                    locale="en"
                    position="top-right"
                    portalContainer={state.container}
                >
                    {null}
                </ToastProvider>
            )}
            <button onClick={handler.addAll}>Add all stores</button>
            <button onClick={handler.openParent}>Open parent</button>
            <button onClick={handler.toggleCustom}>Toggle custom active</button>
            <button id="toggle-parent" onClick={handler.toggleParent}>
                Toggle parent active
            </button>
            {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- Exercise an application's custom force-mounted dialog. */}
            <section id="custom-scope" role="dialog" data-state="closed">
                <ToastFocusScopeBranch active={state.customActive} />
            </section>
            <dialog
                id="parent-dialog"
                ref={parent}
                style={{ margin: 'auto', padding: 32 }}
            >
                <h1>Parent dialog</h1>
                <button onClick={handler.openChild}>Open child</button>
                <button onClick={handler.addError}>Add error</button>
                <button onClick={handler.addTimed}>Add timed</button>
                <button onClick={handler.closeParent}>Close parent</button>
                <ToastFocusScopeBranch active={state.parentActive} />
                <dialog
                    id="child-dialog"
                    ref={child}
                    style={{ margin: 'auto', padding: 32 }}
                >
                    <h2>Child dialog</h2>
                    <button onClick={handler.closeChild}>Close child</button>
                    <CompatibilityBranch />
                </dialog>
            </dialog>
        </main>
    )
}

// Vite can request both timestamped and original entry URLs after Tailwind
// invalidates its module graph. Keep a single React root for this fixture.
const rootElement = document.getElementById('root')! as HTMLElement & {
    focusScopeFixtureRoot?: Root
}
const root = rootElement.focusScopeFixtureRoot ?? createRoot(rootElement)
rootElement.focusScopeFixtureRoot = root
root.render(
    <StrictMode>
        <Fixture />
    </StrictMode>,
)

import.meta.hot?.dispose(() => {
    root.unmount()
    delete rootElement.focusScopeFixtureRoot
    for (const store of Object.values(focusScopeStores)) store.dispose()
})
