import { createContext } from 'react'
import { defaultToastStore } from '../../../lib/ToastStore/toastApi.ts'
import type { ToastStoreContextValue } from '../Types/toast-logic.types.ts'

export const ToastStoreContext = createContext<ToastStoreContextValue>({
    store: defaultToastStore,
    toast: defaultToastStore.toast,
})
