import { useToastSurface } from '../Hooks/useToastSurface.ts'
import { CustomToast } from './CustomToast.tsx'
import type { ToastProps } from '../Types/toast-ui.types.ts'
import { AnimatePresence, MotionConfig } from 'motion/react'
import { createPortal } from 'react-dom'

export function Toast({
    customDesign,
    classNames,
    position,
    className,
    locale = 'de',
    messages,
    portalContainer,
    portalClassName,
    portalZIndex,
}: ToastProps) {
    const { state, handler } = useToastSurface({ position, locale, messages })
    const surface = (
        <MotionConfig reducedMotion="user">
            <section
                aria-label={state.messages.regionLabel}
                className={[
                    'fixed z-[var(--rentner-toast-z,99999)] flex max-w-full pointer-events-none',
                    state.positionClasses,
                    classNames?.region ?? 'gap-3 p-4',
                    portalClassName,
                ]
                    .filter(Boolean)
                    .join(' ')}
                style={
                    portalZIndex === undefined
                        ? undefined
                        : { zIndex: portalZIndex }
                }
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
                            classNames={classNames}
                            className={className}
                            messages={state.messages}
                        />
                    ))}
                </AnimatePresence>
            </section>
        </MotionConfig>
    )
    return portalContainer && typeof document !== 'undefined'
        ? createPortal(surface, portalContainer)
        : surface
}
