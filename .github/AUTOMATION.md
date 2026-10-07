# Repository automation

CI cancels superseded checks. npm publication serializes the stable `latest` destination; release notes serialize each release without cancelling writes. Releases must be published stable `vMAJOR.MINOR.PATCH` tags whose committed package identity and exact tag commit match a main ancestor. The pipeline does not rewrite versions.

Privileged scripts execute from trusted main, while release builds use the validated exact tag. Dependabot metadata executes trusted base code. Auto-merge verifies the current run/attempt, workflow identity and unchanged definition, bot-authored verified commits, exact head, and one digest-bearing minor/patch marker before approving that commit and enabling guarded auto-merge. Artifacts are data, never executable publisher input.

Publication compares the packed tarball's SHA-512 integrity with npm, refuses version collisions, and verifies the resulting stable channel. Existing banner assets are reused only with a matching SHA-256 digest and are never clobbered. Managed release notes replace only their explicit marker section; author notes remain outside it. Concurrent author changes detected before an update cause a safe failure. GitHub does not offer an atomic body compare-and-swap through this API; maintainers should avoid simultaneous manual and automated edits.

PR title checks use read-only `pull_request_target` and trusted base code without a PR checkout. Workflow lint executes a checksum-verified actionlint installer from trusted base. A fixed, checksum-verified bootstrap handles first adoption when the base has no installer yet. CI scripts are TypeScript; shell only orchestrates download, checksum verification and extraction.

Dependabot covers root/playground Bun locks and pinned Actions, with a one-day version-update cooldown and minor/patch groups. Majors remain separate. Required labels must be provisioned before enabling label consumers: `dependencies`, `bun`, `github-actions`, `major`, `minor`, `patch`, `security`, `ci`. Cooldown does not intentionally delay security fixes. Security labels are assigned only to verified vulnerability fixes using platform metadata or maintainer review; the read-only metadata workflow does not write labels or infer security from SemVer. Existing CodeQL and redacted Gitleaks coverage remain in place.

Checks: `tsc --noEmit -p .github/scripts/tsconfig.json`, automation unit tests under `src/tests/automation`, actionlint, and shellcheck. Verify actual GitHub job and npm OIDC behavior after integration; local tests never publish or merge.

Commit-based notes classify `fix(security):`, `chore(security):` and `deps(security):` ahead of routine changes; labels alone do not alter generated commit categories.
