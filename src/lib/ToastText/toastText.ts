import type { ToastTextToken } from './Types/toast-text.types.ts'

const EMPTY_TOKENS: ToastTextToken[] = []
const LINK_EXPRESSION = /\[([^\]]+)]\(([^)]+)\)/g

export function isSafeToastLink(url: string) {
    try {
        const parsedUrl = new URL(url, 'https://rentnertoasts.invalid')

        return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
    } catch {
        return false
    }
}

export function parseToastText(text: string | undefined): ToastTextToken[] {
    if (!text) return EMPTY_TOKENS
    if (!text.includes('](')) return [{ kind: 'text', value: text }]
    LINK_EXPRESSION.lastIndex = 0
    const parts: ToastTextToken[] = []
    let end = 0
    let match: RegExpExecArray | null
    while ((match = LINK_EXPRESSION.exec(text)) !== null) {
        if (match.index > end)
            parts.push({ kind: 'text', value: text.slice(end, match.index) })
        parts.push(
            isSafeToastLink(match[2]!)
                ? {
                      kind: 'link',
                      value: match[1]!,
                      href: match[2]!,
                      offset: match.index,
                  }
                : { kind: 'text', value: match[0] },
        )
        end = LINK_EXPRESSION.lastIndex
    }
    if (end < text.length) parts.push({ kind: 'text', value: text.slice(end) })
    return parts
}
