import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

interface PackageContract {
    exports: Record<string, unknown>
    peerDependencies: Record<string, string>
    scripts: Record<string, string>
}

const packageJson = JSON.parse(
    readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'),
) as PackageContract
const readme = readFileSync(
    new URL('../../../README.md', import.meta.url),
    'utf8',
)
const usageGuide = readFileSync(
    new URL('../../../docs/usage.md', import.meta.url),
    'utf8',
)

describe('published package contract', () => {
    test('keeps the shared React and test contracts', () => {
        expect(packageJson.peerDependencies.react).toBe('^19.0.0')
        expect(packageJson.peerDependencies['react-dom']).toBe('^19.0.0')
        expect(packageJson.scripts.test).toBe('bun test')
    })

    test('publishes every documented entry point', () => {
        expect(Object.keys(packageJson.exports)).toEqual([
            '.',
            './tailwind.css',
            './toast',
            './messages',
            './types',
            './package.json',
            './lazy-provider',
            './ai',
        ])
        expect(packageJson.exports['./toast']).toEqual({
            types: './dist/lib/ToastStore/toastApi.d.ts',
            import: './dist/lib/ToastStore/toastApi.js',
        })
        expect(packageJson.exports['./messages']).toEqual({
            types: './dist/lib/Messages/toastMessages.d.ts',
            import: './dist/lib/Messages/toastMessages.js',
        })
        expect(packageJson.exports['./types']).toEqual({
            types: './dist/types.d.ts',
            import: './dist/types.js',
        })
        expect(packageJson.exports['./lazy-provider']).toEqual({
            types: './dist/shared/Toast/Components/ToastProvider.d.ts',
            import: './dist/shared/Toast/Components/ToastProvider.js',
        })
        expect(packageJson.exports['./package.json']).toBe('./package.json')
    })

    test('documents npm before Bun installation', () => {
        const npmInstallPosition = readme.indexOf(
            'npm install @rentnerkev/toasts',
        )
        const bunInstallPosition = readme.indexOf('bun add @rentnerkev/toasts')

        expect(npmInstallPosition).toBeGreaterThan(-1)
        expect(bunInstallPosition).toBeGreaterThan(npmInstallPosition)
    })

    test('documents scoped stores alongside the global api', () => {
        expect(usageGuide).toContain('createToastStore')
        expect(usageGuide).toContain('useToast()')
        expect(usageGuide).toContain('<ToastProvider store={adminStore}')
    })
})
