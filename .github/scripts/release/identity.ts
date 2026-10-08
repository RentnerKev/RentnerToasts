import type { SelectedRelease, VerifiedRelease } from './Types/release.types.ts'
import { repositoryPolicy } from '../lib/repository.ts'
import {
    isPackageIdentity,
    isReleaseEvent,
    isReleaseMetadata,
} from './releaseValidation.ts'
import { readFileSync } from 'node:fs'
import {
    containsControlCharacters,
    api,
    command,
    eventData,
    isMain,
    output,
    parseJson,
} from '../lib/runtime.ts'
import type { ReleaseMetadata } from './Types/release.types.ts'

export function stableVersion(tag: string): string {
    if (
        containsControlCharacters(tag) ||
        !/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(tag)
    )
        throw new Error('Expected a stable vMAJOR.MINOR.PATCH tag')
    return tag.slice(1)
}

export function validRelease(release: ReleaseMetadata, tag: string): boolean {
    return (
        Number.isSafeInteger(release.id) &&
        release.id > 0 &&
        release.tag_name === tag &&
        release.draft === false &&
        release.prerelease === false &&
        typeof release.published_at === 'string' &&
        Number.isFinite(Date.parse(release.published_at))
    )
}

export function selectedRelease(): SelectedRelease {
    const { repository } = repositoryPolicy()
    const event = eventData(isReleaseEvent)
    const tag = event.release?.tag_name ?? event.inputs?.tag
    if (typeof tag !== 'string') throw new Error('Missing release identity')
    const version = stableVersion(tag)
    const release = api(
        `repos/${repository}/releases/tags/${tag}`,
        isReleaseMetadata,
    )
    if (
        !validRelease(release, tag) ||
        (event.release && release.id !== event.release.id)
    )
        throw new Error('Release identity/channel mismatch')
    return { release, tag, version, repository }
}

export function verifyCheckout(): VerifiedRelease {
    const selected = selectedRelease()
    const { packageName } = repositoryPolicy()
    const manifest = parseJson(
        readFileSync('package.json', 'utf8'),
        isPackageIdentity,
    )
    if (manifest.name !== packageName || manifest.version !== selected.version)
        throw new Error('Tag must match the committed package identity/version')
    const commit = command('git', [
        'rev-parse',
        '--verify',
        `refs/tags/${selected.tag}^{commit}`,
    ])
    if (
        !/^[a-f0-9]{40}$/.test(commit) ||
        command('git', ['rev-parse', 'HEAD']) !== commit
    )
        throw new Error('Tag checkout mismatch')
    command('git', [
        'fetch',
        '--no-tags',
        'origin',
        'main:refs/remotes/origin/main',
    ])
    command('git', [
        'merge-base',
        '--is-ancestor',
        commit,
        'refs/remotes/origin/main',
    ])
    const remote = command('git', [
        'ls-remote',
        'origin',
        `refs/tags/${selected.tag}`,
        `refs/tags/${selected.tag}^{}`,
    ])
        .split('\n')
        .map((line) => line.split(/\s+/))
    const resolved =
        remote.find(([, ref]) => ref?.endsWith('^{}'))?.[0] ??
        remote.find(([, ref]) => ref === `refs/tags/${selected.tag}`)?.[0]
    if (resolved !== commit) throw new Error('Published tag moved')
    return { ...selected, commit }
}

if (isMain(import.meta.url)) {
    const selected = process.argv.includes('--checkout')
        ? verifyCheckout()
        : selectedRelease()
    output('tag', selected.tag)
    output('version', selected.version)
}
