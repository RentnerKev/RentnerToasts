import { useLayoutEffect, useRef, useState } from 'react'
import type { ToastPosition } from '../../../lib/ToastStore/Types/toast.types.ts'
import type {
    ToastLayoutBox,
    ToastPresenceItem,
} from '../Types/toast-animation.types.ts'

const POPPED_STYLE_PROPERTIES = [
    'position',
    'width',
    'height',
    'pointer-events',
    'left',
    'right',
    'top',
    'bottom',
] as const

export function useToastLayout(
    items: readonly ToastPresenceItem[],
    position: ToastPosition,
    reducedMotion: boolean,
) {
    const [region, setRegion] = useState<HTMLElement | null>(null)
    const boxes = useRef<Map<HTMLElement, ToastLayoutBox> | null>(null)
    const animations = useRef<Map<HTMLElement, Animation> | null>(null)
    const popped = useRef<Set<HTMLElement> | null>(null)
    const observerRef = useRef<ResizeObserver | null>(null)
    const observedRef = useRef<Set<Element> | null>(null)
    const updateRef = useRef<(() => void) | null>(null)
    const lastStructureRef = useRef<string | null>(null)

    useLayoutEffect(() => {
        const parent = region
        if (!parent) {
            observerRef.current?.disconnect()
            observerRef.current = null
            observedRef.current?.clear()
            if (animations.current) {
                for (const animation of animations.current.values())
                    animation.cancel()
                animations.current.clear()
            }
            boxes.current?.clear()
            popped.current?.clear()
            lastStructureRef.current = null
            return
        }
        const observer = new ResizeObserver(() => {
            updateRef.current?.()
        })
        const observed = (observedRef.current ??= new Set())
        observed.clear()
        observer.observe(parent)
        observed.add(parent)
        observerRef.current = observer
        return () => {
            observer.disconnect()
            if (observerRef.current === observer) observerRef.current = null
            observed.clear()
        }
    }, [region])

    useLayoutEffect(() => {
        const parent = region
        if (!parent) return
        const previous = (boxes.current ??= new Map())
        const running = (animations.current ??= new Map())
        const exiting = (popped.current ??= new Set())
        const presence = new Map<string, boolean>()
        let structureKey = `${position}:${reducedMotion ? '1' : '0'}`
        for (let index = 0; index < items.length; index += 1) {
            const item = items[index]!
            presence.set(item.toast.id, item.present)
            structureKey += `|${item.toast.id}:${item.present ? '1' : '0'}`
        }

        const isRight = position.includes('right')
        const isBottom = position.includes('bottom')

        function updateLayout() {
            const children = parent!.children
            const nodes: HTMLElement[] = []
            const live = new Set<HTMLElement>()
            for (let index = 0; index < children.length; index += 1) {
                const node = children[index]
                if (node instanceof HTMLElement) {
                    nodes.push(node)
                    live.add(node)
                }
            }
            for (const [node, animation] of running) {
                if (!live.has(node) || reducedMotion) {
                    animation.cancel()
                    running.delete(node)
                }
            }
            for (const node of previous.keys()) {
                if (!live.has(node)) {
                    previous.delete(node)
                    exiting.delete(node)
                }
            }

            // Pop all removed cards out of the flex flow together, retaining
            // their original edge anchors even when the final card leaves.
            for (let index = 0; index < nodes.length; index += 1) {
                const node = nodes[index]!
                const present = presence.get(node.dataset.toastId!) !== false
                const box = previous.get(node)
                if (!present && !exiting.has(node) && box) {
                    exiting.add(node)
                    const style = node.style
                    style.position = 'absolute'
                    style.width = `${box.width}px`
                    style.height = `${box.height}px`
                    style.pointerEvents = 'none'
                    if (isRight) {
                        style.right = `${box.parentWidth - box.offsetLeft - box.width}px`
                    } else {
                        style.left = `${box.offsetLeft}px`
                    }
                    if (isBottom) {
                        style.bottom = `${box.parentHeight - box.offsetTop - box.height}px`
                    } else {
                        style.top = `${box.offsetTop}px`
                    }
                } else if (present && exiting.delete(node)) {
                    const style = node.style
                    for (
                        let propIndex = 0;
                        propIndex < POPPED_STYLE_PROPERTIES.length;
                        propIndex += 1
                    ) {
                        style.removeProperty(
                            POPPED_STYLE_PROPERTIES[propIndex]!,
                        )
                    }
                }
            }

            const parentBox = parent!.getBoundingClientRect()
            // Read every layout before starting any animation. Individual
            // `translate` keeps FLIP independent of the card's spring/swipe.
            const measurements: {
                node: HTMLElement
                box: ToastLayoutBox
                x: number
                y: number
            }[] = []
            for (let index = 0; index < nodes.length; index += 1) {
                const node = nodes[index]!
                if (exiting.has(node)) continue
                const offsetLeft = node.offsetLeft
                const offsetTop = node.offsetTop
                const box: ToastLayoutBox = {
                    left: parentBox.left + offsetLeft,
                    top: parentBox.top + offsetTop,
                    width: node.offsetWidth,
                    height: node.offsetHeight,
                    offsetLeft,
                    offsetTop,
                    parentWidth: parentBox.width,
                    parentHeight: parentBox.height,
                }
                const prior = previous.get(node)
                let x = 0
                let y = 0
                if (prior) {
                    const dx = Math.abs(prior.left - box.left) > 0.01
                    const dy = Math.abs(prior.top - box.top) > 0.01
                    if (dx || dy) {
                        let tx = 0
                        let ty = 0
                        if (running.has(node)) {
                            const raw = getComputedStyle(node).translate
                            const space = raw.indexOf(' ')
                            if (space === -1) {
                                tx = parseFloat(raw) || 0
                            } else {
                                tx = parseFloat(raw.slice(0, space)) || 0
                                ty = parseFloat(raw.slice(space + 1)) || 0
                            }
                        }
                        if (dx) x = prior.left + tx - box.left
                        if (dy) y = prior.top + ty - box.top
                    }
                }
                measurements.push({ node, box, x, y })
            }
            for (let index = 0; index < measurements.length; index += 1) {
                const { node, box, x, y } = measurements[index]!
                previous.set(node, box)
                if (Math.abs(x) < 0.01 && Math.abs(y) < 0.01) continue
                running.get(node)?.cancel()
                running.delete(node)
                if (reducedMotion || typeof node.animate !== 'function')
                    continue
                const animation = node.animate(
                    [{ translate: `${x}px ${y}px` }, { translate: '0px 0px' }],
                    { duration: 220, easing: 'ease-out' },
                )
                running.set(node, animation)
                animation.onfinish = () => {
                    if (running.get(node) === animation) running.delete(node)
                    animation.cancel()
                }
            }
        }

        updateRef.current = updateLayout

        const observer = observerRef.current
        const observed = observedRef.current
        if (observer && observed) {
            const currentChildren = new Set<Element>()
            currentChildren.add(parent)
            for (let index = 0; index < parent.children.length; index += 1) {
                const child = parent.children[index]!
                currentChildren.add(child)
                if (!observed.has(child)) {
                    observer.observe(child)
                    observed.add(child)
                }
            }
            for (const element of observed) {
                if (!currentChildren.has(element)) {
                    observer.unobserve(element)
                    observed.delete(element)
                }
            }
        }

        if (lastStructureRef.current !== structureKey) {
            lastStructureRef.current = structureKey
            updateLayout()
        }
    }, [items, position, reducedMotion, region])

    useLayoutEffect(() => {
        return () => {
            if (animations.current) {
                for (const animation of animations.current.values())
                    animation.cancel()
                animations.current.clear()
            }
            boxes.current?.clear()
            popped.current?.clear()
            observerRef.current?.disconnect()
            observerRef.current = null
            observedRef.current?.clear()
        }
    }, [])

    return setRegion
}
