export interface ReleaseMetadata {
    id: number
    tag_name: string
    draft: boolean
    prerelease: boolean
    published_at: string
    body: string | null
    assets: { id: number; name: string; size: number; digest: string | null }[]
}

export interface ReleaseEvent {
    release?: ReleaseMetadata
    inputs?: { tag?: string }
}

export interface SelectedRelease {
    release: ReleaseMetadata
    tag: string
    version: string
    repository: string
}

export interface VerifiedRelease extends SelectedRelease {
    commit: string
}

export interface PackageIdentity {
    name: string
    version: string
}

export interface PackedArtifact {
    filename: string
    files: { path: string }[]
}
