import type { PackedArtifact } from '../lib/Types/automation.types.ts'
import { createHash } from 'node:crypto'
import { lstatSync, readFileSync } from 'node:fs'
import { resolve, basename } from 'node:path'
import { command, isMain } from '../lib/runtime.ts'
import { policy, verifyCheckout } from './identity.ts'
import {
    assertArtifactIdentity,
    assertChannelProgression,
    lookupPackage,
    lookupChannels,
    verifyPublication,
} from './registry.ts'

if (isMain(import.meta.url)) {
    const identity = verifyCheckout()
    const { packageName } = policy()
    const packs = JSON.parse(
        command('npm', ['pack', '--json', '--ignore-scripts']),
    ) as PackedArtifact[]
    if (
        packs.length !== 1 ||
        basename(packs[0].filename) !== packs[0].filename ||
        !packs[0].filename.endsWith('.tgz')
    )
        throw new Error('Invalid packed artifact')
    if (
        packs[0].files.some((file) =>
            /^(src|test|tests|playground|\.github)\//.test(file.path),
        )
    )
        throw new Error('Package contains private source/test files')
    const tarball = resolve(packs[0].filename)
    if (!lstatSync(tarball).isFile() || lstatSync(tarball).isSymbolicLink())
        throw new Error('Expected regular package tarball')
    const integrity = `sha512-${createHash('sha512').update(readFileSync(tarball)).digest('base64')}`
    const expected = { name: packageName, version: identity.version, integrity }
    const existing = await lookupPackage(packageName, identity.version)
    if (existing) assertArtifactIdentity(existing, expected)
    const fresh = verifyCheckout()
    if (
        fresh.commit !== identity.commit ||
        fresh.release.id !== identity.release.id
    )
        throw new Error('Release changed before publication')
    assertChannelProgression(
        (await lookupChannels(packageName)).latest,
        identity.version,
    )
    if (!existing)
        command('npm', [
            'publish',
            tarball,
            '--access',
            'public',
            '--tag',
            'latest',
            '--provenance',
            '--ignore-scripts',
        ])
    await verifyPublication(expected)
}
