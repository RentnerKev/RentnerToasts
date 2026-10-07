import type {
    PackageIdentity,
    PublishedPackage,
} from '../../lib/Types/automation.types.ts'

export interface ExpectedArtifact extends PackageIdentity {
    integrity: string
}

export interface RegistrySnapshot {
    published: PublishedPackage | undefined
    latest: string | undefined
}
