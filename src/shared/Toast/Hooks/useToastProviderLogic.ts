import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { defaultToastStore } from '../../../lib/ToastStore/toastApi.ts'
import { registerToastProviderDefaults } from '../../../lib/ToastStore/toastStore.ts'
import type { ToastStore } from '../../../lib/ToastStore/Types/toast.types.ts'
import type {
    ToastProviderLogicResult,
    ToastProviderLogicProps,
} from '../Types/toast-logic.types.ts'

const useIsomorphicLayoutEffect =
    typeof window === 'undefined' ? useEffect : useLayoutEffect

export function useToastProviderLogic({
    store = defaultToastStore,
    customDesign,
    classNames,
    portalContainer,
    portalClassName,
    portalZIndex,
    position = 'bottom-right',
    className,
    locale = 'de',
    messages,
    defaultDuration,
    maxVisibleToasts,
    pauseWhenQueued,
}: ToastProviderLogicProps): ToastProviderLogicResult {
    const [defaultsOwner] = useState(() => Symbol('toast-provider-defaults'))
    const defaultsDisposers = useRef<Map<ToastStore, () => void> | null>(null)

    useIsomorphicLayoutEffect(() => {
        const dispose = registerToastProviderDefaults(store, defaultsOwner, {
            duration: defaultDuration,
            maxVisibleToasts,
            pauseWhenQueued,
        })
        const disposers = (defaultsDisposers.current ??= new Map())
        disposers.set(store, dispose)
    }, [
        defaultDuration,
        defaultsOwner,
        maxVisibleToasts,
        pauseWhenQueued,
        store,
    ])

    // Changing values preserves provider precedence; only unmount/store switch
    // releases this owner's registration.
    useIsomorphicLayoutEffect(() => {
        return () => {
            const disposers = defaultsDisposers.current
            if (!disposers) return
            disposers.get(store)?.()
            disposers.delete(store)
        }
    }, [store])

    const storeContext = useMemo(() => ({ store, toast: store.toast }), [store])

    const hasCustomDesign = customDesign !== undefined
    const stableCustomDesign = useMemo(
        () => (hasCustomDesign ? customDesign : undefined),
        // oxlint-disable-next-line react-hooks/exhaustive-deps -- stabilize inline customDesign props by field values
        [
            hasCustomDesign,
            customDesign?.wrapper,
            customDesign?.successWrapper,
            customDesign?.errorWrapper,
            customDesign?.infoWrapper,
            customDesign?.warningWrapper,
            customDesign?.successIcon,
            customDesign?.errorIcon,
            customDesign?.infoIcon,
            customDesign?.warningIcon,
            customDesign?.successProgress,
            customDesign?.errorProgress,
            customDesign?.infoProgress,
            customDesign?.warningProgress,
            customDesign?.titleText,
            customDesign?.contentText,
            customDesign?.closeButton,
            customDesign?.copyButton,
            customDesign?.linkText,
        ],
    )

    const hasClassNames = classNames !== undefined
    const stableClassNames = useMemo(
        () => (hasClassNames ? classNames : undefined),
        // oxlint-disable-next-line react-hooks/exhaustive-deps -- stabilize inline classNames props by field values
        [
            hasClassNames,
            classNames?.region,
            classNames?.root,
            classNames?.icon,
            classNames?.body,
            classNames?.title,
            classNames?.content,
            classNames?.actionButton,
            classNames?.actions,
            classNames?.closeButton,
            classNames?.closeIcon,
            classNames?.copyButton,
            classNames?.copyIcon,
            classNames?.buttonOverlay,
            classNames?.progress,
            classNames?.link,
        ],
    )

    const hasMessages = messages !== undefined
    const stableMessages = useMemo(
        () => (hasMessages ? messages : undefined),
        // oxlint-disable-next-line react-hooks/exhaustive-deps -- stabilize inline messages props by field values
        [
            hasMessages,
            messages?.regionLabel,
            messages?.closeNotification,
            messages?.copyError,
            messages?.errorCopied,
        ],
    )

    return {
        state: {
            storeContext,
            surfaceProps: {
                customDesign: stableCustomDesign,
                classNames: stableClassNames,
                portalContainer,
                portalClassName,
                portalZIndex,
                position,
                className,
                locale,
                messages: stableMessages,
            },
        },
    }
}
