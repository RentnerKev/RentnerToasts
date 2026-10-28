import { useToastActionLogic } from '../Hooks/useToastActionLogic.ts'
import type { ToastActionButtonProps } from '../Types/toast-animation.types.ts'

export function ToastActionButton({
    animated,
    ...props
}: ToastActionButtonProps) {
    const {
        refs: { button },
        handler,
    } = useToastActionLogic(animated)
    return (
        <button
            {...props}
            ref={button}
            onPointerEnter={handler.handlePointerEnter}
            onPointerLeave={handler.handlePointerLeave}
            onPointerDown={handler.handlePointerDown}
            onPointerUp={handler.handlePointerUp}
            onPointerCancel={handler.handlePointerCancel}
        />
    )
}
