import { Component, lazy, Suspense } from 'react'
import type {
    ToastChunkBoundaryProps,
    ToastChunkBoundaryState,
} from '../Types/toast-logic.types.ts'
import type { ToastProps, ToastProviderProps } from '../Types/toast-ui.types.ts'
import { ToastProviderBase } from './ToastProviderBase.tsx'
import { ToastFallback } from './ToastFallback.tsx'

const LazyToast = lazy(() =>
    import('./Toast.tsx').then(({ Toast }) => ({ default: Toast })),
)

class ToastChunkBoundary extends Component<
    ToastChunkBoundaryProps,
    ToastChunkBoundaryState
> {
    state = { failed: false }

    static getDerivedStateFromError() {
        return { failed: true }
    }

    render() {
        return this.state.failed ? this.props.fallback : this.props.children
    }
}

function LazyToastSurface(props: ToastProps) {
    const fallback = <ToastFallback {...props} />
    return (
        <ToastChunkBoundary fallback={<ToastFallback {...props} loadFailed />}>
            <Suspense fallback={fallback}>
                <LazyToast {...props} />
            </Suspense>
        </ToastChunkBoundary>
    )
}

export function LazyToastProvider(props: ToastProviderProps) {
    return <ToastProviderBase {...props} ToastUI={LazyToastSurface} />
}

export { useToast } from '../Hooks/useToastStore.ts'
export type { ToastProviderProps } from '../Types/toast-ui.types.ts'
