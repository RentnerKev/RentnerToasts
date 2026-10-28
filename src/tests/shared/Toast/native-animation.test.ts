import { expect, test } from 'bun:test'
import {
    CLOSE_ICON_SPRING_DURATION,
    TOAST_SPRING_DURATION,
    getCloseIconFrames,
    getSpringProgress,
    getToastCornerTransform,
    getToastEnterFrames,
    getToastSnapBackFrames,
} from '../../../shared/Toast/Animations/nativeToastAnimation.ts'
import type { ToastPosition } from '../../../lib/ToastStore/Types/toast.types.ts'

test('entry follows the physical spring with an initial rest and slight overshoot', () => {
    expect(getSpringProgress(0)).toBe(0)
    expect(getSpringProgress(0.00001)).toBeLessThan(0.000001)
    expect(getSpringProgress(0.1)).toBeCloseTo(0.450646, 5)
    expect(getSpringProgress(0.45)).toBeGreaterThan(1)
    expect(getSpringProgress(TOAST_SPRING_DURATION / 1000)).toBeCloseTo(1, 3)
})

test('critical and overdamped springs approach rest without overshooting', () => {
    for (const damping of [20, 30]) {
        const values = Array.from({ length: 50 }, (_, index) =>
            getSpringProgress(index / 20, 100, damping),
        )
        expect(values[0]).toBe(0)
        expect(values.at(-1)).toBeCloseTo(1, 3)
        for (let index = 1; index < values.length; index++) {
            expect(values[index]).toBeGreaterThanOrEqual(values[index - 1]!)
            expect(values[index]).toBeLessThanOrEqual(1)
        }
    }
})

test('entry mirrors all four corners and finishes at exact identity', () => {
    const corners: [ToastPosition, number, number][] = [
        ['top-left', -100, -80],
        ['top-right', 100, -80],
        ['bottom-left', -100, 80],
        ['bottom-right', 100, 80],
    ]
    for (const [position, x, y] of corners) {
        const frames = getToastEnterFrames(position)
        expect(frames[0]).toEqual({
            offset: 0,
            transform: `translate3d(${x}px, ${y}px, 0) scale(0.9)`,
        })
        expect(getToastCornerTransform(position)).toBe(frames[0]!.transform)
        expect(frames.at(-1)).toEqual({
            offset: 1,
            transform: 'translate3d(0px, 0px, 0) scale(1)',
        })
        expect(getToastEnterFrames(position)).toBe(frames)
    }
})

test('drag recovery starts at the rendered displacement and scale', () => {
    for (const x of [-72, 0, 72]) {
        const frames = getToastSnapBackFrames(x)
        expect(frames[0]!.transform).toBe(
            `translate3d(${x}px, 0, 0) scale(1.02)`,
        )
        expect(frames.at(-1)!.transform).toBe('translate3d(0px, 0, 0) scale(1)')
    }
    expect(getToastSnapBackFrames(10, 1)[0]!.transform).toBe(
        'translate3d(10px, 0, 0) scale(1)',
    )
})

function readSnapBackFrame(frame: Keyframe) {
    const transform = String(frame.transform)
    return {
        x: Number.parseFloat(transform.slice('translate3d('.length)),
        scale: Number.parseFloat(transform.split('scale(')[1]!),
    }
}

test('drag displacement returns monotonically while scale retains its own spring', () => {
    for (const sign of [-1, 1]) {
        const frames = getToastSnapBackFrames(sign * 72)
        let prior = 72
        for (const frame of frames) {
            const { x } = readSnapBackFrame(frame)
            expect(x * sign).toBeGreaterThanOrEqual(0)
            expect(x * sign).toBeLessThanOrEqual(prior)
            prior = x * sign
        }
        const middle = frames[54]!
        const { x, scale } = readSnapBackFrame(middle)
        expect(Math.abs(x)).toBeGreaterThan(5)
        expect(scale).toBeLessThan(1)
        expect(scale).toBeCloseTo(1 + 0.02 * (1 - getSpringProgress(0.45)), 10)
    }
})

test('drag recovery incorporates initial horizontal velocity and mirrors direction', () => {
    const stationary = getToastSnapBackFrames(30, 1)
    const outward = getToastSnapBackFrames(30, 1, 300)
    const inward = getToastSnapBackFrames(30, 1, -300)
    const mirrored = getToastSnapBackFrames(-30, 1, -300)
    expect(readSnapBackFrame(outward[1]!).x).toBeGreaterThan(30)
    expect(readSnapBackFrame(inward[1]!).x).toBeLessThan(
        readSnapBackFrame(stationary[1]!).x,
    )
    for (let index = 0; index < outward.length; index++) {
        const value = readSnapBackFrame(outward[index]!)
        expect(readSnapBackFrame(mirrored[index]!).x).toBeCloseTo(-value.x, 10)
        expect(value.scale).toBe(1)
    }
    expect(outward.at(-1)!.transform).toBe('translate3d(0px, 0, 0) scale(1)')
})

test('close rotation keeps its stronger spring and returns precisely to rest', () => {
    expect(CLOSE_ICON_SPRING_DURATION).toBe(TOAST_SPRING_DURATION)
    const hover = getCloseIconFrames(0, 90)
    expect(hover[0]!.transform).toBe('rotate(0deg)')
    expect(hover.at(-1)!.transform).toBe('rotate(90deg)')
    expect(
        hover.some(
            (frame) => Number.parseFloat(String(frame.transform).slice(7)) > 90,
        ),
    ).toBe(true)
    const idle = getCloseIconFrames(90, 0)
    expect(idle[0]!.transform).toBe('rotate(90deg)')
    expect(idle.at(-1)!.transform).toBe('rotate(0deg)')
})
