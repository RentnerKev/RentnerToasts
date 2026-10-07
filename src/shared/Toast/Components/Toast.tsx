import { useToastSurfaceLogic } from '../Hooks/useToastSurfaceLogic.js'
import { CustomToast } from './CustomToast.js'
import type { ToastProps } from '../Types/toast-ui.types.js'
import { AnimatePresence, MotionConfig } from 'motion/react'

export function Toast({
    customDesign,
    position,
    className,
    locale = 'de',
    messages,
}: ToastProps) {
    const { state, handler } = useToastSurfaceLogic({
        position,
        locale,
        messages,
    })

    return (
        <MotionConfig reducedMotion="user">
            <section
                aria-label={state.messages.regionLabel}
                className={`fixed z-[99999] flex max-w-full gap-3 pointer-events-none ${state.positionClasses}`}
            >
                <AnimatePresence
                    mode="popLayout"
                    anchorX={state.anchorX}
                    anchorY={state.anchorY}
                >
                    {state.visibleToasts.map((toast) => (
                        <CustomToast
                            key={toast.id}
                            toast={toast}
                            position={position}
                            onRemove={handler.handleRemoveToast}
                            customDesign={customDesign}
                            className={className}
                            messages={state.messages}
                        />
                    ))}
                </AnimatePresence>
            </section>
        </MotionConfig>
    )
}
