import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { registerToastBranch } from '../../../lib/ToastStore/toastBranches.ts'
import { useToastStore } from './useToastStore.ts'

const useIsomorphicLayoutEffect =
    typeof window === 'undefined' ? useEffect : useLayoutEffect

export function useToastBranch() {
    const store = useToastStore()
    const [node, setNode] = useState<HTMLDivElement | null>(null)
    const setBranchRef = useCallback(
        (element: HTMLDivElement | null) => setNode(element),
        [],
    )
    useIsomorphicLayoutEffect(() => {
        if (node) return registerToastBranch(store, node)
    }, [node, store])
    return { refs: { setBranchRef } }
}
