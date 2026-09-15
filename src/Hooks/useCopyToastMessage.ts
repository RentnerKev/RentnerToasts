import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Toast } from '../types.js'

interface UseCopyToastMessageResult {
    state: {
        copied: boolean
    }
    handler: {
        clearCopiedTimeout: () => void
        copyToastMessage: () => Promise<boolean>
    }
    setter: {
        setCopied: (copied: boolean) => void
    }
}

export function useCopyToastMessage(toast: Toast): UseCopyToastMessageResult {
    const [copied, setCopied] = useState(false)
    const copiedTimeoutRef = useRef<number | null>(null)

    const toastMessage = useMemo(
        () => [toast.title, toast.content].filter(Boolean).join('\n'),
        [toast.title, toast.content],
    )

    const clearCopiedTimeout = useCallback(() => {
        if (copiedTimeoutRef.current === null) return

        window.clearTimeout(copiedTimeoutRef.current)
        copiedTimeoutRef.current = null
    }, [])

    const copyToastMessage = useCallback(async () => {
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
    }, [clearCopiedTimeout, toastMessage])

    useEffect(() => clearCopiedTimeout, [clearCopiedTimeout])

    return {
        state: { copied },
        handler: { clearCopiedTimeout, copyToastMessage },
        setter: { setCopied },
    }
}
