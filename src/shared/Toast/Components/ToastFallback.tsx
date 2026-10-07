import type { ToastFallbackProps } from '../Types/toast-logic.types.js'
import { useToastSurfaceLogic } from '../Hooks/useToastSurfaceLogic.js'
import { useToastInteraction } from '../Hooks/useToastInteraction.js'
import type { CustomToastProps } from '../Types/toast-ui.types.js'

function FallbackNotification({
    toast,
    messages,
    customDesign,
    className,
    onRemove,
}: CustomToastProps) {
    const {
        handler,
        refs: { setWrapperRef },
    } = useToastInteraction({ id: toast.id, handoffOnUnmount: true })
    const wrapperDesign = customDesign?.[`${toast.type}Wrapper`]
    return (
        <div
            ref={setWrapperRef}
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
            aria-atomic="true"
            data-toast-fallback=""
            onMouseEnter={handler.handleMouseEnter}
            onMouseLeave={handler.handleMouseLeave}
            onFocusCapture={handler.handleFocus}
            onBlurCapture={handler.handleBlur}
            className={`pointer-events-auto flex w-80 max-w-full items-start gap-3 rounded-xl border p-4 shadow-2xl ${wrapperDesign || 'border-gray-600 bg-gray-950 text-gray-50'} ${className || ''}`}
        >
            <div className="min-w-0 flex-1 wrap-break-word">
                {toast.title && (
                    <div className={customDesign?.titleText || 'font-semibold'}>
                        {toast.title}
                    </div>
                )}
                <div className={customDesign?.contentText}>{toast.content}</div>
            </div>
            <button
                type="button"
                data-toast-close=""
                aria-label={messages.closeNotification}
                onClick={() => onRemove(toast.id)}
                className={`shrink-0 cursor-pointer rounded p-1 focus-visible:ring-2 ${customDesign?.closeButton || ''}`}
            >
                <span aria-hidden="true">×</span>
            </button>
        </div>
    )
}

// This readable surface has no Motion/icon imports. Timers and notifications
// remain owned by the store while the animated surface loads or fails.
export function ToastFallback({
    loadFailed,
    position,
    locale = 'de',
    messages,
    customDesign,
    className,
}: ToastFallbackProps) {
    const { state, handler } = useToastSurfaceLogic({
        position,
        locale,
        messages,
    })
    return (
        <section
            data-toast-load-failed={loadFailed || undefined}
            aria-label={state.messages.regionLabel}
            className={`pointer-events-none fixed z-[99999] flex max-w-full gap-3 ${state.positionClasses}`}
        >
            {state.visibleToasts.map((toast) => (
                <FallbackNotification
                    key={toast.id}
                    toast={toast}
                    position={position}
                    onRemove={handler.handleRemoveToast}
                    messages={state.messages}
                    customDesign={customDesign}
                    className={className}
                />
            ))}
        </section>
    )
}
