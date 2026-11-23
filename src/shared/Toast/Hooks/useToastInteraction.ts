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

const returnFocusTargets = new WeakMap<Element, HTMLElement>()

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
        const previous = wrapper.current
        if (!node && previous?.contains(previous.ownerDocument.activeElement)) {
            const region = previous.closest('[data-rentner-toast-region]')
            const target = region && returnFocusTargets.get(region)
            if (target?.isConnected) target.focus({ preventScroll: true })
        }
        wrapper.current = node
    }, [])

    useEffect(() => {
        // A provider can switch store facades while keeping the same focused
        // toast DOM. Carry that display's active interaction to the new store.
        const reasons = interactionReasons.current
        if (reasons.hover) {
            store.setToastPauseReason(id, 'hover', true, pauseOwner)
        }
        if (reasons.focus) {
            store.setToastPauseReason(id, 'focus', true, pauseOwner)
        }
        return () => {
            if (reasons.hover) {
                store.setToastPauseReason(id, 'hover', false, pauseOwner)
            }
            if (reasons.focus) {
                store.setToastPauseReason(id, 'focus', false, pauseOwner)
            }
        }
    }, [pauseOwner, store, id])

    const setInteractionPause = useCallback(
        (reason: ToastPauseReason, paused: boolean) => {
            if (interactionReasons.current[reason] === paused) return
            interactionReasons.current[reason] = paused
            store.setToastPauseReason(id, reason, paused, pauseOwner)
        },
        [id, pauseOwner, store],
    )

    const handleMouseEnter = useCallback(
        () => setInteractionPause('hover', true),
        [setInteractionPause],
    )

    const handleMouseLeave = useCallback(
        () => setInteractionPause('hover', false),
        [setInteractionPause],
    )

    const handleFocus = useCallback(
        (event: FocusEvent<HTMLDivElement>) => {
            const region = event.currentTarget.closest(
                '[data-rentner-toast-region]',
            )
            const previous = event.relatedTarget
            if (
                region &&
                previous instanceof HTMLElement &&
                !region.contains(previous)
            ) {
                returnFocusTargets.set(region, previous)
            }
            setInteractionPause('focus', true)
        },
        [setInteractionPause],
    )

    const handleBlur = useCallback(
        (event: FocusEvent<HTMLDivElement>) => {
            if (
                !event.currentTarget.contains(
                    event.relatedTarget as Node | null,
                )
            ) {
                setInteractionPause('focus', false)
            }
        },
        [setInteractionPause],
    )

    return {
        refs: { setWrapperRef },
        handler: {
            handleMouseEnter,
            handleMouseLeave,
            handleFocus,
            handleBlur,
        },
    }
}
