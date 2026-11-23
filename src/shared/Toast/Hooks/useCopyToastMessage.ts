import type { UseCopyToastMessageResult } from '../Types/toast-logic.types.ts'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Toast } from '../../../lib/ToastStore/Types/toast.types.ts'

export function useCopyToastMessage(toast: Toast): UseCopyToastMessageResult {
    const [copied, setCopied] = useState(false)
    const copiedTimeoutRef = useRef<number | null>(null)
    const { title, content } = toast

    const clearCopiedTimeout = useCallback(() => {
        if (copiedTimeoutRef.current === null) return

        window.clearTimeout(copiedTimeoutRef.current)
        copiedTimeoutRef.current = null
    }, [])

    const copyToastMessage = useCallback(async () => {
        const toastMessage =
            title && content ? `${title}\n${content}` : title || content
        try {
            await navigator.clipboard.writeText(toastMessage)
            clearCopiedTimeout()
            setCopied(true)
            copiedTimeoutRef.current = window.setTimeout(() => {
                setCopied(false)
                copiedTimeoutRef.current = null
            }, 1500)

            return true
        } catch {
            clearCopiedTimeout()
            setCopied(false)

            return false
        }
    }, [clearCopiedTimeout, title, content])

    useEffect(() => clearCopiedTimeout, [clearCopiedTimeout])

    return {
        state: { copied },
        handler: { copyToastMessage },
    }
}
