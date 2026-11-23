import type { ToastPosition } from '../../../lib/ToastStore/Types/toast.types.ts'

export const TOAST_SPRING_DURATION = 800
export const CLOSE_ICON_SPRING_DURATION = 800

const SPRING_SAMPLES = 96
const SPRING_POINTS = SPRING_SAMPLES + 1

// Unit mass, zero initial velocity: the same physical spring as the old transitions.
export function getSpringProgress(
    seconds: number,
    stiffness = 200,
    damping = 24,
): number {
    const time = Math.max(0, seconds)
    const decay = damping / 2
    const frequencySquared = stiffness - decay * decay

    if (frequencySquared > 0) {
        const frequency = Math.sqrt(frequencySquared)
        return (
            1 -
            Math.exp(-decay * time) *
                (Math.cos(frequency * time) +
                    (decay / frequency) * Math.sin(frequency * time))
        )
    }

    if (frequencySquared === 0) {
        return 1 - Math.exp(-decay * time) * (1 + decay * time)
    }

    const frequency = Math.sqrt(-frequencySquared)
    const slow = -decay + frequency
    const fast = -decay - frequency
    return (
        1 -
        (fast * Math.exp(slow * time) - slow * Math.exp(fast * time)) /
            (fast - slow)
    )
}

const springCurveCache = new Map<string, Float64Array>()
let snapBackTables: {
    xRemaining: Float64Array
    velocityFactor: Float64Array
    scaleRemaining: Float64Array
} | null = null

function getSpringCurve(stiffness: number, damping: number): Float64Array {
    const key = `${stiffness}:${damping}`
    let curve = springCurveCache.get(key)
    if (!curve) {
        curve = new Float64Array(SPRING_POINTS)
        for (let index = 0; index < SPRING_SAMPLES; index += 1) {
            curve[index] = getSpringProgress(
                ((index / SPRING_SAMPLES) * TOAST_SPRING_DURATION) / 1000,
                stiffness,
                damping,
            )
        }
        curve[SPRING_SAMPLES] = 1
        springCurveCache.set(key, curve)
    }
    return curve
}

function getSnapBackTables() {
    if (!snapBackTables) {
        const xCurve = getSpringCurve(200, 40)
        const scaleCurve = getSpringCurve(200, 24)
        const xRemaining = new Float64Array(SPRING_POINTS)
        const velocityFactor = new Float64Array(SPRING_POINTS)
        const scaleRemaining = new Float64Array(SPRING_POINTS)
        const frequency = Math.sqrt(200)
        const slow = -20 + frequency
        const fast = -20 - frequency
        const invDiff = 1 / (slow - fast)
        for (let index = 0; index < SPRING_SAMPLES; index += 1) {
            const seconds =
                ((index / SPRING_SAMPLES) * TOAST_SPRING_DURATION) / 1000
            xRemaining[index] = 1 - xCurve[index]!
            velocityFactor[index] =
                (Math.exp(slow * seconds) - Math.exp(fast * seconds)) * invDiff
            scaleRemaining[index] = 1 - scaleCurve[index]!
        }
        snapBackTables = { xRemaining, velocityFactor, scaleRemaining }
    }
    return snapBackTables
}

export function createSpringFrames(
    from: number,
    to: number,
    stiffness: number,
    damping: number,
    format: (value: number) => string,
): Keyframe[] {
    const curve = getSpringCurve(stiffness, damping)
    const delta = to - from
    const frames: Keyframe[] = []
    for (let index = 0; index < SPRING_POINTS; index += 1) {
        frames.push({
            offset: index / SPRING_SAMPLES,
            transform: format(from + delta * curve[index]!),
        })
    }
    return frames
}

function toastTransform(position: ToastPosition, progress: number): string {
    const remaining = 1 - progress
    const x = (position.includes('right') ? 100 : -100) * remaining
    const y = (position.includes('top') ? -80 : 80) * remaining
    return `translate3d(${x}px, ${y}px, 0) scale(${1 - 0.1 * remaining})`
}

export function getToastCornerTransform(position: ToastPosition): string {
    return toastTransform(position, 0)
}

const enterFrames = new Map<ToastPosition, Keyframe[]>()

export function getToastEnterFrames(position: ToastPosition): Keyframe[] {
    let frames = enterFrames.get(position)
    if (!frames) {
        frames = createSpringFrames(0, 1, 200, 24, (progress) =>
            toastTransform(position, progress),
        )
        enterFrames.set(position, frames)
    }
    return frames
}

export function getToastSnapBackFrames(
    x: number,
    scale = 1.02,
    velocity = 0,
): Keyframe[] {
    // Drag constraints use Motion's overdamped bounce spring, whereas scale
    // returns through the toast's own 200/24 transition.
    const { xRemaining, velocityFactor, scaleRemaining } = getSnapBackTables()
    const scaleDelta = scale - 1
    const frames: Keyframe[] = []
    for (let index = 0; index < SPRING_POINTS; index += 1) {
        const displacement =
            index === SPRING_SAMPLES
                ? 0
                : x * xRemaining[index]! + velocity * velocityFactor[index]!
        const frameScale =
            index === SPRING_SAMPLES
                ? 1
                : 1 + scaleDelta * scaleRemaining[index]!
        frames.push({
            offset: index / SPRING_SAMPLES,
            transform: `translate3d(${displacement}px, 0, 0) scale(${frameScale})`,
        })
    }
    return frames
}

export function getCloseIconFrames(from: number, to: number): Keyframe[] {
    return createSpringFrames(
        from,
        to,
        300,
        20,
        (angle) => `rotate(${angle}deg)`,
    )
}
