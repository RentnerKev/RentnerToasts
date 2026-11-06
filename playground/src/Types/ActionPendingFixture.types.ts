import type { ToastStore } from '../../../src/index.ts'

export interface ActionPendingFixtureLogicResult {
    state: { store: ToastStore; mounted: boolean; calls: number }
    handler: {
        handleShow: () => void
        handleToggle: () => void
        handleFinish: () => void
    }
}
