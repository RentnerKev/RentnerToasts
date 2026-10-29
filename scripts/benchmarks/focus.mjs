/* eslint-disable no-await-in-loop -- Sequential samples isolate workloads and bound browser memory. */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { arch, cpus, platform, release } from 'node:os'
import { dirname, relative, resolve, sep } from 'node:path'
import { gzipSync } from 'node:zlib'
import { chromium } from '@playwright/test'

const root = process.cwd()
const argumentsList = process.argv.slice(2)
const requestedRef = argumentsList
    .find((argument) => argument.startsWith('--ref='))
    ?.slice(6)
const git = (gitArguments) =>
    execFileSync('git', gitArguments, { cwd: root, encoding: 'utf8' })
const headRevision = git(['rev-parse', 'HEAD']).trim()
const sourceRevision = requestedRef
    ? git(['rev-parse', '--verify', `${requestedRef}^{commit}`]).trim()
    : headRevision
const sourceDiff = git(['diff', 'HEAD', '--', 'src'])
const sourceDirty =
    git(['status', '--porcelain', '--', 'src']).trim().length > 0
const originalSources = new Map()
const sourcePlugins = [
    {
        name: 'benchmark-source',
        setup(build) {
            build.onResolve({ filter: /^\./ }, ({ path, importer }) => {
                const absolutePath = resolve(dirname(importer), path)
                if (!relative(root, absolutePath).startsWith(`src${sep}`))
                    return undefined
                return { path: absolutePath }
            })
            build.onLoad({ filter: /\.[jt]sx?$/ }, async ({ path }) => {
                const relativePath = relative(root, path)
                if (!relativePath.startsWith(`src${sep}`)) return undefined
                const repositoryPath = relativePath.split(sep).join('/')
                if (!originalSources.has(repositoryPath)) {
                    originalSources.set(
                        repositoryPath,
                        requestedRef
                            ? git([
                                  'show',
                                  `${sourceRevision}:${repositoryPath}`,
                              ])
                            : await readFile(path, 'utf8'),
                    )
                }
                return {
                    contents: originalSources.get(repositoryPath),
                    loader: path.endsWith('.tsx') ? 'tsx' : 'ts',
                    resolveDir: dirname(path),
                }
            })
        },
    },
]
const destination = resolve(
    root,
    argumentsList.find((argument) => !argument.startsWith('--')) ??
        'test-results/focus-benchmarks/result.json',
)
const settings = {
    warmupRuns: 5,
    measuredRuns: 15,
    mutations: 300,
    unrelatedNodes: 1000,
    hosts: [1, 10],
}
const external = [
    'react',
    'react-dom',
    'react-dom/client',
    'react/jsx-runtime',
    'react/jsx-dev-runtime',
    'lucide-react',
]

async function bundle(entrypoint, externalPackages = []) {
    const result = await Bun.build({
        entrypoints: [resolve(root, entrypoint)],
        target: 'browser',
        format: 'esm',
        minify: true,
        external: externalPackages,
        define: { 'process.env.NODE_ENV': '"production"' },
        plugins: sourcePlugins,
    })
    if (!result.success)
        throw new AggregateError(result.logs, `Cannot bundle ${entrypoint}`)
    return Buffer.from(await result.outputs[0].arrayBuffer())
}

const bundles = {}
for (const [name, entrypoint] of Object.entries({
    fullApi: 'src/index.ts',
    radixAdapter: 'src/radix.ts',
    providerConsumer: 'scripts/benchmarks/provider-consumer.tsx',
})) {
    const output = await bundle(entrypoint, external)
    bundles[name] = {
        entrypoint,
        rawBytes: output.length,
        gzipBytes: gzipSync(output, { level: 9 }).length,
    }
}

const fixture = await bundle('scripts/benchmarks/focus-fixture.tsx')
const server = createServer((request, response) => {
    if (request.url?.startsWith('/fixture.js')) {
        response.setHeader('Content-Type', 'text/javascript')
        response.end(fixture)
        return
    }
    response.setHeader('Content-Type', 'text/html')
    response.end(
        '<!doctype html><html><body><div id="root"></div><div id="unrelated"></div><script type="module" src="/fixture.js"></script></body></html>',
    )
})
await new Promise((resolveListen) =>
    server.listen(0, '127.0.0.1', resolveListen),
)
const browser = await chromium.launch()
try {
    const workloads = []
    for (const hosts of settings.hosts) {
        const page = await browser.newPage({ reducedMotion: 'reduce' })
        const errors = []
        page.on('pageerror', (error) => errors.push(error.message))
        await page.addInitScript(() => {
            window.benchmarkCounters = {
                observerCreations: 0,
                observerCallbacks: 0,
                regionQueries: 0,
            }
            const OriginalObserver = window.MutationObserver
            window.MutationObserver = class extends OriginalObserver {
                constructor(callback) {
                    window.benchmarkCounters.observerCreations++
                    super((records, observer) => {
                        window.benchmarkCounters.observerCallbacks++
                        callback(records, observer)
                    })
                }
            }
            for (const prototype of [
                Document.prototype,
                Element.prototype,
                DocumentFragment.prototype,
            ]) {
                const originalQuery = prototype.querySelectorAll
                prototype.querySelectorAll = function (selector) {
                    if (selector.includes('[data-rentner-toast-region]'))
                        window.benchmarkCounters.regionQueries++
                    return originalQuery.call(this, selector)
                }
            }
        })
        await page.goto(
            `http://127.0.0.1:${server.address().port}/?hosts=${hosts}`,
        )
        await page.locator('[data-rentner-toast-region]').waitFor()
        await page.waitForFunction(
            () => document.querySelectorAll('[data-toast-id]').length === 3,
        )
        await page.waitForFunction(
            () => document.querySelectorAll('[role="dialog"]').length > 0,
        )
        await page.waitForTimeout(250)
        await page.evaluate((nodeCount) => {
            const fragment = document.createDocumentFragment()
            for (let index = 0; index < nodeCount; index++) {
                const node = document.createElement('span')
                node.textContent = 'initial'
                fragment.append(node)
            }
            document.getElementById('unrelated').append(fragment)
        }, settings.unrelatedNodes)
        const mountCounters = await page.evaluate(() => ({
            ...window.benchmarkCounters,
        }))
        const samples = []
        for (
            let run = 0;
            run < settings.warmupRuns + settings.measuredRuns;
            run++
        ) {
            const sample = await page.evaluate(async (mutations) => {
                const nodes = document.getElementById('unrelated').children
                const before = { ...window.benchmarkCounters }
                const start = performance.now()
                for (let index = 0; index < mutations; index++) {
                    nodes[index % nodes.length].textContent =
                        `mutation ${index}`
                    // Two microtasks let observer delivery and React snapshot checks finish per mutation.
                    await Promise.resolve()
                    await Promise.resolve()
                }
                const durationMs = performance.now() - start
                const after = window.benchmarkCounters
                return {
                    durationMs,
                    observerCreations:
                        after.observerCreations - before.observerCreations,
                    observerCallbacks:
                        after.observerCallbacks - before.observerCallbacks,
                    regionQueries: after.regionQueries - before.regionQueries,
                }
            }, settings.mutations)
            if (run >= settings.warmupRuns) samples.push(sample)
        }
        if (errors.length) throw new Error(errors.join('\n'))
        const sorted = samples
            .map((sample) => sample.durationMs)
            .toSorted((a, b) => a - b)
        workloads.push({
            hosts,
            label: 'Toast bridge overhead in non-trapping dialog hosts',
            mountCounters,
            medianMs: sorted[Math.floor(sorted.length / 2)],
            p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1],
            samples,
        })
        await page.close()
    }
    const manifest = JSON.parse(
        await readFile(
            resolve(root, 'node_modules/@playwright/test/package.json'),
            'utf8',
        ),
    )
    const result = {
        revision: sourceRevision,
        source: {
            mode: requestedRef ? 'git-ref' : 'working-tree',
            requestedRef: requestedRef ?? null,
            revision: sourceRevision,
            headRevision,
            dirty: requestedRef ? false : sourceDirty,
            diffSha256: requestedRef
                ? null
                : createHash('sha256').update(sourceDiff).digest('hex'),
            bundledSourcesSha256: createHash('sha256')
                .update(
                    JSON.stringify(
                        [...originalSources].toSorted(([a], [b]) =>
                            a.localeCompare(b),
                        ),
                    ),
                )
                .digest('hex'),
        },
        capturedAt: new Date().toISOString(),
        environment: {
            os: platform(),
            release: release(),
            arch: arch(),
            cpu: cpus()[0]?.model,
            bun: Bun.version,
            playwright: manifest.version,
            chromium: browser.version(),
            react: JSON.parse(
                await readFile(
                    resolve(root, 'node_modules/react/package.json'),
                    'utf8',
                ),
            ).version,
            reactDom: JSON.parse(
                await readFile(
                    resolve(root, 'node_modules/react-dom/package.json'),
                    'utf8',
                ),
            ).version,
            lucideReact: JSON.parse(
                await readFile(
                    resolve(root, 'node_modules/lucide-react/package.json'),
                    'utf8',
                ),
            ).version,
        },
        settings: {
            ...settings,
            external,
            minify: true,
            gzipLevel: 9,
            reducedMotion: 'reduce',
            persistentToasts: 3,
            toastDuration: 0,
        },
        bundles,
        workloads,
    }
    await mkdir(resolve(destination, '..'), { recursive: true })
    await writeFile(destination, `${JSON.stringify(result, null, 4)}\n`)
    console.log(
        JSON.stringify(
            {
                destination,
                bundles,
                workloads: workloads.map(
                    ({ hosts, medianMs, p95Ms, mountCounters }) => ({
                        hosts,
                        medianMs,
                        p95Ms,
                        mountCounters,
                    }),
                ),
            },
            null,
            4,
        ),
    )
} finally {
    await browser.close()
    await new Promise((resolveClose, reject) =>
        server.close((error) => (error ? reject(error) : resolveClose())),
    )
}
