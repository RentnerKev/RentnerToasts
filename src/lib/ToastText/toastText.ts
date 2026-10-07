import type { ToastTextToken } from './Types/toast-text.types.js'
export function isSafeToastLink(url: string) {
    try {
        const parsedUrl = new URL(url, 'https://rentnertoasts.invalid')

        return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
    } catch {
        return false
    }
}

export function parseToastText(text: string | undefined): ToastTextToken[] {
    if (!text) return []
    const expression = /\[([^\]]+)]\(([^)]+)\)/g
    const parts: ToastTextToken[] = []
    let end = 0
    let match
    while ((match = expression.exec(text)) !== null) {
        if (match.index > end)
            parts.push({ kind: 'text', value: text.slice(end, match.index) })
        parts.push(
            isSafeToastLink(match[2])
                ? {
                      kind: 'link',
                      value: match[1],
                      href: match[2],
                      offset: match.index,
                  }
                : { kind: 'text', value: match[0] },
        )
        end = expression.lastIndex
    }
    if (end < text.length) parts.push({ kind: 'text', value: text.slice(end) })
    return parts
}
