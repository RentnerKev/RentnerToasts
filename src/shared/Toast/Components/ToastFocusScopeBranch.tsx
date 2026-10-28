import { useToastBranch } from '../Hooks/useToastBranch.ts'

/** Portal target inside a focus scope. Native dialogs activate it only while open. */
export function ToastFocusScopeBranch() {
    const {
        refs: { setBranchRef },
    } = useToastBranch()
    return <div ref={setBranchRef} data-rentner-toast-branch="" />
}
