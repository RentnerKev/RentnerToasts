import {
    useEffect,
    useCallback,
    useImperativeHandle,
    useRef,
    useState,
} from 'react'
import type { FocusEvent } from 'react'
import type { ToastPauseReason } from '../../../lib/ToastStore/Types/toast.types.ts'
import type {
    ToastInteractionProps,
    ToastInteractionResult,
} from '../Types/toast-logic.types.ts'
import { useToastStore } from './useToastStore.ts'
export function useToastInteraction({
    id,
    forwardedRef,
}: ToastInteractionProps): ToastInteractionResult {
    const store = useToastStore()
    const [pauseOwner] = useState(() => Symbol('toast-interaction'))
    const interactionReasons = useRef({ hover: false, focus: false })
    const wrapper = useRef<HTMLDivElement | null>(null)
    useImperativeHandle(forwardedRef, () => wrapper.current!)
    const setWrapperRef = useCallback((node: HTMLDivElement | null) => {
        wrapper.current = node
    }, [])
    useEffect(() => {
        // A provider can switch store facades while keeping the same focused
        // toast DOM. Carry that display's active interaction to the new store.
        for (const reason of ['hover', 'focus'] as const) {
            store.setToastPauseReason(
                id,
                reason,
                interactionReasons.current[reason],
                pauseOwner,
            )
        }
        return () => {
            store.setToastPauseReason(id, 'hover', false, pauseOwner)
            store.setToastPauseReason(id, 'focus', false, pauseOwner)
        }
    }, [pauseOwner, store, id])

    function setInteractionPause(reason: ToastPauseReason, paused: boolean) {
        interactionReasons.current[reason] = paused
        store.setToastPauseReason(id, reason, paused, pauseOwner)
    }

    function handleBlur(event: FocusEvent<HTMLDivElement>) {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setInteractionPause('focus', false)
        }
    }

    return {
        refs: { setWrapperRef },
        handler: {
            handleMouseEnter: () => setInteractionPause('hover', true),
            handleMouseLeave: () => setInteractionPause('hover', false),
            handleFocus: () => setInteractionPause('focus', true),
            handleBlur,
        },
    }
}
