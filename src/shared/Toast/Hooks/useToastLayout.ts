import { useLayoutEffect, useRef, useState } from 'react'
import type { ToastPosition } from '../../../lib/ToastStore/Types/toast.types.ts'
import type {
    ToastLayoutBox,
    ToastPresenceItem,
} from '../Types/toast-animation.types.ts'

export function useToastLayout(
    items: readonly ToastPresenceItem[],
    position: ToastPosition,
    reducedMotion: boolean,
) {
    const [region, setRegion] = useState<HTMLElement | null>(null)
    const boxes = useRef(new Map<HTMLElement, ToastLayoutBox>())
    const animations = useRef(new Map<HTMLElement, Animation>())
    const popped = useRef(new Set<HTMLElement>())

    useLayoutEffect(() => {
        const previous = boxes.current
        const running = animations.current
        const exiting = popped.current
        const parent = region
        if (!parent) {
            for (const animation of running.values()) animation.cancel()
            running.clear()
            previous.clear()
            exiting.clear()
            return
        }
        const presence = new Map(
            items.map((item) => [item.toast.id, item.present]),
        )

        function updateLayout() {
            const nodes = Array.from(parent!.children).filter(
                (node): node is HTMLElement => node instanceof HTMLElement,
            )
            const live = new Set(nodes)
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
            for (const node of nodes) {
                const present = presence.get(node.dataset.toastId!) !== false
                const box = previous.get(node)
                if (!present && !exiting.has(node) && box) {
                    exiting.add(node)
                    Object.assign(node.style, {
                        position: 'absolute',
                        width: `${box.width}px`,
                        height: `${box.height}px`,
                        pointerEvents: 'none',
                        [position.includes('right') ? 'right' : 'left']:
                            `${position.includes('right') ? box.parentWidth - box.offsetLeft - box.width : box.offsetLeft}px`,
                        [position.includes('bottom') ? 'bottom' : 'top']:
                            `${position.includes('bottom') ? box.parentHeight - box.offsetTop - box.height : box.offsetTop}px`,
                    })
                } else if (present && exiting.delete(node)) {
                    for (const property of [
                        'position',
                        'width',
                        'height',
                        'pointer-events',
                        'left',
                        'right',
                        'top',
                        'bottom',
                    ]) {
                        node.style.removeProperty(property)
                    }
                }
            }

            const parentBox = parent!.getBoundingClientRect()
            // Read every layout before starting any animation. Individual
            // `translate` keeps FLIP independent of the card's spring/swipe.
            const measurements = nodes
                .filter((node) => !exiting.has(node))
                .map((node) => {
                    const box: ToastLayoutBox = {
                        left: parentBox.left + node.offsetLeft,
                        top: parentBox.top + node.offsetTop,
                        width: node.offsetWidth,
                        height: node.offsetHeight,
                        offsetLeft: node.offsetLeft,
                        offsetTop: node.offsetTop,
                        parentWidth: parentBox.width,
                        parentHeight: parentBox.height,
                    }
                    const prior = previous.get(node)
                    const translate = running.has(node)
                        ? getComputedStyle(node)
                              .translate.split(' ')
                              .map(parseFloat)
                        : []
                    return {
                        node,
                        box,
                        x:
                            prior && Math.abs(prior.left - box.left) > 0.01
                                ? prior.left + (translate[0] || 0) - box.left
                                : 0,
                        y:
                            prior && Math.abs(prior.top - box.top) > 0.01
                                ? prior.top + (translate[1] || 0) - box.top
                                : 0,
                    }
                })
            for (const { node, box, x, y } of measurements) {
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

        updateLayout()
        const observer = new ResizeObserver(updateLayout)
        observer.observe(parent)
        for (const node of parent.children) observer.observe(node)
        return () => observer.disconnect()
    }, [items, position, reducedMotion, region])

    useLayoutEffect(() => {
        const running = animations.current
        const previous = boxes.current
        const exiting = popped.current
        return () => {
            for (const animation of running.values()) animation.cancel()
            running.clear()
            previous.clear()
            exiting.clear()
        }
    }, [])

    return setRegion
}
