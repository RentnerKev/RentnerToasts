import type { ToastTextToken } from '../../../lib/ToastText/Types/toast-text.types.ts'
import type { ToastType } from '../../../lib/ToastStore/Types/toast.types.ts'
import type { ToastCustomDesign } from './toast-ui.types.ts'
import type {
    Ref,
    RefCallback,
    RefObject,
    PointerEventHandler,
    MouseEventHandler,
} from 'react'
import type { ToastPresenceItem } from './toast-animation.types.ts'
import type { ToastMessages } from '../../../lib/Messages/Types/messages.types.ts'
import type {
    Toast,
    ToastApi,
    ToastId,
    ToastStore,
} from '../../../lib/ToastStore/Types/toast.types.ts'
import type {
    CustomToastProps,
    ToastProps,
    ToastProviderProps,
    UseCustomToastLogicResult,
} from './toast-ui.types.ts'

export interface ToastStoreContextValue {
    store: ToastStore
    toast: ToastApi
}

export interface ToastProviderLogicResult {
    state: {
        storeContext: ToastStoreContextValue
        surfaceProps: ToastProps
    }
}

export interface ToastSnapshotResult {
    state: { toasts: readonly Toast[]; visibleToasts: readonly Toast[] }
    handler: { handleRemoveToast: (id: ToastId) => void }
}

export interface ToastSurfaceResult {
    state: {
        regionId: string
        visibleToasts: readonly Toast[]
        messages: ToastMessages
        positionClasses: string
        anchorX: 'left' | 'right'
        anchorY: 'top' | 'bottom'
        items: ToastPresenceItem[]
    }
    handler: {
        handleRemoveToast: (id: ToastId) => void
        handleExitComplete: (id: string) => void
    }
    refs: { region: RefCallback<HTMLElement> }
}

export type CustomToastComponentProps = CustomToastProps & {
    ref?: Ref<HTMLDivElement>
    present?: boolean
    onExitComplete?: () => void
}

export interface CustomToastLogicResult {
    state: Omit<
        UseCustomToastLogicResult['state'],
        'toastIcon' | 'parsedTitle' | 'parsedContent'
    > & {
        parsedTitle: ToastTextToken[]
        parsedContent: ToastTextToken[]
        linkClassName: string
    }
    handler: UseCustomToastLogicResult['handler'] & {
        handlePointerDown: PointerEventHandler<HTMLDivElement>
        handlePointerMove: PointerEventHandler<HTMLDivElement>
        handlePointerUp: PointerEventHandler<HTMLDivElement>
        handlePointerCancel: PointerEventHandler<HTMLDivElement>
        handleLostPointerCapture: PointerEventHandler<HTMLDivElement>
        handleClickCapture: MouseEventHandler<HTMLDivElement>
    }
    refs: {
        setWrapperRef: RefCallback<HTMLDivElement>
        progress: RefObject<HTMLDivElement | null>
    }
}

export interface ToastTextProps {
    tokens: readonly ToastTextToken[]
    className: string
}
export interface ToastIconProps {
    className?: string
    type: ToastType
    customDesign?: ToastCustomDesign
}
export interface UseCopyToastMessageResult {
    state: {
        copied: boolean
    }
    handler: {
        copyToastMessage: () => Promise<boolean>
    }
}

export interface ToastInteractionProps {
    id: ToastId
    forwardedRef?: Ref<HTMLDivElement>
}
export interface ToastInteractionResult {
    refs: { setWrapperRef: RefCallback<HTMLDivElement> }
    handler: Pick<
        UseCustomToastLogicResult['handler'],
        'handleMouseEnter' | 'handleMouseLeave' | 'handleFocus' | 'handleBlur'
    >
}

export type ToastProviderLogicProps = Omit<ToastProviderProps, 'children'>
export type ToastSurfaceProps = Pick<
    ToastProps,
    'position' | 'locale' | 'messages'
>
