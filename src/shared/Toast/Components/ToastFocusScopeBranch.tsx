import { useToastFocusScopeBranch } from '../Hooks/useToastFocusScopeBranch.ts'
import type { ToastFocusScopeBranchProps } from '../Types/toast-ui.types.ts'

/** Place inside dialog content to render toast actions within its native focus scope. */
export function ToastFocusScopeBranch({
    active = true,
}: ToastFocusScopeBranchProps = {}) {
    const {
        refs: { setScopeRef },
    } = useToastFocusScopeBranch(active)
    return (
        <div
            ref={setScopeRef}
            data-rentner-toast-focus-scope=""
            popover="manual"
            style={{
                display: 'contents',
                background: 'transparent',
                border: 0,
                padding: 0,
                margin: 0,
                pointerEvents: 'none',
            }}
        />
    )
}
