import type {
    ToastApi,
    ToastStore,
} from '../../../lib/ToastStore/Types/toast.types.ts'
import { useContext } from 'react'
import { ToastStoreContext } from '../Context/ToastStoreContext.ts'

export function useToastStore(): ToastStore {
    return useContext(ToastStoreContext).store
}

export function useToast(): ToastApi {
    return useContext(ToastStoreContext).toast
}
