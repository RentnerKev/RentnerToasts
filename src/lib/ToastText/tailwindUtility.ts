export function hasTailwindUtility(
    className: string | undefined,
    utility: string,
) {
    return (
        className?.split(/\s+/).some((classToken) => {
            // Conditional variants must keep the unconditional fallback.
            // Colons inside arbitrary values are part of the utility itself.
            let depth = 0
            for (const character of classToken) {
                if (character === '[' || character === '(') depth += 1
                else if (character === ']' || character === ')') depth -= 1
                else if (character === ':' && depth === 0) return false
            }
            const baseUtility = classToken.replace(/^!|!$/g, '')

            return (
                baseUtility === utility ||
                baseUtility.startsWith(`${utility}-`) ||
                baseUtility.startsWith(`${utility}[`) ||
                baseUtility.startsWith(`${utility}(`)
            )
        }) ?? false
    )
}
