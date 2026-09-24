import { createContext, useContext } from 'react'
import { defaultToastStore } from './toast.js'
import type { ToastApi, ToastStore } from './types.js'

interface ToastStoreContextValue {
    store: ToastStore
    toast: ToastApi
}

export const ToastStoreContext = createContext<ToastStoreContextValue>({
    store: defaultToastStore,
    toast: defaultToastStore.toast,
})

export function useToastStore() {
    return useContext(ToastStoreContext).store
}

export function useToast() {
    return useContext(ToastStoreContext).toast
}
