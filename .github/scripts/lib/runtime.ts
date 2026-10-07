import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export function isMain(url: string): boolean {
    return (
        Boolean(process.argv[1]) &&
        resolve(process.argv[1]) === fileURLToPath(url)
    )
}

export function requiredEnv(name: string): string {
    const value = process.env[name]
    if (!value || containsControlCharacters(value))
        throw new Error(`Invalid ${name}`)
    return value
}

export function eventData<T>(): T {
    return JSON.parse(
        readFileSync(requiredEnv('GITHUB_EVENT_PATH'), 'utf8'),
    ) as T
}

export function output(name: string, value: string): void {
    if (!/^[a-z][a-z0-9_-]*$/.test(name) || containsControlCharacters(value))
        throw new Error('Unsafe workflow output')
    appendFileSync(requiredEnv('GITHUB_OUTPUT'), `${name}=${value}\n`)
}

export function command(
    program: string,
    args: readonly string[],
    input?: string,
): string {
    try {
        return execFileSync(program, [...args], {
            encoding: 'utf8',
            input,
            maxBuffer: 10_000_000,
            stdio: ['pipe', 'pipe', 'pipe'],
        }).trim()
    } catch {
        // CLI errors can contain authentication headers or untrusted payloads.
        throw new Error(`${program} command failed`)
    }
}

export function api<T>(endpoint: string, method = 'GET', body?: object): T {
    const args = ['api', '--method', method, endpoint]
    if (body) args.push('--input', '-')
    return JSON.parse(
        command('gh', args, body ? JSON.stringify(body) : undefined),
    ) as T
}

export function containsControlCharacters(value: string): boolean {
    return Array.from(value).some((character) => {
        const point = character.codePointAt(0)!
        return (
            point < 32 ||
            (point >= 127 && point <= 159) ||
            point === 0x2028 ||
            point === 0x2029
        )
    })
}
