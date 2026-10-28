import type { ToastPosition } from '../../../lib/ToastStore/Types/toast.types.ts'

export const TOAST_SPRING_DURATION = 800
export const CLOSE_ICON_SPRING_DURATION = 800

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

export function createSpringFrames(
    from: number,
    to: number,
    stiffness: number,
    damping: number,
    format: (value: number) => string,
): Keyframe[] {
    const samples = 96
    return Array.from({ length: samples + 1 }, (_, index) => {
        const offset = index / samples
        const progress =
            index === samples
                ? 1
                : getSpringProgress(
                      (offset * TOAST_SPRING_DURATION) / 1000,
                      stiffness,
                      damping,
                  )
        return { offset, transform: format(from + (to - from) * progress) }
    })
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

export function getToastSnapBackFrames(x: number, scale = 1.02): Keyframe[] {
    return createSpringFrames(0, 1, 200, 24, (progress) => {
        const remaining = 1 - progress
        return `translate3d(${x * remaining}px, 0, 0) scale(${1 + (scale - 1) * remaining})`
    })
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
