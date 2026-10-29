import { useCallback } from 'react'
import { registerToastFocusScope } from '../../../lib/ToastFocusScope/toastFocusScope.ts'

export function useToastFocusScopeBranch(active: boolean) {
    const setScopeRef = useCallback(
        (node: HTMLDivElement | null) => {
            if (active && node) return registerToastFocusScope(node)
        },
        [active],
    )
    return { refs: { setScopeRef } }
}
