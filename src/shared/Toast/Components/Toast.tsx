import { useToastPortalContainer } from '../Hooks/useToastPortalContainer.ts'
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
    const container = useToastPortalContainer(portalContainer)
    const { state, handler } = useToastSurface({
        position,
        locale,
        messages,
        customDesign,
        classNames,
    })
    if (portalContainer === 'body' && !container) return null
    const surface = (
        <MotionConfig reducedMotion="user">
            <section
                id={state.regionId}
                aria-label={state.messages.regionLabel}
                aria-live="off"
                data-rentner-toast-region=""
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
                            presentation={state.presentation}
                        />
                    ))}
                </AnimatePresence>
            </section>
        </MotionConfig>
    )
    return container && typeof document !== 'undefined'
        ? createPortal(surface, container)
        : surface
}
