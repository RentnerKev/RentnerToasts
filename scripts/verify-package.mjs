import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
    existsSync,
    mkdtempSync,
    mkdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

const packageRoot = process.cwd()
const manifest = JSON.parse(
    readFileSync(join(packageRoot, 'package.json'), 'utf8'),
)
const temporaryRoot = mkdtempSync(join(tmpdir(), 'rentner-package-consumer-'))
const npmCli = [
    join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    join(
        dirname(process.execPath),
        '..',
        'lib',
        'node_modules',
        'npm',
        'bin',
        'npm-cli.js',
    ),
].find(existsSync)
assert.ok(npmCli, 'npm must be installed alongside Node.js')

function npm(args, cwd) {
    return execFileSync(process.execPath, [npmCli, ...args], {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'inherit'],
        windowsHide: true,
    })
}

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
    const tarball = join(temporaryRoot, packed[0].filename)
    const consumerRoot = join(temporaryRoot, 'consumer')
    mkdirSync(consumerRoot)

    const dependencies = {
        [manifest.name]: `file:${tarball}`,
        react: manifest.devDependencies.react,
        'react-dom': manifest.devDependencies['react-dom'],
    }
    for (const [name, range] of Object.entries(
        manifest.peerDependencies ?? {},
    )) {
        if (!(name in dependencies)) {
            dependencies[name] = manifest.devDependencies?.[name] ?? range
        }
    }
    writeFileSync(
        join(consumerRoot, 'package.json'),
        JSON.stringify({
            name: 'package-consumer-smoke',
            private: true,
            type: 'module',
            dependencies,
            devDependencies: {
                typescript: manifest.devDependencies.typescript,
                '@types/react': manifest.devDependencies['@types/react'],
                '@types/react-dom':
                    manifest.devDependencies['@types/react-dom'],
            },
        }),
    )
    npm(
        ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--silent'],
        consumerRoot,
    )

    const installedPackage = join(
        consumerRoot,
        'node_modules',
        ...manifest.name.split('/'),
    )
    const sourceMap = JSON.parse(
        readFileSync(join(installedPackage, 'dist/index.js.map'), 'utf8'),
    )
    assert.ok(
        sourceMap.sourcesContent?.length &&
            sourceMap.sourcesContent.every(Boolean),
        'Published source maps must include their original source content',
    )

    const entryPoints = Object.keys(manifest.exports)
        .filter(
            (entry) => entry !== './package.json' && entry !== './tailwind.css',
        )
        .map(
            (entry) => `${manifest.name}${entry === '.' ? '' : entry.slice(1)}`,
        )
    const script = `
        import { readFileSync } from 'node:fs'
        for (const entry of ${JSON.stringify(entryPoints)}) await import(entry)
        const css = import.meta.resolve(${JSON.stringify(`${manifest.name}/tailwind.css`)})
        if (!readFileSync(new URL(css), 'utf8').trim()) throw new Error('CSS export is empty')
    `
    execFileSync(process.execPath, ['--input-type=module', '--eval', script], {
        cwd: consumerRoot,
        stdio: 'inherit',
    })

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
        join(consumerRoot, 'tsconfig.json'),
        JSON.stringify({
            compilerOptions: {
                target: 'ESNext',
                lib: ['ESNext', 'DOM'],
                module: 'ESNext',
                moduleResolution: 'bundler',
                strict: true,
                noEmit: true,
                skipLibCheck: true,
            },
            include: ['smoke.ts'],
        }),
    )
    execFileSync(
        process.execPath,
        [
            join(consumerRoot, 'node_modules', 'typescript', 'bin', 'tsc'),
            '--project',
            consumerRoot,
        ],
        { cwd: consumerRoot, stdio: 'inherit' },
    )
    console.log(
        `Packed consumer smoke test passed: ${manifest.name}@${manifest.version}`,
    )
} finally {
    rmSync(temporaryRoot, { recursive: true, force: true })
}
