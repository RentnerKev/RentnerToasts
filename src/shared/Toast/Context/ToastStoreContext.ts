import { createContext } from 'react'
import { defaultToastStore } from '../../../toast.js'
import type { ToastStoreContextValue } from '../Types/toast-logic.types.js'

export const ToastStoreContext = createContext<ToastStoreContextValue>({
    store: defaultToastStore,
    toast: defaultToastStore.toast,
})
