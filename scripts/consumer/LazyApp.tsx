import { useEffect, useState } from 'react'
import { LazyToastProvider, useToast } from '@rentnerkev/toasts/lazy-provider'
import { createToastStore } from '@rentnerkev/toasts/toast'

function CompatibleControls() {
    const toast = useToast()
    return (
        <>
            {(['info', 'success', 'error', 'warning'] as const).map((type) => (
                <button
                    key={type}
                    type="button"
                    onClick={() =>
                        toast[type](
                            '<safe content> [documentation](https://example.com/docs)',
                            { title: `${type} title`, duration: 0 },
                        )
                    }
                >
                    Show compatible {type}
                </button>
            ))}
            <button
                type="button"
                onClick={() =>
                    toast.info('Timed compatible notification', {
                        duration: 1200,
                    })
                }
            >
                Show timed compatible toast
            </button>
            <button type="button" onClick={() => toast.dismissAll()}>
                Clear compatible notifications
            </button>
        </>
    )
}

export function LazyApp() {
    const [store] = useState(() => createToastStore())
    const [light, setLight] = useState(false)
    useEffect(() => {
        document.documentElement.dataset.hydrated = 'true'
        return () => store.dispose()
    }, [store])
    return (
        <main>
            <h1>Compatible packaged consumer</h1>
            <label>
                <input
                    type="checkbox"
                    checked={light}
                    onChange={(event) => setLight(event.target.checked)}
                />
                Light design
            </label>
            <LazyToastProvider
                store={store}
                locale="en"
                customDesign={
                    light
                        ? {
                              successWrapper:
                                  'bg-white border-gray-300 text-gray-950',
                              errorWrapper:
                                  'bg-white border-gray-300 text-gray-950',
                              infoWrapper:
                                  'bg-white border-gray-300 text-gray-950',
                              warningWrapper:
                                  'bg-white border-gray-300 text-gray-950',
                              titleText: 'text-gray-950',
                              contentText: 'text-gray-700',
                              closeButton: 'text-gray-700',
                              copyButton: 'text-gray-700',
                              linkText: 'text-blue-700 underline',
                          }
                        : undefined
                }
            >
                <CompatibleControls />
            </LazyToastProvider>
        </main>
    )
}
