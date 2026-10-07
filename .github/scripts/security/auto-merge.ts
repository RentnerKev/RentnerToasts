import type {
    AutoMergeIdentity,
    WorkflowRunEvent,
    WorkflowDefinition,
    WorkflowContents,
    ArtifactsResponse,
} from '../lib/Types/automation.types.ts'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { api, command, eventData, isMain, requiredEnv } from '../lib/runtime.ts'
import { eligibleDependabot } from './dependabot-provenance.ts'
import type {
    ReleasePolicy,
    MetadataRun,
    PullRequest,
    BotCommit,
} from '../lib/Types/automation.types.ts'

function verify(): AutoMergeIdentity | undefined {
    const repository = requiredEnv('GITHUB_REPOSITORY')
    const policy = JSON.parse(
        readFileSync(
            fileURLToPath(
                new URL('../../release-policy.json', import.meta.url),
            ),
            'utf8',
        ),
    ) as ReleasePolicy
    if (repository !== policy.repository)
        throw new Error('Repository identity mismatch')
    const event = eventData<WorkflowRunEvent>().workflow_run
    if (
        !Number.isSafeInteger(event.id) ||
        event.id <= 0 ||
        !Number.isSafeInteger(event.run_attempt) ||
        event.run_attempt <= 0 ||
        !/^[a-f0-9]{40}$/.test(event.head_sha) ||
        event.pull_requests.length !== 1
    )
        return undefined
    const run = api<MetadataRun>(
        `repos/${repository}/actions/runs/${event.id}/attempts/${event.run_attempt}`,
    )
    const current = api<MetadataRun>(
        `repos/${repository}/actions/runs/${event.id}`,
    )
    if (current.run_attempt !== event.run_attempt) return undefined
    const prNumber = event.pull_requests[0].number
    if (!Number.isSafeInteger(prNumber) || prNumber <= 0) return undefined
    const pr = api<PullRequest>(`repos/${repository}/pulls/${prNumber}`)
    const workflow = api<WorkflowDefinition>(
        `repos/${repository}/actions/workflows/dependabot-metadata.yml`,
    )
    if (workflow.path !== '.github/workflows/dependabot-metadata.yml')
        return undefined
    const artifacts = api<ArtifactsResponse>(
        `repos/${repository}/actions/runs/${event.id}/artifacts?per_page=100`,
    )
    const commits = api<BotCommit[]>(
        `repos/${repository}/pulls/${prNumber}/commits?per_page=100`,
    )
    const definition = (ref: string) =>
        api<WorkflowContents>(
            `repos/${repository}/contents/.github/workflows/dependabot-metadata.yml?ref=${encodeURIComponent(ref)}`,
        ).content
    if (
        !eligibleDependabot({
            repository,
            runId: event.id,
            attempt: event.run_attempt,
            head: event.head_sha,
            prNumber,
            workflowId: workflow.id,
            run,
            pr,
            artifacts: artifacts.artifacts,
            totalArtifacts: artifacts.total_count,
            commits,
            sourceWorkflow: definition(event.head_sha),
            baseWorkflow: definition(pr.base.sha),
        })
    )
        return undefined
    return { repository, prNumber, head: event.head_sha }
}

if (isMain(import.meta.url)) {
    // Recheck every source and current head immediately before either write.
    const initial = verify()
    if (initial) {
        const fresh = verify()
        if (!fresh || fresh.head !== initial.head)
            throw new Error('Dependabot provenance changed')
        api(
            `repos/${fresh.repository}/pulls/${fresh.prNumber}/reviews`,
            'POST',
            { event: 'APPROVE', commit_id: fresh.head },
        )
        const beforeMerge = verify()
        if (!beforeMerge || beforeMerge.head !== fresh.head)
            throw new Error('Dependabot head changed before merge')
        command('gh', [
            'pr',
            'merge',
            String(fresh.prNumber),
            '--repo',
            fresh.repository,
            '--auto',
            '--squash',
            '--match-head-commit',
            fresh.head,
        ])
    }
}
