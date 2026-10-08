import { createContext } from 'react'
import type { ToastInteractionEntries } from '../Types/toast-logic.types.ts'

// A provider-local bridge between its temporary and animated DOM surfaces.
// Entries exist only during an active interaction's replacement commit.
export const ToastInteractionHandoff =
    createContext<ToastInteractionEntries | null>(null)
