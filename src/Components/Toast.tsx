import { useToastLogic } from '../Hooks/useToastLogic.js'
import { CustomToast } from './CustomToast.js'
import type { ToastProps } from '../types.js'
import { AnimatePresence } from 'motion/react'

export function Toast({ customDesign, position, className }: ToastProps) {
    const { state, handler } = useToastLogic()
    const anchorX = position.includes('right') ? 'right' : 'left'
    const anchorY = position.includes('bottom') ? 'bottom' : 'top'

    function getPositionClasses() {
        switch (position) {
            case 'top-left':
                return 'top-0 left-0 p-4 flex-col-reverse'
            case 'top-right':
                return 'top-0 right-0 p-4 flex-col-reverse'
            case 'bottom-left':
                return 'bottom-0 left-0 p-4 flex-col'
            case 'bottom-right':
                return 'bottom-0 right-0 p-4 flex-col'
            default:
                return 'bottom-0 right-0 p-4 flex-col'
        }
    }

    return (
        <div
            role="region"
            aria-label="Benachrichtigungen"
            className={`fixed z-[99999] flex gap-3 pointer-events-none ${getPositionClasses()}`}
        >
            <AnimatePresence
                mode="popLayout"
                anchorX={anchorX}
                anchorY={anchorY}
            >
                {state.visibleToasts.map((toast) => (
                    <CustomToast
                        key={toast.id}
                        toast={toast}
                        position={position}
                        onRemove={handler.removeToast}
                        customDesign={customDesign}
                        className={className}
                    />
                ))}
            </AnimatePresence>
        </div>
    )
}
