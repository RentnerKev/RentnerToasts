import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ToastProvider } from '../../src/index.ts'
import { useActionPendingFixtureLogic } from './Hooks/useActionPendingFixtureLogic.ts'

function ActionPendingFixture() {
    const { state, handler } = useActionPendingFixtureLogic()
    return (
        <main>
            <button type="button" onClick={handler.handleShow}>
                Show shared action
            </button>
            <button type="button" onClick={handler.handleToggle}>
                Toggle first surface
            </button>
            <button type="button" onClick={handler.handleFinish}>
                Finish action
            </button>
            <output data-testid="action-calls">{state.calls}</output>
            {state.mounted && (
                <ToastProvider
                    children={null}
                    store={state.store}
                    locale="en"
                    position="top-left"
                    portalClassName="first-surface"
                />
            )}
            <ToastProvider
                children={null}
                store={state.store}
                locale="en"
                position="bottom-right"
                portalClassName="second-surface"
            />
        </main>
    )
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ActionPendingFixture />
    </StrictMode>,
)
