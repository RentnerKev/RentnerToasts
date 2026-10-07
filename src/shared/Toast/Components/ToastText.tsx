import type { ToastTextProps } from '../Types/toast-logic.types.js'
export function ToastText({ tokens, className }: ToastTextProps) {
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
                onClick={(event) => event.stopPropagation()}
            >
                {token.value}
            </a>
        ),
    )
}
