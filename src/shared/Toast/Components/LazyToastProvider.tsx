import { Component, lazy, Suspense } from 'react'
import type {
    ToastChunkBoundaryProps,
    ToastChunkBoundaryState,
} from '../Types/toast-logic.types.js'
import type { ToastProps, ToastProviderProps } from '../Types/toast-ui.types.js'
import { ToastProviderBase } from './ToastProviderBase.js'
import { ToastFallback } from './ToastFallback.js'

const LazyToast = lazy(() =>
    import('./Toast.js').then(({ Toast }) => ({ default: Toast })),
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

export { useToast } from '../Hooks/useToastStore.js'
export type { ToastProviderProps } from '../Types/toast-ui.types.js'
