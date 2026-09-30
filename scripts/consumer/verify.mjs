/* eslint-disable no-await-in-loop -- Browser engines run sequentially to bound memory use. */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
    existsSync,
    mkdtempSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    rmSync,
    writeFileSync,
} from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium, firefox, webkit, expect } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'
import { check } from './checks.mjs'

const packageRoot = process.cwd()
const manifest = JSON.parse(
    readFileSync(join(packageRoot, 'package.json'), 'utf8'),
)
const playground = JSON.parse(
    readFileSync(join(packageRoot, 'playground/package.json'), 'utf8'),
)
function playgroundDependency(name) {
    const version =
        playground.devDependencies?.[name] ?? playground.dependencies?.[name]
    assert.ok(version, `The playground must declare ${name}`)
    return version
}
const temporaryRoot = mkdtempSync(join(tmpdir(), 'rentner-package-consumer-'))
const consumerRoot = join(temporaryRoot, 'consumer')
const npmCli = [
    join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'),
    join(dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js'),
].find(existsSync)
assert.ok(npmCli, 'npm must be installed alongside Node.js')

function runNode(args, cwd = consumerRoot) {
    return execFileSync(process.execPath, args, {
        cwd,
        encoding: 'utf8',
        windowsHide: true,
        env: { ...process.env, TZ: 'UTC' },
        stdio: ['ignore', 'pipe', 'inherit'],
    })
}

function npm(args, cwd = consumerRoot) {
    return runNode([npmCli, ...args], cwd)
}

function sourceMaps(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name)
        return entry.isDirectory()
            ? sourceMaps(path)
            : entry.name.endsWith('.js.map')
              ? [path]
              : []
    })
}

let server
try {
    const packed = JSON.parse(
        npm(
            [
                'pack',
                '--ignore-scripts',
                '--pack-destination',
                temporaryRoot,
                '--json',
            ],
            packageRoot,
        ),
    )
    assert.equal(packed.length, 1)
    mkdirSync(consumerRoot)
    const reactVersion = process.env.CONSUMER_REACT_VERSION
    const dependencies = {
        [manifest.name]: `file:${join(temporaryRoot, packed[0].filename)}`,
        react: reactVersion ?? manifest.devDependencies.react,
        'react-dom': reactVersion ?? manifest.devDependencies['react-dom'],
    }
    for (const [name, range] of Object.entries(
        manifest.peerDependencies ?? {},
    )) {
        dependencies[name] ??= manifest.devDependencies?.[name] ?? range
    }
    writeFileSync(
        join(consumerRoot, 'package.json'),
        JSON.stringify({
            name: 'packed-package-consumer',
            private: true,
            type: 'module',
            dependencies,
            devDependencies: {
                typescript: manifest.devDependencies.typescript,
                '@types/react':
                    reactVersion ?? manifest.devDependencies['@types/react'],
                '@types/react-dom':
                    reactVersion ??
                    manifest.devDependencies['@types/react-dom'],
                vite: playgroundDependency('vite'),
                tailwindcss: playgroundDependency('tailwindcss'),
                '@tailwindcss/vite': playgroundDependency('@tailwindcss/vite'),
            },
        }),
    )
    npm(['install', '--ignore-scripts', '--no-audit', '--no-fund', '--silent'])
    const installedPackage = join(
        consumerRoot,
        'node_modules',
        ...manifest.name.split('/'),
    )
    const maps = sourceMaps(join(installedPackage, 'dist'))
    assert.ok(maps.length > 0, 'Published JavaScript must have source maps')
    for (const path of maps) {
        const map = JSON.parse(readFileSync(path, 'utf8'))
        assert.ok(
            map.sourcesContent?.length && map.sourcesContent.every(Boolean),
            `${path} must include original sources`,
        )
    }
    const entryPoints = Object.keys(manifest.exports)
        .filter(
            (entry) => entry !== './package.json' && entry !== './tailwind.css',
        )
        .map(
            (entry) => `${manifest.name}${entry === '.' ? '' : entry.slice(1)}`,
        )
    runNode([
        '--input-type=module',
        '--eval',
        `
        import { readFileSync } from 'node:fs'
        for (const entry of ${JSON.stringify(entryPoints)}) await import(entry)
        const css = import.meta.resolve('${manifest.name}/tailwind.css')
        if (!readFileSync(new URL(css), 'utf8').trim()) throw new Error('CSS export is empty')
    `,
    ])
    writeFileSync(
        join(consumerRoot, 'smoke.ts'),
        entryPoints
            .map(
                (entry, index) =>
                    `type Entry${index} = typeof import('${entry}')`,
            )
            .join('\n'),
    )
    writeFileSync(
        join(consumerRoot, 'App.tsx'),
        readFileSync(
            fileURLToPath(new URL('./App.tsx', import.meta.url)),
            'utf8',
        ),
    )
    writeFileSync(
        join(consumerRoot, 'Consumer.tsx'),
        `
        import { useEffect } from 'react'
        import { App } from './App.js'
        export function Consumer() {
            useEffect(() => { document.documentElement.dataset.hydrated = 'true' }, [])
            return <main><h1>Packaged consumer</h1><App /></main>
        }
    `,
    )
    writeFileSync(
        join(consumerRoot, 'ssr.tsx'),
        `
        import { renderToString } from 'react-dom/server'
        import { Consumer } from './Consumer.js'
        export const html = renderToString(<Consumer />)
    `,
    )
    writeFileSync(
        join(consumerRoot, 'main.tsx'),
        `
        import { hydrateRoot } from 'react-dom/client'
        import { Consumer } from './Consumer.js'
        import './styles.css'
        declare global { interface Window { consumerHydrationErrors: string[] } }
        window.consumerHydrationErrors = []
        hydrateRoot(document.getElementById('root')!, <Consumer />, {
            onRecoverableError(error) { window.consumerHydrationErrors.push(String(error)) },
        })
    `,
    )
    writeFileSync(
        join(consumerRoot, 'styles.css'),
        `@import 'tailwindcss';\n@import '${manifest.name}/tailwind.css';\n@source './*.tsx';`,
    )
    writeFileSync(
        join(consumerRoot, 'vite-env.d.ts'),
        '/// <reference types="vite/client" />\n',
    )
    writeFileSync(
        join(consumerRoot, 'tsconfig.json'),
        JSON.stringify({
            compilerOptions: {
                target: 'ESNext',
                lib: ['ESNext', 'DOM', 'DOM.Iterable'],
                module: 'ESNext',
                moduleResolution: 'bundler',
                jsx: 'react-jsx',
                strict: true,
                noEmit: true,
                skipLibCheck: false,
            },
            include: ['*.ts', '*.tsx'],
        }),
    )
    const tsc = join(consumerRoot, 'node_modules/typescript/bin/tsc')
    runNode([tsc, '--project', consumerRoot])
    // NodeNext catches declaration-resolution problems hidden by bundler mode.
    runNode([
        tsc,
        '--project',
        consumerRoot,
        '--module',
        'NodeNext',
        '--moduleResolution',
        'NodeNext',
    ])
    writeFileSync(
        join(consumerRoot, 'vite.config.mjs'),
        `
        import tailwindcss from '@tailwindcss/vite'
        export default { plugins: [tailwindcss()], resolve: { dedupe: ['react', 'react-dom'] } }
    `,
    )
    const vite = join(consumerRoot, 'node_modules/vite/bin/vite.js')
    runNode([
        vite,
        'build',
        '--logLevel',
        'error',
        '--ssr',
        'ssr.tsx',
        '--outDir',
        'ssr',
    ])
    // Match the browser timezone while rendering calendar and time fixtures.
    process.env.TZ = 'UTC'
    const { html } = await import(
        pathToFileURL(join(consumerRoot, 'ssr/ssr.js')).href
    )
    assert.ok(html.includes('Packaged consumer'))
    writeFileSync(
        join(consumerRoot, 'index.html'),
        `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Packaged consumer</title></head><body><div id="root">${html}</div><script type="module" src="/main.tsx"></script></body></html>`,
    )
    runNode([vite, 'build', '--logLevel', 'error'])
    const outputRoot = resolve(consumerRoot, 'dist')
    const mime = {
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.html': 'text/html',
        '.map': 'application/json',
    }
    server = createServer((request, response) => {
        const pathname = decodeURIComponent(
            new URL(request.url, 'http://localhost').pathname,
        )
        const path = resolve(
            outputRoot,
            `.${pathname === '/' ? '/index.html' : pathname}`,
        )
        if (!path.startsWith(outputRoot + sep) || !existsSync(path)) {
            response.writeHead(404).end()
            return
        }
        const extension = path.slice(path.lastIndexOf('.'))
        response.setHeader(
            'Content-Type',
            mime[extension] ?? 'application/octet-stream',
        )
        response.end(readFileSync(path))
    })
    await new Promise((done) => server.listen(0, '127.0.0.1', done))
    const url = `http://127.0.0.1:${server.address().port}`
    for (const [name, browserType] of Object.entries({
        chromium,
        firefox,
        webkit,
    })) {
        const browser = await browserType.launch({ headless: true })
        try {
            const context = await browser.newContext({
                timezoneId: 'UTC',
                reducedMotion: 'reduce',
            })
            const page = await context.newPage()
            const errors = []
            page.on('pageerror', (error) => errors.push(String(error)))
            await page.goto(url)
            await expect(page.locator('html')).toHaveAttribute(
                'data-hydrated',
                'true',
            )
            expect(
                await page.evaluate(() => window.consumerHydrationErrors),
            ).toEqual([])
            expect(errors).toEqual([])
            await check({ page, expect })
            const accessibility = await new AxeBuilder({ page }).analyze()
            expect(accessibility.violations).toEqual([])
            expect(errors).toEqual([])
            console.log(
                `Packed consumer ${name} passed: ${manifest.name}@${manifest.version} (React ${dependencies.react})`,
            )
        } finally {
            await browser.close()
        }
    }
} finally {
    if (server) {
        server.closeAllConnections()
        await new Promise((done) => server.close(done))
    }
    // Only remove the dedicated directory created by mkdtemp for this run.
    assert.ok(
        resolve(temporaryRoot).startsWith(resolve(tmpdir()) + sep) &&
            temporaryRoot.includes('rentner-package-consumer-'),
    )
    rmSync(temporaryRoot, { recursive: true, force: true })
}
