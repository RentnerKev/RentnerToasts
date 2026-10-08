import { beforeAll, describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import {
    getPackageApi,
    getPackageDocumentation,
    getPackageExamples,
    getPackageInfo,
    searchPackageDocumentation,
} from '../ai.ts'

beforeAll(() => {
    const build = spawnSync(process.execPath, ['run', 'build'], {
        cwd: new URL('../../', import.meta.url),
        encoding: 'utf8',
    })
    if (build.status !== 0) throw new Error(build.stderr || build.stdout)
})

describe('read-only AI package context', () => {
    test('publishes the separate entry and full guides', () => {
        const info = getPackageInfo()
        const manifest = JSON.parse(
            readFileSync(
                new URL('../../package.json', import.meta.url),
                'utf8',
            ),
        )
        expect(info.name).toBe(manifest.name)
        expect(info.version).toBe(manifest.version)
        expect(info.exports['./ai']).toEqual({
            types: './dist/ai.d.ts',
            import: './dist/ai.js',
        })
        expect(manifest.files).toContain('docs/usage.md')
        expect(getPackageDocumentation().content).toContain(info.name)
        expect(getPackageDocumentation('readme').path).toBe('README.md')
    })

    test('returns declarations for every public typed entry and dependent types', () => {
        const api = getPackageApi()
        expect(Object.keys(api.subpaths)).toContain('.')
        expect(api.subpaths).not.toHaveProperty('./ai')
        expect(api.declarations.length).toBeGreaterThan(1)
        expect(
            api.declarations.every(
                (file) =>
                    file.path.startsWith('dist/') &&
                    file.path.endsWith('.d.ts'),
            ),
        ).toBe(true)
        expect(
            getPackageApi({ subpath: './types', symbol: 'ToastApi' })
                .declarations.length,
        ).toBeGreaterThan(0)
        const root = api.declarations.find(
            (file) => file.path === 'dist/index.d.ts',
        )!
        const symbol = root.content.match(/export\s*\{\s*(\w+)/)![1]!
        expect(
            getPackageApi({ subpath: '.', symbol }).declarations.length,
        ).toBeGreaterThan(0)
        expect(
            getPackageApi({ subpath: './types' }).declarations.length,
        ).toBeGreaterThan(0)
    })

    test('rejects nonexistent symbols and caller-controlled paths', () => {
        expect(() =>
            getPackageApi({ symbol: 'DefinitelyNotAPublicSymbol' }),
        ).toThrow('Unknown public symbol')
        expect(() => getPackageApi({ symbol: '../private' })).toThrow(
            'Invalid public symbol',
        )
        expect(() => getPackageApi({ subpath: '../package.json' })).toThrow(
            'Unknown public subpath',
        )
        expect(() => getPackageApi({ subpath: './tailwind.css' })).toThrow(
            'Unknown public subpath',
        )
        expect(() =>
            getPackageDocumentation('../package.json' as 'usage'),
        ).toThrow('Unknown package document')
    })

    test('searches literally and extracts original usage examples', () => {
        expect(searchPackageDocumentation('tailwind').length).toBeGreaterThan(0)
        expect(searchPackageDocumentation('   ')).toEqual([])
        expect(searchPackageDocumentation('[.* definitely absent')).toEqual([])
        const examples = getPackageExamples()
        expect(examples.length).toBeGreaterThan(0)
        expect(
            examples.every((example) =>
                getPackageDocumentation().content.includes(example.code),
            ),
        ).toBe(true)
    })
})
