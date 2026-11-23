function isWhitespace(code: number): boolean {
    return (
        code === 32 || code === 9 || code === 10 || code === 13 || code === 12
    )
}

function tokenHasUnscopedVariant(
    className: string,
    start: number,
    end: number,
): boolean {
    // Conditional variants must keep the unconditional fallback.
    // Colons inside arbitrary values are part of the utility itself.
    let depth = 0
    for (let i = start; i < end; i += 1) {
        const code = className.charCodeAt(i)
        if (code === 91 || code === 40) depth += 1
        else if (code === 93 || code === 41) depth -= 1
        else if (code === 58 && depth === 0) return true
    }
    return false
}

function tokenMatchesUtility(
    className: string,
    start: number,
    end: number,
    utility: string,
): boolean {
    // Strip leading and/or trailing '!' (important modifier).
    if (start < end && className.charCodeAt(start) === 33) start += 1
    if (start < end && className.charCodeAt(end - 1) === 33) end -= 1
    const uLen = utility.length
    const tLen = end - start
    if (tLen < uLen) return false
    for (let i = 0; i < uLen; i += 1) {
        if (className.charCodeAt(start + i) !== utility.charCodeAt(i)) {
            return false
        }
    }
    if (tLen === uLen) return true
    const next = className.charCodeAt(start + uLen)
    return next === 45 || next === 91 || next === 40
}

export function hasTailwindUtility(
    className: string | undefined,
    utility: string,
) {
    if (!className) return false
    const len = className.length
    let i = 0
    while (i < len) {
        while (i < len && isWhitespace(className.charCodeAt(i))) i += 1
        if (i >= len) break
        const start = i
        while (i < len && !isWhitespace(className.charCodeAt(i))) i += 1
        if (
            !tokenHasUnscopedVariant(className, start, i) &&
            tokenMatchesUtility(className, start, i, utility)
        ) {
            return true
        }
    }
    return false
}

// Bitmask flags for default wrapper utilities: w, rounded, p, px, py, shadow.
export const DEFAULT_UTILITY_W = 1
export const DEFAULT_UTILITY_ROUNDED = 2
export const DEFAULT_UTILITY_P = 4
export const DEFAULT_UTILITY_PX = 8
export const DEFAULT_UTILITY_PY = 16
export const DEFAULT_UTILITY_SHADOW = 32

export function getPresentDefaultUtilities(
    className: string | undefined,
): number {
    if (!className) return 0
    let mask = 0
    const len = className.length
    let i = 0
    while (i < len) {
        while (i < len && isWhitespace(className.charCodeAt(i))) i += 1
        if (i >= len) break
        const start = i
        while (i < len && !isWhitespace(className.charCodeAt(i))) i += 1
        if (tokenHasUnscopedVariant(className, start, i)) continue
        let s = start
        let e = i
        if (s < e && className.charCodeAt(s) === 33) s += 1
        if (s < e && className.charCodeAt(e - 1) === 33) e -= 1
        if (s >= e) continue
        const first = className.charCodeAt(s)
        if (first === 119) {
            if (tokenMatchesUtility(className, s, e, 'w')) {
                mask |= DEFAULT_UTILITY_W
            }
        } else if (first === 114) {
            if (tokenMatchesUtility(className, s, e, 'rounded')) {
                mask |= DEFAULT_UTILITY_ROUNDED
            }
        } else if (first === 112) {
            if (tokenMatchesUtility(className, s, e, 'p')) {
                mask |= DEFAULT_UTILITY_P
            } else if (tokenMatchesUtility(className, s, e, 'px')) {
                mask |= DEFAULT_UTILITY_PX
            } else if (tokenMatchesUtility(className, s, e, 'py')) {
                mask |= DEFAULT_UTILITY_PY
            }
        } else if (first === 115) {
            if (tokenMatchesUtility(className, s, e, 'shadow')) {
                mask |= DEFAULT_UTILITY_SHADOW
            }
        }
    }
    return mask
}
