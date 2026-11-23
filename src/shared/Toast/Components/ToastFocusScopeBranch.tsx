import { memo, type CSSProperties } from 'react'
import { useToastFocusScopeBranch } from '../Hooks/useToastFocusScopeBranch.ts'
import type { ToastFocusScopeBranchProps } from '../Types/toast-ui.types.ts'

const FOCUS_SCOPE_STYLE: CSSProperties = {
    display: 'contents',
    background: 'transparent',
    border: 0,
    padding: 0,
    margin: 0,
    pointerEvents: 'none',
}

/** Place inside dialog content to render toast actions within its native focus scope. */
export const ToastFocusScopeBranch = memo(function ToastFocusScopeBranch({
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
            style={FOCUS_SCOPE_STYLE}
        />
    )
})
