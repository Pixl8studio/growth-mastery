---
description: Build swarm work manifest from tagged GitHub issues and execute
argument-hint: [--label swarm-ready] [--execute] [--dry-run]
---

# /swarm-issues - Execute Swarm from GitHub Issues

<objective>
Fetch GitHub issues with a specific label, generate a work manifest, and optionally
execute the swarm. Enables using GitHub Issues as your task backlog with automatic
distributed execution.
</objective>

<user-provides>
Label to filter issues (defaults to "swarm-ready")
</user-provides>

<command-delivers>
Generated work manifest, optionally executed across agents with PRs linked back to issues
</command-delivers>

## Usage

```bash
# Preview what would be processed (dry run)
/swarm-issues --dry-run

# Generate manifest and execute
/swarm-issues --execute

# Use custom label
/swarm-issues --label "sprint-47" --execute

# Just generate the manifest file (don't execute)
/swarm-issues --label "ready-for-ai" --output sprint-47.yaml
```

## How It Works

<issue-discovery>
Use GitHub CLI to fetch open issues with the specified label:

```bash
gh issue list --label "swarm-ready" --state open --json number,title,body,labels
```

For each issue, extract:
- Issue number → becomes task ID
- Title → used in branch name
- Body → becomes the task prompt
- Labels → can indicate priority or dependencies
</issue-discovery>

<branch-naming>
Generate branch names from issue titles:

```
Issue: "Add OAuth2 token refresh" (#142)
Branch: feature/142-oauth2-token-refresh

Issue: "[BUG] Session timeout not working" (#156)
Branch: fix/156-session-timeout
```

Sanitize titles: lowercase, replace spaces with hyphens, remove special characters,
prefix with issue number for uniqueness.
</branch-naming>

<dependency-detection>
Look for dependency markers in issue body:

```markdown
## Dependencies
- Depends on #142
- Blocked by #145
```

Or use GitHub's "blocked by" syntax if available. These become `depends_on` in manifest.
</dependency-detection>

<priority-detection>
Map labels to priorities:

- `priority:high` or `urgent` → high
- `priority:low` or `nice-to-have` → low
- Default → medium

Also respect label order if multiple priority labels exist.
</priority-detection>

<manifest-generation>
Generate YAML manifest from discovered issues:

```yaml
# Auto-generated from GitHub issues
# Label: swarm-ready
# Generated: 2024-01-15T10:30:00Z

name: "Swarm from GitHub Issues (swarm-ready)"
base_branch: main

tasks:
  - id: "142"
    prompt: |
      Issue #142: Add OAuth2 token refresh
      
      [Full issue body here]
      
      Original issue: https://github.com/org/repo/issues/142
    branch: feature/142-oauth2-token-refresh
    priority: high
    
  - id: "156"
    prompt: |
      Issue #156: Session timeout not working
      
      [Full issue body here]
      
      Original issue: https://github.com/org/repo/issues/156
    branch: fix/156-session-timeout
    depends_on: ["142"]
```
</manifest-generation>

<execution>
If `--execute` flag provided, run `/swarm` with generated manifest.

The issue becomes a **progress log** throughout execution. Every significant event is
commented back to the issue so you have full visibility.
</execution>

<issue-progress-tracking>
The GitHub issue serves as a real-time progress tracker. Comments are added at each stage:

**1. Task Claimed (when agent picks up the task):**

```markdown
🤖 **Swarm Bot**: Task claimed

Agent: `oracle-arm-2`
Branch: `feature/142-oauth2-token-refresh`
Started: 2024-01-15T10:30:00Z

Working on this now...

---
*Swarm ID: swarm-2024-01-15-abc123*
```

**2. Progress Update (periodically during execution):**

```markdown
🤖 **Swarm Bot**: Progress update

Status: In Progress (45%)
Current stage: Writing tests

Agent: `oracle-arm-2`
Elapsed: 8 minutes

---
*Updated: 2024-01-15T10:38:00Z*
```

**3. PR Created (on successful completion):**

```markdown
🤖 **Swarm Bot**: ✅ PR Ready for Review!

**Pull Request:** #789
**Branch:** `feature/142-oauth2-token-refresh`
**Agent:** `oracle-arm-2`
**Duration:** 12 minutes

### Summary
- Implemented OAuth2 token refresh flow
- Added 15 unit tests (coverage: 94%)
- Updated documentation

### What was done
- Created `src/auth/tokenRefresh.ts`
- Modified `src/middleware/auth.ts`
- Added tests in `tests/auth/tokenRefresh.test.ts`

---
*Completed: 2024-01-15T10:42:00Z*
```

**4. On Failure (if task fails):**

```markdown
🤖 **Swarm Bot**: ❌ Task Failed

**Agent:** `oracle-arm-2`
**Duration:** 8 minutes
**Stage:** Running tests

### Error
```
Test suite failed: 3 tests failing
- tokenRefresh.test.ts: timeout error
```

### Next Steps
- Review the error above
- Fix and retry with `/swarm-issues --retry 142`
- Or remove `swarm-ready` label to skip

---
*Failed: 2024-01-15T10:38:00Z*
```

**5. Dependency Waiting (when blocked):**

```markdown
🤖 **Swarm Bot**: ⏳ Waiting for dependencies

This issue depends on:
- [ ] #140 - Database schema changes (in progress)
- [x] #141 - API types update (complete)

Will automatically start when dependencies complete.

---
*Queued: 2024-01-15T10:30:00Z*
```
</issue-progress-tracking>

<label-management>
Labels are automatically updated to reflect status:

| Stage | Label Changes |
|-------|---------------|
| Task claimed | Remove `swarm-ready`, add `swarm:in-progress` |
| PR created | Remove `swarm:in-progress`, add `swarm:pr-ready` |
| PR merged | Remove `swarm:pr-ready`, add `swarm:completed` |
| Task failed | Remove `swarm:in-progress`, add `swarm:failed` |
| Waiting deps | Add `swarm:blocked` |

This makes it easy to filter issues by status in GitHub.
</label-management>

<issue-update-commands>
GitHub CLI commands used for updates:

```bash
# Add comment to issue
gh issue comment 142 --body "🤖 **Swarm Bot**: Task claimed..."

# Update labels
gh issue edit 142 --remove-label "swarm-ready" --add-label "swarm:in-progress"

# Link PR to issue (in PR description)
gh pr create --body "Closes #142

## Summary
..."
```
</issue-update-commands>

<pr-issue-linking>
PRs are automatically linked to issues:

1. PR description includes `Closes #142` for auto-close on merge
2. PR title references issue: `feat: Add OAuth2 token refresh (#142)`
3. Issue gets a comment with PR link
4. GitHub's sidebar shows linked PRs

When PR is merged, GitHub automatically closes the linked issue.
</pr-issue-linking>

## Issue Format Best Practices

For best results, structure your issues like this:

```markdown
## Description
Clear description of what needs to be done.

## Acceptance Criteria
- [ ] Feature works as expected
- [ ] Tests are included
- [ ] Documentation updated

## Dependencies
- Depends on #142 (optional)

## Technical Notes
Any implementation hints or constraints (optional)
```

The entire issue body becomes the task prompt, so write it as instructions for an
autonomous developer.

## Labels for Control

| Label | Effect |
|-------|--------|
| `swarm-ready` | Issue will be picked up (default) |
| `priority:high` | Task runs with high priority |
| `priority:low` | Task runs with low priority |
| `blocked` | Issue skipped until label removed |
| `needs-clarification` | Issue skipped, needs human input |

## Example Workflow

1. **Create issues** as you normally would
2. **Tag with `swarm-ready`** when issue is clear enough for AI
3. **Run** `/swarm-issues --execute`
4. **Review PRs** that get created
5. **Merge** when satisfied

```
GitHub Issues                    Swarm                         PRs
┌─────────────┐                                          ┌─────────────┐
│ #142 OAuth  │──┐                                   ┌──→│ PR #789     │
│ [swarm-ready]│  │    ┌─────────────────┐          │   └─────────────┘
└─────────────┘  ├───→│ /swarm-issues   │──────────┤
┌─────────────┐  │    │ --execute       │          │   ┌─────────────┐
│ #156 Timeout│──┘    └─────────────────┘          └──→│ PR #790     │
│ [swarm-ready]│                                        └─────────────┘
└─────────────┘
```

## Flags

| Flag | Description |
|------|-------------|
| `--label <name>` | Label to filter issues (default: swarm-ready) |
| `--execute` | Run swarm after generating manifest |
| `--dry-run` | Show what would be processed, don't execute |
| `--output <file>` | Save manifest to file instead of executing |
| `--auto-close` | Close issues when PR is merged |
| `--local` | Pass to swarm: run sequentially on local machine |
| `--limit <n>` | Maximum issues to process |
| `--repo <owner/repo>` | Target repo (default: current) |
| `--verbose` | Post progress updates every 2 minutes |
| `--quiet` | Only post start and completion comments |
| `--no-labels` | Don't modify issue labels |

## Example Issue Timeline

Here's what a GitHub issue looks like after being processed by the swarm:

```
┌─────────────────────────────────────────────────────────────────────┐
│ #142 Add OAuth2 token refresh                                       │
│ Labels: swarm:completed                                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ @developer · 2 hours ago                                           │
│ ┌─────────────────────────────────────────────────────────────┐    │
│ │ ## Description                                               │    │
│ │ Implement OAuth2 token refresh flow...                       │    │
│ │                                                              │    │
│ │ ## Acceptance Criteria                                       │    │
│ │ - [ ] Tokens refresh automatically                           │    │
│ │ - [ ] Tests included                                         │    │
│ └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│ 🤖 swarm-bot · 1 hour ago                                          │
│ ┌─────────────────────────────────────────────────────────────┐    │
│ │ 🤖 **Swarm Bot**: Task claimed                               │    │
│ │                                                              │    │
│ │ Agent: `oracle-arm-2`                                        │    │
│ │ Branch: `feature/142-oauth2-token-refresh`                   │    │
│ │ Started: 2024-01-15T10:30:00Z                                │    │
│ └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│ 🤖 swarm-bot · 50 minutes ago                                      │
│ ┌─────────────────────────────────────────────────────────────┐    │
│ │ 🤖 **Swarm Bot**: Progress update                            │    │
│ │                                                              │    │
│ │ Status: In Progress (65%)                                    │    │
│ │ Current stage: Writing tests                                 │    │
│ └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│ 🤖 swarm-bot · 45 minutes ago                                      │
│ ┌─────────────────────────────────────────────────────────────┐    │
│ │ 🤖 **Swarm Bot**: ✅ PR Ready for Review!                    │    │
│ │                                                              │    │
│ │ **Pull Request:** #789                                       │    │
│ │ **Duration:** 12 minutes                                     │    │
│ │                                                              │    │
│ │ ### Summary                                                  │    │
│ │ - Implemented OAuth2 token refresh flow                      │    │
│ │ - Added 15 unit tests                                        │    │
│ └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│ 🔗 Linked Pull Requests                                            │
│    PR #789 - feat: Add OAuth2 token refresh (merged)               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

The issue becomes a complete audit trail of what happened!

## Requirements

- GitHub CLI (`gh`) installed and authenticated
- Write access to repository (for updating issues)
- Issues must be open and have the target label

## State Tracking

Creates `.swarm/issues-state.json` to track:
- Which issues have been processed
- Which PRs were created for which issues
- Timestamp of last run

This prevents re-processing issues that are already in progress.

## See Also

- @.claude/commands/swarm.md - Core swarm execution
- @context/swarm-work-manifest.md - Manifest format
- @.claude/skills/swarm-orchestration/SKILL.md - Distributed patterns
