export function installCounters() {
    const counts = (window.performanceCounters = {
        rectReads: 0,
        clipRectReads: 0,
        resizeCreates: 0,
        resizeObserves: 0,
        resizeCallbacks: 0,
        intersectionCreates: 0,
        intersectionObserves: 0,
        intersectionCallbacks: 0,
        mutationCreates: 0,
        mutationObserves: 0,
        mutationCallbacks: 0,
        dateConstructs: 0,
        intlConstructs: 0,
        freezeCalls: 0,
        renderOptionCalls: 0,
        disabledReads: 0,
        triggerRenders: 0,
        tooltipDesignReads: 0,
        defaultsReads: 0,
        wrapperReads: 0,
        changedToastContentReads: 0,
        unchangedToastContentReads: 0,
        constraintCalls: 0,
        lowercaseCalls: 0,
        yearOptionBuilds: 0,
    })
    const rectangle = Element.prototype.getBoundingClientRect
    Element.prototype.getBoundingClientRect = function (...args) {
        counts.rectReads++
        if (this.hasAttribute('data-clip')) counts.clipRectReads++
        return rectangle.apply(this, args)
    }
    for (const [name, prefix] of [
        ['ResizeObserver', 'resize'],
        ['IntersectionObserver', 'intersection'],
        ['MutationObserver', 'mutation'],
    ]) {
        const Original = window[name]
        if (!Original) continue
        window[name] = class extends Original {
            constructor(callback) {
                counts[`${prefix}Creates`]++
                super((...args) => {
                    counts[`${prefix}Callbacks`]++
                    callback(...args)
                })
            }
            observe(...args) {
                counts[`${prefix}Observes`]++
                return super.observe(...args)
            }
        }
    }
    const NativeDate = Date
    const wallClock = NativeDate.UTC(2026, 9, 28, 12)
    window.Date = new Proxy(NativeDate, {
        get(target, key) {
            return key === 'now' ? () => wallClock : Reflect.get(target, key)
        },
        construct(target, args, next) {
            counts.dateConstructs++
            return Reflect.construct(
                target,
                args.length ? args : [wallClock],
                next,
            )
        },
    })
    const NativeIntl = Intl.DateTimeFormat
    Intl.DateTimeFormat = new Proxy(NativeIntl, {
        construct(target, args, next) {
            counts.intlConstructs++
            return Reflect.construct(target, args, next)
        },
    })
    const lowercase = String.prototype.toLowerCase
    // oxlint-disable-next-line no-extend-native -- Count real normalization work in an isolated browser context discarded after this scene.
    String.prototype.toLowerCase = function (...args) {
        counts.lowercaseCalls++
        return lowercase.apply(this, args)
    }
    const freeze = Object.freeze
    Object.freeze = function (value) {
        counts.freezeCalls++
        return freeze(value)
    }
}

export const visualStyleProperties = [
    'display',
    'visibility',
    'position',
    'top',
    'left',
    'width',
    'height',
    'maxHeight',
    'overflow',
    'padding',
    'margin',
    'borderRadius',
    'backgroundColor',
    'color',
    'fontSize',
    'fontWeight',
    'lineHeight',
    'transform',
    'opacity',
    'zIndex',
]

export function normalizedVisualState(styles) {
    const ids = new Map()
    for (const element of document.querySelectorAll('[id]'))
        ids.set(element.id, `id-${ids.size}`)
    function visit(node) {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent
        if (
            !(node instanceof Element) ||
            ['SCRIPT', 'STYLE'].includes(node.tagName)
        )
            return null
        const attributes = {}
        for (const { name, value } of node.attributes) {
            if (
                name === 'id' ||
                name === 'aria-controls' ||
                name === 'aria-describedby' ||
                name === 'aria-labelledby' ||
                [
                    'for',
                    'form',
                    'list',
                    'headers',
                    'aria-activedescendant',
                    'aria-details',
                    'aria-errormessage',
                    'aria-owns',
                    'aria-flowto',
                    'popovertarget',
                ].includes(name)
            )
                attributes[name] = value
                    .split(' ')
                    .map((id) => ids.get(id) ?? id)
                    .join(' ')
            else if (name !== 'style') attributes[name] = value
        }
        const computed = getComputedStyle(node)
        return {
            tag: node.tagName,
            attributes: Object.fromEntries(
                Object.entries(attributes).toSorted(([a], [b]) =>
                    a.localeCompare(b),
                ),
            ),
            styles: Object.fromEntries(
                styles.map((name) => [name, computed[name]]),
            ),
            children: [...node.childNodes]
                .map(visit)
                .filter((child) => child !== null),
        }
    }
    return visit(document.body)
}
