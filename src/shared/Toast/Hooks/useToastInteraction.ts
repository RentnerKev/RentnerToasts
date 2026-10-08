import {
    useEffect,
    useCallback,
    useContext,
    useLayoutEffect,
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
import { ToastInteractionHandoff } from '../Context/ToastInteractionHandoff.ts'
export function useToastInteraction({
    id,
    forwardedRef,
    handoffOnUnmount = false,
}: ToastInteractionProps): ToastInteractionResult {
    const store = useToastStore()
    const [pauseOwner] = useState(() => Symbol('toast-interaction'))
    const interactionReasons = useRef({ hover: false, focus: false })
    const wrapper = useRef<HTMLDivElement | null>(null)
    useImperativeHandle(forwardedRef, () => wrapper.current!)
    const setWrapperRef = useCallback((node: HTMLDivElement | null) => {
        wrapper.current = node
    }, [])
    const handoff = useContext(ToastInteractionHandoff)
    useLayoutEffect(() => {
        const previous = handoff?.get(id)

        if (previous) {
            handoff!.delete(id)
            interactionReasons.current = { ...previous }
        }
        if (previous?.focus)
            wrapper.current
                ?.querySelector<HTMLButtonElement>('[data-toast-close]')
                ?.focus()
        for (const reason of ['hover', 'focus'] as const) {
            store.setToastPauseReason(
                id,
                reason,
                interactionReasons.current[reason],
                pauseOwner,
            )
        }
        // Replacing a hovered node does not guarantee a synthetic mouseleave
        // on its replacement. Release the transferred hover on the next move
        // outside this display, even if the animated entrance moved the card.
        function handlePointerMove(event: PointerEvent) {
            if (!wrapper.current?.contains(event.target as Node | null)) {
                interactionReasons.current.hover = false
                store.setToastPauseReason(id, 'hover', false, pauseOwner)
                document.removeEventListener(
                    'pointermove',
                    handlePointerMove,
                    true,
                )
            }
        }
        if (previous?.hover)
            document.addEventListener('pointermove', handlePointerMove, true)
        return () => {
            document.removeEventListener('pointermove', handlePointerMove, true)
            if (
                handoffOnUnmount &&
                handoff &&
                (interactionReasons.current.hover ||
                    interactionReasons.current.focus) &&
                store
                    .getToastSnapshot()
                    .slice(-store.getToastDefaults().maxVisibleToasts)
                    .some((toast) => toast.id === id)
            )
                handoff.set(id, { ...interactionReasons.current })
        }
    }, [handoff, handoffOnUnmount, pauseOwner, store, id])
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
