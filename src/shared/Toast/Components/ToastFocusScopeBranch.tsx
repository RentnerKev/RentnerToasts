import { useFocusScopeBranch } from '@radix-ui/react-focus-scope'
import { useToastRegions } from '../Hooks/useToastRegions.ts'
import type { ToastRegionBranchProps } from '../Types/toast-logic.types.ts'

function ToastRegionBranch({ node }: ToastRegionBranchProps) {
    useFocusScopeBranch(node)
    return null
}

/** Place inside Radix Dialog.Content to keep global toast actions in its focus scope. */
export function ToastFocusScopeBranch() {
    const regions = useToastRegions()
    return regions.map((node) => (
        <ToastRegionBranch key={node.id} node={node} />
    ))
}
