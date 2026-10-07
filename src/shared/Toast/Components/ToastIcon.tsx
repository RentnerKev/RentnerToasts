import { AlertCircle, CheckCircle, Info, TriangleAlert } from 'lucide-react'
import type { ToastIconProps } from '../Types/toast-logic.types.js'
export function ToastIcon({ type, customDesign }: ToastIconProps) {
    const Icon =
        type === 'success'
            ? CheckCircle
            : type === 'error'
              ? AlertCircle
              : type === 'warning'
                ? TriangleAlert
                : type === 'info'
                  ? Info
                  : null
    if (!Icon) return null
    const color =
        type === 'success'
            ? 'text-emerald-400'
            : type === 'error'
              ? 'text-rose-400'
              : type === 'warning'
                ? 'text-amber-400'
                : 'text-blue-400'
    return (
        <Icon
            size={18}
            aria-hidden="true"
            className={customDesign?.[`${type}Icon`] || color}
        />
    )
}
