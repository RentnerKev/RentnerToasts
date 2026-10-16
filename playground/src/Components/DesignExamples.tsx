import { ToastProvider } from '@rentnerkev/toasts'
import { useDesignExamplesLogic } from '../Hooks/useDesignExamplesLogic.ts'

export function DesignExamples() {
    const {
        state,
        handler,
        refs: { portalContainerRef },
    } = useDesignExamplesLogic()
    return (
        <section aria-label="Design examples" className="px-10 pb-10">
            <h2 className="text-lg font-semibold">
                Scoped design and deduplication
            </h2>
            <div
                ref={portalContainerRef}
                data-testid="design-toast-portal"
                className="[--rentner-surface:#ffffff] [--rentner-foreground:#111827] [--rentner-muted:#374151] [--rentner-border:#d1d5db] [--rentner-radius:0px]"
            />
            <ToastProvider
                store={state.store}
                portalContainer={state.portalContainer}
                portalClassName="design-toast-region"
                portalZIndex={23456}
                position="top-right"
                classNames={{
                    content: 'text-lg text-slate-800',
                    title: 'text-xl font-bold',
                    closeButton: 'rounded-none bg-rose-100 p-4',
                    closeIcon: 'text-rose-700',
                    copyButton: 'rounded-lg bg-blue-100 p-2',
                    copyIcon: 'text-blue-700',
                    buttonOverlay: '',
                }}
            >
                <button
                    type="button"
                    data-testid="show-design-toasts"
                    onClick={handler.handleShow}
                    className="mt-3 rounded border p-3"
                >
                    Design examples anzeigen
                </button>
            </ToastProvider>
        </section>
    )
}
