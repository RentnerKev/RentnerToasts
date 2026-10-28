import { createRequire } from 'node:module'
import {
    readFileSync,
    writeFileSync,
    mkdirSync,
    readdirSync,
    realpathSync,
    existsSync,
} from 'node:fs'
import { resolve, dirname, relative, join } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { execFileSync } from 'node:child_process'
import { cpus, totalmem, release } from 'node:os'
import { createHash } from 'node:crypto'

// Set before loading either React or package code, including the SSR bundle.
process.env.NODE_ENV = 'production'
const root = process.cwd()
function option(name) {
    const index = process.argv.indexOf(name)
    if (index === -1) return undefined
    if (!process.argv[index + 1] || process.argv[index + 1].startsWith('--'))
        throw new Error(`Missing value for ${name}`)
    return process.argv[index + 1]
}
function sha256(value) {
    return createHash('sha256').update(value).digest('hex')
}
function files(path) {
    return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
        const candidate = join(path, entry.name)
        return entry.isDirectory() ? files(candidate) : [candidate]
    })
}

function sourceFingerprint(directory) {
    const paths = [
        ...files(resolve(directory, 'src')),
        ...['package.json', 'bun.lock', 'tailwind.css', 'theme.css']
            .map((path) => resolve(directory, path))
            .filter(existsSync),
    ]
    const entries = paths
        .map((path) => ({
            path: relative(directory, path).replaceAll('\\', '/'),
            sha256: sha256(readFileSync(path)),
        }))
        .toSorted((a, b) => a.path.localeCompare(b.path, 'en'))
    return {
        sha256: sha256(JSON.stringify(entries)),
        files: entries.length,
        includes:
            'src/**, package.json, bun.lock, tailwind.css and theme.css when present',
    }
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
const cases = {
    '@rentnerkev/tooltips': {
        exports: ['CustomTooltip', 'TooltipProvider'],
        scenario: '25 closed tooltips sharing one provider',
    },
    '@rentnerkev/select': {
        exports: ['CustomSelect', 'SelectProvider'],
        scenario: 'closed controlled select with 100 options',
    },
    '@rentnerkev/calendar': {
        exports: ['CustomCalendar', 'CalendarProvider'],
        scenario: 'closed calendar and internal 100-option year select',
    },
    '@rentnerkev/toasts': {
        exports: ['ToastProvider', 'ToastFocusScopeBranch'],
        scenario: 'empty provider with focus-scope adapter',
    },
    '@rentnerkev/inputs': {
        exports: ['CustomInput', 'InputProvider'],
        scenario: 'controlled input without an error tooltip',
    },
    '@rentnerkev/picker': {
        exports: ['CustomColorPicker', 'PickerProvider'],
        scenario: 'closed controlled color picker',
    },
}
const selected = cases[manifest.name]
if (!selected) throw new Error(`Unsupported package: ${manifest.name}`)
const tooltipRoot = option('--native-tooltips')
    ? resolve(option('--native-tooltips'))
    : null
const require = createRequire(resolve(root, 'package.json'))
const entry = resolve(root, 'src/index.ts').replaceAll('\\', '/')
const tooltipEntry = tooltipRoot ? resolve(tooltipRoot, 'src/index.ts') : null
const initialSourceTree = sourceFingerprint(root)
const initialTooltipSourceTree = tooltipRoot
    ? sourceFingerprint(tooltipRoot)
    : null
const external = [
    'react',
    'react/*',
    'react-dom',
    'react-dom/*',
    'lucide-react',
    'motion',
    'motion/*',
]
function entryPlugin(source, dedupeReact = false) {
    return {
        name: 'representative-consumer',
        setup(build) {
            build.onResolve({ filter: /^rentner-benchmark:entry$/ }, () => ({
                path: 'entry',
                namespace: 'benchmark',
            }))
            build.onLoad({ filter: /.*/, namespace: 'benchmark' }, () => ({
                contents: source,
                loader: 'js',
                resolveDir: root,
            }))
            if (tooltipEntry)
                build.onResolve({ filter: /^@rentnerkev\/tooltips$/ }, () => ({
                    path: tooltipEntry,
                }))
            if (dedupeReact)
                build.onResolve(
                    { filter: /^react(?:\/|$)|^react-dom(?:\/|$)/ },
                    (args) => ({
                        path: pathToFileURL(require.resolve(args.path)).href,
                        external: true,
                    }),
                )
        },
    }
}
const result = await Bun.build({
    entrypoints: ['rentner-benchmark:entry'],
    target: 'browser',
    minify: true,
    sourcemap: 'none',
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    external,
    plugins: [
        entryPlugin(
            `export { ${selected.exports.join(', ')} } from ${JSON.stringify(entry)}`,
        ),
    ],
})
if (!result.success)
    throw new AggregateError(result.logs, 'Consumer bundling failed')
const outputs = await Promise.all(
    result.outputs.map(async (output) =>
        Buffer.from(await output.arrayBuffer()),
    ),
)
let treeSource
switch (manifest.name) {
    case '@rentnerkev/tooltips':
        treeSource = `h(api.TooltipProvider, null, ...Array.from({ length: 25 }, (_, index) => h(api.CustomTooltip, { key: index, content: 'Help ' + index }, h('button', null, 'Target ' + index))))`
        break
    case '@rentnerkev/select':
        treeSource = `h(api.CustomSelect, { id: 'benchmark', label: 'Benchmark', value: '25', onValueChange() {}, options })`
        break
    case '@rentnerkev/calendar':
        treeSource = `h('div', null, h(api.CustomCalendar, { id: 'benchmark', value: new Date(2026, 9, 28), locale: 'en' }), h(InternalSelect, { id: 'benchmark-year', value: '25', onValueChange() {}, options }))`
        break
    case '@rentnerkev/toasts':
        treeSource = `h(api.ToastProvider, null, h(api.ToastFocusScopeBranch), h('button', null, 'Consumer'))`
        break
    case '@rentnerkev/inputs':
        treeSource = `h(api.CustomInput, { id: 'benchmark', label: 'Benchmark', value: 'Value', onChange() {} })`
        break
    case '@rentnerkev/picker':
        treeSource = `h(api.CustomColorPicker, { id: 'benchmark', label: 'Benchmark', value: '#336699', onChange() {} })`
        break
}
const internalImport =
    manifest.name === '@rentnerkev/calendar'
        ? `import { CustomSelect as InternalSelect } from ${JSON.stringify(resolve(root, 'src/shared/Calendar/Components/Internal/Select.tsx').replaceAll('\\', '/'))}`
        : ''
const ssrSource = `import { createElement as h } from 'react'; import { renderToStaticMarkup } from 'react-dom/server'; import * as api from ${JSON.stringify(entry)}; ${internalImport}; const options = Array.from({length: 100}, (_, index) => ({value: String(index), label: 'Option ' + index})); const tree = ${treeSource}; export function render() { return renderToStaticMarkup(tree) }`
const ssrBuild = await Bun.build({
    entrypoints: ['rentner-benchmark:entry'],
    target: 'bun',
    format: 'esm',
    minify: true,
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    plugins: [entryPlugin(ssrSource, true)],
})
if (!ssrBuild.success)
    throw new AggregateError(ssrBuild.logs, 'SSR consumer bundling failed')
const renderer = await import(
    `data:text/javascript;base64,${Buffer.from(await ssrBuild.outputs[0].text()).toString('base64')}`
)
if (process.argv.includes('--check')) {
    console.log(
        JSON.stringify({
            package: manifest.name,
            check: 'browser bundle and deduplicated production SSR render succeeded',
            htmlBytes: Buffer.byteLength(renderer.render()),
            dependencyMode: tooltipRoot
                ? 'integrated-native-tooltip-source'
                : 'isolated-installed-dependencies',
        }),
    )
    process.exit(0)
}
let html = ''
for (let index = 0; index < 100; index++) html = renderer.render()
const samples = []
for (let sample = 0; sample < 31; sample++) {
    const start = performance.now()
    for (let index = 0; index < 100; index++) html = renderer.render()
    samples.push((performance.now() - start) / 100)
}
const sortedSamples = samples.toSorted((a, b) => a - b)
let publishedTooltip = null
if (manifest.dependencies?.['@rentnerkev/tooltips']) {
    const tooltipManifest = require.resolve('@rentnerkev/tooltips/package.json')
    const dependency = JSON.parse(readFileSync(tooltipManifest, 'utf8'))
    publishedTooltip = {
        version: dependency.version,
        entrySha256: sha256(
            readFileSync(require.resolve('@rentnerkev/tooltips')),
        ),
        resolvedEntry: realpathSync(require.resolve('@rentnerkev/tooltips')),
    }
}
const revision = option('--revision') ?? git(['rev-parse', 'HEAD'])
if (!revision) throw new Error('Archived sources require --revision <commit>')
if (
    sourceFingerprint(root).sha256 !== initialSourceTree.sha256 ||
    (tooltipRoot &&
        sourceFingerprint(tooltipRoot).sha256 !==
            initialTooltipSourceTree.sha256)
)
    throw new Error(
        'Sources changed during measurement; discard this run and repeat after edits finish',
    )
const report = {
    schemaVersion: 2,
    package: manifest.name,
    packageVersion: manifest.version,
    revision,
    baselineCommit:
        option('--baseline-commit') ??
        git(['rev-parse', 'origin/main']) ??
        revision,
    sourceKind: option('--source-kind') ?? 'working-tree',
    sourceTree: initialSourceTree,
    harnessSha256: sha256(readFileSync(fileURLToPath(import.meta.url))),
    measuredAt: new Date().toISOString(),
    environment: {
        bun: Bun.version,
        nodeCompatibility: process.version,
        platform: process.platform,
        release: release(),
        arch: process.arch,
        cpu: cpus()[0]?.model.trim(),
        logicalCpus: cpus().length,
        totalMemoryBytes: totalmem(),
        mode: process.env.NODE_ENV,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    scenario: selected.scenario,
    methodology: {
        scheduling:
            'Run serially on the same host after test/build processes finish. No timing assertions.',
        timing: 'performance.now; one sample is 100 synchronous renderToStaticMarkup calls divided by 100; samples retain original order; nearest-rank p95.',
        bundle: 'Bun production browser bundle of representative named exports, minified; gzip level 9; shared consumer peers external; tooltip dependency is bundled.',
        ssr: 'Bun production SSR bundle; all React/ReactDOM imports resolve to this package root to prevent duplicate React instances; tree constructed before timing.',
        limitations: [
            'Closed-widget SSR measures server rendering, not interaction latency, layout, accessibility or browser memory.',
            'Bundle byte counts exclude shared React/ReactDOM, icon and Motion peers and CSS.',
            'Single-machine observations can vary; no performance pass/fail threshold is inferred.',
        ],
    },
    dependencyMode: tooltipRoot
        ? 'integrated-native-tooltip-source'
        : 'isolated-installed-dependencies',
    dependencies: {
        declaredTooltipRange:
            manifest.dependencies?.['@rentnerkev/tooltips'] ?? null,
        installedPublishedTooltip: publishedTooltip,
        nativeTooltipOverride: tooltipRoot
            ? {
                  package: '@rentnerkev/tooltips',
                  sourceTree: initialTooltipSourceTree,
                  resolution:
                      'Explicit Bun build plugin aliases only the package root import to the sibling PR source. Package manifests and locks remain unchanged.',
              }
            : null,
        releasePrerequisite:
            publishedTooltip || tooltipRoot
                ? 'Publish the native Tooltips release first, then resolve consumer dependencies normally. The current published Tooltip 2.2.0 dependency can still contain Radix; an integrated source override is evidence only.'
                : null,
    },
    bundle: {
        exports: selected.exports,
        external,
        minifiedBytes: outputs.reduce((sum, output) => sum + output.length, 0),
        gzipBytes: outputs.reduce(
            (sum, output) => sum + gzipSync(output, { level: 9 }).length,
            0,
        ),
    },
    ssr: {
        warmupRenders: 100,
        samples: 31,
        rendersPerSample: 100,
        rawSampleMsPerRender: samples,
        medianMs: sortedSamples[15],
        p95Ms: sortedSamples[Math.ceil(samples.length * 0.95) - 1],
        htmlBytes: Buffer.byteLength(html),
        htmlSha256: sha256(html),
    },
}
if (option('--output')) {
    const output = resolve(root, option('--output'))
    mkdirSync(dirname(output), { recursive: true })
    writeFileSync(output, `${JSON.stringify(report, null, 4)}\n`)
}
console.log(JSON.stringify(report, null, 4))
