import { screenshotPixels as decodeScreenshot } from './browser-pixels.mjs'
/* eslint-disable no-await-in-loop -- Browser scenarios execute serially to avoid shared-host contention. */
import { createRequire } from 'node:module'
import {
    readFileSync,
    writeFileSync,
    mkdirSync,
    readdirSync,
    existsSync,
} from 'node:fs'
import { resolve, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { cpus, release } from 'node:os'
import { chromium, expect } from '@playwright/test'
import {
    installCounters,
    normalizedVisualState,
    visualStyleProperties,
} from './browser-instrumentation.mjs'

process.env.NODE_ENV = 'production'
const root = process.cwd()
const support = dirname(fileURLToPath(import.meta.url))
function option(name) {
    const index = process.argv.indexOf(name)
    return index < 0 ? undefined : process.argv[index + 1]
}
function hash(value) {
    return createHash('sha256').update(value).digest('hex')
}
function files(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((item) =>
        item.isDirectory()
            ? files(join(directory, item.name))
            : [join(directory, item.name)],
    )
}
function fingerprint(directory) {
    const paths = [
        ...files(resolve(directory, 'src')),
        ...['package.json', 'bun.lock', 'tailwind.css', 'theme.css']
            .map((name) => resolve(directory, name))
            .filter(existsSync),
    ]
    return hash(
        JSON.stringify(
            paths
                .map((path) => ({
                    path: relative(directory, path).replaceAll('\\', '/'),
                    sha256: hash(readFileSync(path)),
                }))
                .toSorted((a, b) => a.path.localeCompare(b.path, 'en')),
        ),
    )
}
function git(args) {
    try {
        return execFileSync('git', args, {
            cwd: root,
            encoding: 'utf8',
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'ignore'],
        }).trim()
    } catch {
        return null
    }
}
const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const scenarios = {
    '@rentnerkev/tooltips': [
        'tooltip-stable-100',
        'tooltip-stable-500',
        'tooltip-open-depth20',
    ],
    '@rentnerkev/select': ['select-static-249', 'select-virtual-10000'],
    '@rentnerkev/toasts': ['toast-visible-10'],
    '@rentnerkev/calendar': [
        'calendar-grid-42',
        'calendar-format-range',
        'calendar-year-search',
    ],
}[manifest.name]
if (!scenarios) throw new Error('Unsupported package')
if (option('--scenario') && !scenarios.includes(option('--scenario')))
    throw new Error('Scenario does not belong to this package')
const sourceHash = fingerprint(root)
const tooltipRoot = option('--native-tooltips')
    ? resolve(option('--native-tooltips'))
    : null
const tooltipHash = tooltipRoot ? fingerprint(tooltipRoot) : null
const require = createRequire(resolve(root, 'package.json'))
const sceneEntry = join(support, 'browser-scenes.mjs')
let instrumentedConstraintEntries = 0
let instrumentedYearFactories = 0
const build = await Bun.build({
    entrypoints: [sceneEntry],
    target: 'browser',
    format: 'iife',
    minify: true,
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    plugins: [
        {
            name: 'production-public-api-probe',
            setup(builder) {
                builder.onResolve(
                    { filter: /^rentner-performance:api$/ },
                    () => ({ path: resolve(root, 'src/index.ts') }),
                )
                builder.onResolve(
                    { filter: /^react(?:\/|$)|^react-dom(?:\/|$)/ },
                    (args) => ({ path: require.resolve(args.path) }),
                )
                if (tooltipRoot)
                    builder.onResolve(
                        { filter: /^@rentnerkev\/tooltips$/ },
                        () => ({ path: resolve(tooltipRoot, 'src/index.ts') }),
                    )
                builder.onLoad(
                    { filter: /useCalendarHeaderLogic\.ts$/ },
                    ({ path }) => {
                        const original = readFileSync(path, 'utf8')
                        const contents = original.replace(
                            /(function getYearOptions\(currentYear: number\): FastEditOption\[\] \{)/,
                            '$1\n globalThis.performanceCounters.yearOptionBuilds++;',
                        )
                        if (contents !== original) instrumentedYearFactories++
                        return {
                            contents,
                            loader: 'ts',
                            resolveDir: dirname(path),
                        }
                    },
                )
                builder.onLoad(
                    { filter: /CalendarDateTime\.ts$/ },
                    ({ path }) => {
                        const original = readFileSync(path, 'utf8')
                        const contents = original.replace(
                            /(export function constrainCalendarDateTime\([\s\S]*?\): Date \| undefined \{)/,
                            '$1\n globalThis.performanceCounters.constraintCalls++;',
                        )
                        if (contents !== original)
                            instrumentedConstraintEntries++
                        return {
                            contents,
                            loader: 'ts',
                            resolveDir: dirname(path),
                        }
                    },
                )
            },
        },
    ],
})
if (!build.success)
    throw new AggregateError(build.logs, 'Production probe bundle failed')
if (
    manifest.name === '@rentnerkev/calendar' &&
    (instrumentedConstraintEntries !== 1 || instrumentedYearFactories !== 1)
)
    throw new Error(
        'Calendar constraint-entry instrumentation did not match exactly one real function',
    )
// Appending the mount call keeps all package loading and React instances inside one bundle.
const code = await build.outputs[0].text()
const cssDirectory = resolve(
    option('--css-root') ?? root,
    'playground/dist/assets',
)
const css = existsSync(cssDirectory)
    ? readdirSync(cssDirectory)
          .filter((name) => name.endsWith('.css'))
          .toSorted()
          .map((name) => readFileSync(join(cssDirectory, name), 'utf8'))
          .join('\n')
    : ''
const fixtureCss =
    '*,*::before,*::after{animation:none!important;transition:none!important}body{margin:0;padding:20px;font-family:Arial,sans-serif}button,input{font:inherit}main{width:900px}[role=listbox]{max-height:300px;overflow:auto}[data-rentner-toast-region]{display:flex;flex-direction:column;gap:4px} [role=status],[role=alert]{max-width:320px}'
const browser = await chromium.launch({ headless: true })
const results = []
const debugVisuals = []
try {
    for (const scenario of scenarios.filter(
        (name) => !option('--scenario') || name === option('--scenario'),
    )) {
        const context = await browser.newContext({
            viewport: { width: 1000, height: 800 },
            reducedMotion: 'reduce',
            timezoneId: 'UTC',
            locale: 'en-US',
            deviceScaleFactor: 1,
        })
        try {
            const page = await context.newPage()
            const errors = []
            page.on('pageerror', (error) => {
                errors.push(String(error))
                if (process.argv.includes('--check'))
                    console.error(String(error))
            })
            await page.addInitScript(installCounters)
            await page.goto('about:blank')
            await page.setContent(
                `<style>${css}\n${fixtureCss}</style><div id="mount"></div>`,
            )
            // setContent retains the initialized document/global counters.
            await page.addScriptTag({ content: code })
            await page.evaluate(
                (name) => window.mountPerformanceScene(name),
                scenario,
            )
            await expect
                .poll(() =>
                    page.evaluate(() => Boolean(window.performanceProbe)),
                )
                .toBe(true)
            async function settle() {
                await page.evaluate(async () => {
                    await document.fonts.ready
                    for (const animation of document.getAnimations()) {
                        if (
                            animation.effect?.getTiming().iterations !==
                            Infinity
                        )
                            animation.finish()
                    }
                    await new Promise((done) =>
                        requestAnimationFrame(() =>
                            requestAnimationFrame(done),
                        ),
                    )
                    await new Promise((done) => setTimeout(done, 40))
                    for (const animation of document.getAnimations()) {
                        if (
                            animation.effect?.getTiming().iterations !==
                            Infinity
                        )
                            animation.finish()
                    }
                    await new Promise((done) =>
                        requestAnimationFrame(() =>
                            requestAnimationFrame(done),
                        ),
                    )
                })
            }
            await settle()
            const steps = []
            async function capture(name) {
                const counters = await page.evaluate(() =>
                    window.performanceProbe.counts(),
                )
                const state = await page.evaluate(() =>
                    window.performanceProbe.state(),
                )
                const visual = await page.evaluate(
                    normalizedVisualState,
                    visualStyleProperties,
                )
                const png = await page.screenshot({
                    animations: 'disabled',
                    caret: 'hide',
                })
                if (process.argv.includes('--debug-visual'))
                    debugVisuals.push({
                        scenario,
                        name,
                        visual,
                        png: png.toString('base64'),
                    })
                steps.push({
                    name,
                    counters,
                    state,
                    normalizedDomStyleSha256: hash(JSON.stringify(visual)),
                    screenshotPngSha256: hash(png),
                    screenshotPixels: decodeScreenshot(png),
                })
            }
            if (scenario.startsWith('tooltip-stable')) {
                await expect(page.locator('button[disabled]')).toHaveCount(
                    Number(scenario.split('-').at(-1)),
                )
                await page.evaluate(() => window.performanceProbe.reset())
                await page.evaluate(() =>
                    window.performanceProbe.actions.update(),
                )
                await settle()
                await expect(page.locator('#tick')).toHaveText('1')
                await capture('one-unrelated-provider-update')
            } else if (scenario === 'tooltip-open-depth20') {
                await expect(page.getByRole('tooltip').last()).toBeAttached()
                await expect(
                    page.getByText('Open tooltip', { exact: true }).first(),
                ).toBeVisible()
                await page.evaluate(() => window.performanceProbe.reset())
                await page.evaluate(() =>
                    window.performanceProbe.actions.update(),
                )
                await settle()
                await capture('inline-padding-equivalent-update')
                await page.evaluate(() => window.performanceProbe.reset())
                await page.evaluate(() =>
                    window.performanceProbe.actions.reconfigure(),
                )
                await settle()
                await expect(page.getByRole('tooltip').last()).toBeAttached()
                await expect(
                    page.getByText('Open tooltip', { exact: true }).first(),
                ).toBeVisible()
                await capture('boundary-and-padding-change')
            } else if (scenario.startsWith('select-')) {
                await page.locator('#perf-select').click()
                await expect(page.getByRole('option').first()).toBeAttached()
                await settle()
                await page.evaluate(() => window.performanceProbe.reset())
                if (scenario === 'select-static-249') {
                    await page
                        .getByRole('option', {
                            name: 'Option 00000',
                            exact: true,
                        })
                        .click()
                    await settle()
                    await expect(
                        page.getByRole('option', {
                            name: 'Option 00000',
                            exact: true,
                        }),
                    ).toHaveAttribute('aria-selected', 'true')
                    expect(
                        await page.evaluate(
                            () => window.performanceProbe.state().value,
                        ),
                    ).toEqual(['0'])
                    await capture('single-multiselection')
                } else {
                    for (let index = 0; index < 20; index++)
                        await page.keyboard.press('ArrowDown')
                    await settle()
                    const active = await page.evaluate(() => ({
                        label: document.activeElement?.textContent,
                        role: document.activeElement?.getAttribute('role'),
                        disabled:
                            document.activeElement?.getAttribute(
                                'aria-disabled',
                            ),
                    }))
                    expect(active.label).toMatch(/^Option \d{5}$/)
                    expect(active.role).toBe('option')
                    expect(active.disabled).not.toBe('true')
                    await capture('twenty-virtual-arrows')
                }
            } else if (scenario === 'toast-visible-10') {
                await expect(page.getByRole('status')).toHaveCount(10)
                await page.evaluate(() => window.performanceProbe.reset())
                await page.evaluate(() =>
                    window.performanceProbe.actions.update(),
                )
                await settle()
                await expect(
                    page
                        .getByRole('status')
                        .filter({ hasText: 'Changed item' }),
                ).toHaveCount(1)
                await capture('one-item-update')
                await page.evaluate(() => window.performanceProbe.reset())
                await page.evaluate(() =>
                    window.performanceProbe.actions.noops(),
                )
                await settle()
                await expect(page.getByRole('status')).toHaveCount(10)
                await capture('one-thousand-noop-updates')
            } else if (scenario === 'calendar-year-search') {
                await page.locator('#perf-calendar').click()
                await expect(page.locator('[data-calendar-day]')).toHaveCount(
                    42,
                )
                await settle()
                await page.evaluate(() => window.performanceProbe.reset())
                await page.evaluate(() =>
                    window.performanceProbe.actions.update(),
                )
                await settle()
                await expect(
                    page.getByRole('combobox', { name: 'Year', exact: true }),
                ).toBeVisible()
                await capture('unrelated-header-update')
                await page
                    .getByRole('combobox', { name: 'Year', exact: true })
                    .click()
                const search = page.getByRole('textbox', {
                    name: 'Search options',
                    exact: true,
                })
                await expect(search).toBeFocused()
                await settle()
                await page.evaluate(() => window.performanceProbe.reset())
                for (const query of ['20', '202', '2026', '203', '2035'])
                    await search.fill(query)
                await settle()
                await expect(page.getByRole('option')).toHaveCount(1)
                await expect(page.getByRole('option')).toContainText('2035')
                await capture('five-year-search-queries')
            } else if (scenario === 'calendar-grid-42') {
                await page.locator('#perf-calendar').click()
                await expect(page.locator('[data-calendar-day]')).toHaveCount(
                    42,
                )
                await settle()
                await page.evaluate(() => window.performanceProbe.reset())
                await page.keyboard.press('ArrowRight')
                await settle()
                await expect(page.locator('[data-calendar-day]')).toHaveCount(
                    42,
                )
                expect(
                    await page.evaluate(() =>
                        document.activeElement?.getAttribute(
                            'data-calendar-date',
                        ),
                    ),
                ).toBe('2026-10-29')
                await capture('one-grid-focus-update')
            } else {
                await page.evaluate(() => window.performanceProbe.reset())
                await page.evaluate(() =>
                    window.performanceProbe.actions.format(),
                )
                expect(await page.evaluate(() => window.rangeOutput)).toBe(
                    '10/28/2026 - 10/30/2026',
                )
                await capture('one-hundred-range-format-operations')
            }
            expect(errors).toEqual([])
            results.push({
                scenario,
                validity:
                    'all explicit final-state assertions passed; no browser exceptions',
                steps,
            })
            if (process.argv.includes('--check'))
                console.log(`Smoke passed: ${scenario}`)
        } finally {
            await context.close()
        }
    }
} finally {
    await browser.close()
}
if (
    fingerprint(root) !== sourceHash ||
    (tooltipRoot && fingerprint(tooltipRoot) !== tooltipHash)
)
    throw new Error('Source changed during probe; discard this run')
const report = {
    schemaVersion: 1,
    package: manifest.name,
    stage: option('--stage') ?? 'working-tree',
    trial: Number(option('--trial') ?? 1),
    revision: option('--revision') ?? git(['rev-parse', 'HEAD']),
    sourceTreeSha256: sourceHash,
    nativeTooltipSourceSha256: tooltipHash,
    harnessSha256: hash(
        JSON.stringify(
            files(support)
                .toSorted()
                .map((path) => [
                    relative(support, path),
                    hash(readFileSync(path)),
                ]),
        ),
    ),
    cssSha256: hash(css + fixtureCss),
    environment: {
        bun: Bun.version,
        platform: process.platform,
        release: release(),
        arch: process.arch,
        cpu: cpus()[0]?.model.trim(),
        chromium: browser.version(),
        mode: 'production',
        timezone: 'UTC',
        fixedWallClock: '2026-10-28T12:00:00.000Z',
    },
    productStylesheetSha256: Object.fromEntries(
        ['theme.css', 'tailwind.css']
            .filter((name) => existsSync(resolve(root, name)))
            .map((name) => [name, hash(readFileSync(resolve(root, name)))]),
    ),
    methodology: {
        computedStyleProperties: visualStyleProperties,
        timing: 'No latency measurements or timing assertions; operation counters and explicit outcome checks. Finite Web Animations finish before counters reset/capture; shared CSS disables transitions/animations for deterministic end-state visual parity.',
        instrumentation:
            'Native DOM/observer constructors and public render callbacks/getters count real work. Calendar constrainCalendarDateTime and getYearOptions entries are counted only in the in-memory production bundle; no implementation is mocked.',
        instrumentedConstraintEntries,
        instrumentedYearFactories,
        parity: 'Normalized DOM with all non-style attributes, an explicit computed-style selection and decoded in-memory viewport RGBA pixels after each operation; screenshot files are never written.',
        limitations: [
            'Observer delivery and rectangle counts may vary between browser scheduling turns; retain all trials.',
            'Shared compiled playground CSS is fixed for all stages of a package.',
            'A disabled getter counts option model work, not private function invocations.',
            'Toast content reads use an identity-preserving public store facade. Frozen facade snapshot arrays can add one probe-owned freeze for a changed snapshot, but none for true no-op updates.',
        ],
    },
    results,
}
if (!process.argv.includes('--check')) {
    if (option('--output')) {
        const output = resolve(option('--output'))
        mkdirSync(dirname(output), { recursive: true })
        writeFileSync(output, `${JSON.stringify(report, null, 4)}\n`)
    }
    console.log(JSON.stringify(report, null, 4))
}

if (process.argv.includes('--check') && option('--check-output')) {
    const output = resolve(option('--check-output'))
    mkdirSync(dirname(output), { recursive: true })
    writeFileSync(
        output,
        JSON.stringify(
            {
                package: manifest.name,
                sourceTreeSha256: sourceHash,
                results: results.map(({ scenario, steps }) => ({
                    scenario,
                    steps: steps.map(
                        ({
                            name,
                            state,
                            normalizedDomStyleSha256,
                            screenshotPngSha256,
                            screenshotPixels,
                        }) => ({
                            name,
                            state,
                            normalizedDomStyleSha256,
                            screenshotPngSha256,
                            screenshotPixels,
                        }),
                    ),
                })),
            },
            null,
            4,
        ) + '\n',
    )
}

if (process.argv.includes('--debug-visual'))
    console.log('PERFORMANCE_VISUAL_DEBUG ' + JSON.stringify(debugVisuals))
