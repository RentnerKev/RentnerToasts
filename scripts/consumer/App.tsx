import { createToastStore, ToastProvider, useToast } from '@rentnerkev/toasts'
import { useState } from 'react'

function Controls() {
    const toast = useToast()
    return (
        <button
            type="button"
            className="px-4 py-2"
            onClick={() => toast.info('Consumer notification', { duration: 0 })}
        >
            Show toast
        </button>
    )
}

export function App() {
    const [store] = useState(() => createToastStore())
    const [className, setClassName] = useState('')
    return (
        <>
            <label htmlFor="toast-style">Toast style</label>
            <select
                id="toast-style"
                value={className}
                onChange={(event) => setClassName(event.target.value)}
            >
                <option value="">Default</option>
                <option value="px-8">Horizontal padding</option>
                <option value="py-8">Vertical padding</option>
                <option value="hover:p-8">Hover padding</option>
                <option value="sm:w-96">Responsive width</option>
            </select>
            <ToastProvider
                store={store}
                position="bottom-left"
                locale="en"
                className={className}
            >
                <Controls />
            </ToastProvider>
        </>
    )
}
