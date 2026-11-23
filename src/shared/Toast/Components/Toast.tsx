import { memo } from 'react'
import { useToastPortalContainer } from '../Hooks/useToastPortalContainer.ts'
import { useToastSurface } from '../Hooks/useToastSurface.ts'
import { CustomToast } from './CustomToast.tsx'
import type { ToastProps } from '../Types/toast-ui.types.ts'
import { createPortal } from 'react-dom'

const BASE_REGION_CLASS =
    'fixed z-[var(--rentner-toast-z,99999)] flex max-w-full pointer-events-none'

export const Toast = memo(function Toast({
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
    const {
        state,
        handler,
        refs: { region },
    } = useToastSurface({ position, locale, messages })
    if (portalContainer === 'body' && !container) return null
    if (state.items.length === 0) return null
    const regionSlotClass = classNames?.region ?? 'gap-3 p-4'
    let regionClassName = `${BASE_REGION_CLASS} ${state.positionClasses}`
    if (regionSlotClass) regionClassName += ` ${regionSlotClass}`
    if (portalClassName) regionClassName += ` ${portalClassName}`
    const surface = (
        <section
            ref={region}
            id={state.regionId}
            aria-label={state.messages.regionLabel}
            aria-live="off"
            data-rentner-toast-region=""
            className={regionClassName}
            style={
                portalZIndex === undefined
                    ? undefined
                    : { zIndex: portalZIndex }
            }
        >
            {state.items.map(({ toast, present }) => (
                <CustomToast
                    key={toast.id}
                    toast={toast}
                    position={position}
                    onRemove={handler.handleRemoveToast}
                    customDesign={customDesign}
                    classNames={classNames}
                    className={className}
                    messages={state.messages}
                    present={present}
                    reducedMotion={state.reducedMotion}
                    onExitComplete={handler.handleExitComplete}
                />
            ))}
        </section>
    )
    return container && typeof document !== 'undefined'
        ? createPortal(surface, container)
        : surface
})
