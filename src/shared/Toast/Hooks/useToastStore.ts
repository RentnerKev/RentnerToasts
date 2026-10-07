import type {
    ToastApi,
    ToastStore,
} from '../../../lib/ToastStore/Types/toast.types.js'
import { useContext } from 'react'
import { ToastStoreContext } from '../Context/ToastStoreContext.js'

export function useToastStore(): ToastStore {
    return useContext(ToastStoreContext).store
}

export function useToast(): ToastApi {
    return useContext(ToastStoreContext).toast
}
