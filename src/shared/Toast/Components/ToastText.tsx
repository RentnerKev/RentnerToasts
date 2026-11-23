import { memo, type MouseEvent } from 'react'
import type { ToastTextProps } from '../Types/toast-logic.types.ts'

function stopLinkPropagation(event: MouseEvent<HTMLAnchorElement>) {
    event.stopPropagation()
}

export const ToastText = memo(function ToastText({
    tokens,
    className,
}: ToastTextProps) {
    return tokens.map((token, index) =>
        token.kind === 'text' ? (
            token.value
        ) : (
            <a
                key={token.offset ?? index}
                href={token.href}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
                onClick={stopLinkPropagation}
            >
                {token.value}
            </a>
        ),
    )
})
