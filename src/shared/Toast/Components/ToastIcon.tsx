import { AlertCircle, CheckCircle, Info, TriangleAlert } from 'lucide-react'
import type { ToastIconProps } from '../Types/toast-logic.types.ts'
export function ToastIcon({ type, customDesign, className }: ToastIconProps) {
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
            ? 'text-rentner-success'
            : type === 'error'
              ? 'text-rentner-danger'
              : type === 'warning'
                ? 'text-rentner-warning'
                : 'text-rentner-info'
    return (
        <Icon
            size={18}
            aria-hidden="true"
            className={className ?? customDesign?.[`${type}Icon`] ?? color}
        />
    )
}
