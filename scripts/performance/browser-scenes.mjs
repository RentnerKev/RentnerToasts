import { createElement as h, useState, useMemo, useLayoutEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import * as api from 'rentner-performance:api'

const counts = window.performanceCounters
const noop = () => {}
function expose(actions, state) {
    window.performanceProbe = {
        actions,
        state,
        reset() {
            for (const key of Object.keys(counts)) counts[key] = 0
        },
        counts() {
            return { ...counts }
        },
    }
}
function Button(props) {
    counts.triggerRenders++
    return h('button', { ...props, type: 'button' })
}
function TooltipStable({ count }) {
    const [tick, setTick] = useState(0)
    const design = useMemo(
        () => ({
            get contentClasses() {
                counts.tooltipDesignReads++
                return 'text-white'
            },
        }),
        [],
    )
    const triggers = useMemo(
        () =>
            Array.from({ length: count }, (_, index) =>
                h(
                    api.CustomTooltip,
                    {
                        key: index,
                        content: `Help ${index}`,
                        disabledTrigger: true,
                        customDesign: design,
                    },
                    h(
                        'button',
                        { disabled: true, 'aria-label': `Target ${index}` },
                        `Target ${index}`,
                    ),
                ),
            ),
        [count, design],
    )
    useLayoutEffect(
        () =>
            expose(
                {
                    update() {
                        flushSync(() => setTick((value) => value + 1))
                    },
                },
                () => ({ tick, triggers: count }),
            ),
        [count, tick],
    )
    return h(
        'main',
        null,
        h('output', { id: 'tick' }, tick),
        h(
            api.TooltipProvider,
            {
                delayDuration: 0,
                collisionPadding: { top: 8, bottom: 8, left: 8, right: 8 },
            },
            triggers,
        ),
    )
}
function TooltipOpen() {
    const [tick, setTick] = useState(0)
    const [changed, setChanged] = useState(false)
    const [first, setFirst] = useState(null)
    const [second, setSecond] = useState(null)
    useLayoutEffect(
        () =>
            expose(
                {
                    update() {
                        flushSync(() => setTick((value) => value + 1))
                    },
                    reconfigure() {
                        flushSync(() => setChanged(true))
                    },
                },
                () => ({ tick, changed }),
            ),
        [tick, changed],
    )
    let nested = h(
        api.CustomTooltip,
        {
            content: 'Open tooltip',
            open: true,
            onOpenChange: noop,
            collisionBoundary: changed ? second : first,
            collisionPadding: {
                top: changed ? 24 : 8,
                right: 8,
                bottom: 8,
                left: 8,
            },
        },
        h(Button, { id: 'deep-trigger' }, 'Deep target'),
    )
    for (let depth = 19; depth >= 0; depth--)
        nested = h(
            'div',
            {
                key: depth,
                ref:
                    depth === 4
                        ? setFirst
                        : depth === 9
                          ? setSecond
                          : undefined,
                'data-clip':
                    depth === 4 || depth === 9 ? String(depth) : undefined,
                style: {
                    padding: 2,
                    ...(depth === 4 || depth === 9
                        ? {
                              overflow: 'hidden',
                              width: depth === 4 ? 650 : 590,
                              height: depth === 4 ? 330 : 280,
                          }
                        : {}),
                },
            },
            nested,
        )
    return h(
        'main',
        null,
        h('output', { id: 'tick' }, tick),
        h(api.TooltipProvider, { delayDuration: 0 }, nested),
    )
}
function SelectScene({ virtual }) {
    const [value, setValue] = useState([])
    const options = useMemo(
        () =>
            Array.from({ length: virtual ? 10000 : 249 }, (_, index) => ({
                value: String(index),
                label: `Option ${String(index).padStart(5, '0')}`,
                get disabled() {
                    counts.disabledReads++
                    return index % 17 === 16
                },
            })),
        [virtual],
    )
    const renderer = useMemo(
        () => (option) => {
            counts.renderOptionCalls++
            return h('span', null, option.label)
        },
        [],
    )
    useLayoutEffect(
        () =>
            expose({}, () => ({
                value,
                activeOption: document.activeElement?.textContent,
            })),
        [value],
    )
    return h(
        'main',
        null,
        h(api.CustomSelect, {
            id: 'perf-select',
            label: 'Performance choices',
            value,
            onValueChange: setValue,
            multiple: true,
            searchable: false,
            virtualized: virtual,
            options,
            renderOption: renderer,
        }),
    )
}
function createToastFacade(core) {
    const proxies = new WeakMap()
    let previousRaw
    let previousView
    return {
        ...core.store,
        getToastSnapshot() {
            const snapshot = core.store.getToastSnapshot()
            if (snapshot !== previousRaw) {
                previousRaw = snapshot
                previousView = Object.freeze(
                    snapshot.map((toast) => {
                        let proxy = proxies.get(toast)
                        if (!proxy) {
                            proxy = new Proxy(toast, {
                                get(target, key) {
                                    if (key === 'content') {
                                        if (target.id === core.ids[0])
                                            counts.changedToastContentReads++
                                        else counts.unchangedToastContentReads++
                                    }
                                    return Reflect.get(target, key)
                                },
                            })
                            proxies.set(toast, proxy)
                        }
                        return proxy
                    }),
                )
            }
            return previousView
        },
        getToastDefaults() {
            counts.defaultsReads++
            return core.store.getToastDefaults()
        },
    }
}
function ToastScene() {
    const [core] = useState(() => {
        const store = api.createToastStore({
            defaultDuration: 0,
            maxVisibleToasts: 10,
        })
        return {
            store,
            ids: Array.from({ length: 10 }, (_, index) =>
                store.toast.info(`Item ${index}`),
            ),
        }
    })
    const facade = useMemo(() => createToastFacade(core), [core])
    const design = useMemo(() => ({ infoWrapper: 'bg-blue-950' }), [])
    useLayoutEffect(
        () =>
            expose(
                {
                    update() {
                        flushSync(() =>
                            core.store.toast.update(core.ids[0], {
                                content: 'Changed item',
                            }),
                        )
                    },
                    noops() {
                        for (let index = 0; index < 1000; index++)
                            core.store.toast.update(core.ids[0], {
                                content: 'Changed item',
                            })
                    },
                },
                () => ({
                    toasts: core.store
                        .getToastSnapshot()
                        .map(({ content }) => content),
                }),
            ),
        [core],
    )
    return h(
        'main',
        null,
        h(
            api.ToastProvider,
            {
                store: facade,
                customDesign: design,
                locale: 'en',
                position: 'top-left',
            },
            null,
        ),
    )
}
function CalendarScene({ formatting }) {
    const value = useMemo(
        () =>
            formatting
                ? [new Date(2026, 9, 28), new Date(2026, 9, 30)]
                : new Date(2026, 9, 28),
        [formatting],
    )
    const [tick, setTick] = useState(0)
    useLayoutEffect(
        () =>
            expose(
                {
                    format() {
                        let output
                        for (let index = 0; index < 100; index++)
                            output = api.formatCalendarValue(value, 'en')
                        window.rangeOutput = output
                    },
                    update() {
                        flushSync(() => setTick((v) => v + 1))
                    },
                },
                () => ({ tick, output: window.rangeOutput }),
            ),
        [value, tick],
    )
    if (formatting)
        return h(
            'main',
            null,
            h(
                'output',
                { id: 'range-value' },
                api.formatCalendarValue(value, 'en'),
            ),
        )
    return h(
        'main',
        null,
        h('output', { id: 'tick' }, tick),
        h(api.CustomCalendar, {
            id: 'perf-calendar',
            value,
            locale: 'en',
            onChange: noop,
            showHolidays: false,
        }),
    )
}
export function mount(scenario) {
    const root = createRoot(document.getElementById('mount'))
    const component = scenario.startsWith('tooltip-stable')
        ? h(TooltipStable, { count: Number(scenario.split('-').at(-1)) })
        : scenario === 'tooltip-open-depth20'
          ? h(TooltipOpen)
          : scenario.startsWith('select-')
            ? h(SelectScene, { virtual: scenario.includes('virtual') })
            : scenario === 'toast-visible-10'
              ? h(ToastScene)
              : h(CalendarScene, {
                    formatting: scenario === 'calendar-format-range',
                })
    flushSync(() => root.render(component))
}

window.mountPerformanceScene = mount
