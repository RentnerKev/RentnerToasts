import type { ToastTextToken } from '../../../lib/ToastText/Types/toast-text.types.ts'
import type { ToastType } from '../../../lib/ToastStore/Types/toast.types.ts'
import type { ToastCustomDesign } from './toast-ui.types.ts'
import type { Ref, RefCallback } from 'react'
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
        hasToasts: boolean
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
        visibleToasts: readonly Toast[]
        messages: ToastMessages
        positionClasses: string
        anchorX: 'left' | 'right'
        anchorY: 'top' | 'bottom'
    }
    handler: { handleRemoveToast: (id: ToastId) => void }
}

export type CustomToastComponentProps = CustomToastProps & {
    ref?: Ref<HTMLDivElement>
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
    handler: UseCustomToastLogicResult['handler']
    refs: { setWrapperRef: RefCallback<HTMLDivElement> }
}

export interface ToastTextProps {
    tokens: readonly ToastTextToken[]
    className: string
}
export interface ToastIconProps {
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
