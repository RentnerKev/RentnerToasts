import { expect, test } from 'bun:test'
import { getToastSwipeVelocity } from '../../../shared/Toast/Hooks/useToastSwipe.ts'

test('retains the boundary anchor for a fast short swipe', () => {
    const samples = [
        { x: 0, time: 0 },
        { x: 65, time: 118 },
    ]
    expect(getToastSwipeVelocity(samples, 65, 120)).toBeGreaterThan(400)
    expect(
        getToastSwipeVelocity(
            samples.map((sample) => ({ ...sample, x: -sample.x })),
            -65,
            120,
        ),
    ).toBeLessThan(-400)
})

test('does not reuse swipe momentum after the pointer has stopped', () => {
    const samples = [
        { x: 0, time: 0 },
        { x: 65, time: 50 },
    ]
    expect(getToastSwipeVelocity(samples, 65, 250)).toBe(0)
    expect(
        getToastSwipeVelocity(
            [
                { x: 0, time: 0 },
                { x: 65, time: 500 },
            ],
            65,
            510,
        ),
    ).toBeLessThan(400)
})

test('ignores empty and zero-time histories without mutating the samples', () => {
    const samples = Object.freeze([Object.freeze({ x: 0, time: 10 })])
    expect(getToastSwipeVelocity([], 65, 10)).toBe(0)
    expect(getToastSwipeVelocity(samples, 65, 10)).toBe(0)
    expect(samples).toEqual([{ x: 0, time: 10 }])
})
