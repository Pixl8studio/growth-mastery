# Swarm + /autotask Integration

## Overview

The swarm system distributes development tasks across remote agents, with each agent
using `/autotask` to execute work autonomously. This document explains how the
integration works and how to maintain visibility into task progress.

## Architecture

```
┌─────────────────┐
│   Orchestrator  │  (Local machine)
│  reads manifest │
└────────┬────────┘
         │
         ├─────────────────┬─────────────────┐
         ▼                 ▼                 ▼
   ┌──────────┐      ┌──────────┐      ┌──────────┐
   │ Agent 1  │      │ Agent 2  │      │ Agent N  │
   │ (Remote) │      │ (Remote) │      │ (Remote) │
   └────┬─────┘      └────┬─────┘      └────┬─────┘
        │                 │                 │
        ▼                 ▼                 ▼
   ┌──────────┐      ┌──────────┐      ┌──────────┐
   │ /autotask│      │ /autotask│      │ /autotask│
   │  Task A  │      │  Task B  │      │  Task C  │
   └────┬─────┘      └────┬─────┘      └────┬─────┘
        │                 │                 │
        └─────────────────┴─────────────────┘
                         │
                         ▼
                  ┌─────────────┐
                  │   GitHub    │
                  │   Issues    │
                  │  (Progress) │
                  └─────────────┘
```

## Flow

### 1. Orchestrator Assigns Task

When the orchestrator assigns a task to an agent:

```yaml
# .swarm/manifest.yaml
tasks:
  - id: "129"
    prompt: "Issue #129: Create feature X"
    branch: "feature/129-feature-x"
    priority: medium
```

The orchestrator:

1. Posts initial "Task claimed" comment to GitHub issue #129
2. Sends task to available agent via HTTP
3. Monitors agent status

### 2. Agent Receives Task

The agent-listener (scripts/swarm/agent-listener.ts) receives the task and:

1. Checks out the base branch
2. Creates/switches to task branch
3. Calls `/autotask` with the issue number:
   ```bash
   claude /autotask 129
   ```
4. Sets environment variables for swarm context:
   ```bash
   SWARM_AGENT_NAME=swarm-agent-1
   SWARM_BRANCH=feature/129-feature-x
   SWARM_ISSUE_NUMBER=129
   ```

### 3. /autotask Executes with Progress Updates

`/autotask` follows its normal workflow but posts progress updates to the GitHub issue:

**Checkpoint 1: Task Start**

```bash
.claude/helpers/github-issue-update.sh "$ISSUE_NUM" "Task Start" "In Progress" \
  "Setting up worktree and loading project standards. Expected completion: ~15-20 minutes."
```

**Checkpoint 2: Implementation Progress**

```bash
.claude/helpers/github-issue-update.sh "$ISSUE_NUM" "Implementation" "In Progress" \
  "Environment ready. Implementing feature X following project patterns."
```

**Checkpoint 3: Validation Status**

```bash
.claude/helpers/github-issue-update.sh "$ISSUE_NUM" "Validation" "Completed" \
  "✓ All tests passing (24/24)
✓ Linting clean
✓ Code review addressed"
```

**Checkpoint 4: PR Created**

```bash
.claude/helpers/github-issue-update.sh "$ISSUE_NUM" "PR Created" "Ready for Review" \
  "Pull request created: https://github.com/org/repo/pull/456
All checks passing, ready for human review."
```

**Checkpoint 5: Task Complete**

```bash
.claude/helpers/github-issue-update.sh "$ISSUE_NUM" "Task Complete" "Completed" \
  "✅ Task completed successfully
📝 PR: #456
🔍 All bot feedback addressed
⏭️ Ready to merge after approval"
```

### 4. Agent Reports Back

The agent-listener monitors `/autotask` execution and reports results back to
orchestrator:

```typescript
{
  success: true,
  duration_ms: 900000,  // 15 minutes
  pr_number: 456,
  pr_url: "https://github.com/org/repo/pull/456"
}
```

### 5. Orchestrator Updates State

The orchestrator:

1. Marks task as completed in state.json
2. Updates the GitHub issue with PR link (if not already done by /autotask)
3. Assigns next task to the now-available agent

## GitHub Issue Timeline Example

A typical issue will show this progression of comments:

```
🤖 **Swarm Bot**: Task claimed
**Agent:** swarm-agent-1
**Branch:** feature/129-feature-x
**Started:** 2025-12-05T10:00:00Z
Working on this now...

---

🤖 **Autonomous Task Update** - Task Start
**Status:** In Progress
**Branch:** feature/129-feature-x
Setting up worktree and loading project standards...
---
Updated: 2025-12-05T10:01:00Z | Agent: swarm-agent-1

---

🤖 **Autonomous Task Update** - Implementation
**Status:** In Progress
**Branch:** feature/129-feature-x
Environment ready. Implementing feature X...
---
Updated: 2025-12-05T10:05:00Z | Agent: swarm-agent-1

---

🤖 **Autonomous Task Update** - Validation
**Status:** Completed
**Branch:** feature/129-feature-x
✓ All tests passing (24/24)
✓ Linting clean
✓ Code review addressed
---
Updated: 2025-12-05T10:12:00Z | Agent: swarm-agent-1

---

🤖 **Autonomous Task Update** - PR Created
**Status:** Ready for Review
**Branch:** feature/129-feature-x
Pull request created: https://github.com/org/repo/pull/456
All checks passing, ready for human review.
---
Updated: 2025-12-05T10:14:00Z | Agent: swarm-agent-1

---

🤖 **Autonomous Task Update** - Task Complete
**Status:** Completed
**Branch:** feature/129-feature-x
✅ Task completed successfully
📝 PR: #456
🔍 All bot feedback addressed
⏭️ Ready to merge after approval
---
Updated: 2025-12-05T10:15:00Z | Agent: swarm-agent-1
```

## Key Integration Points

### 1. Issue Number Detection

`/autotask` detects the issue number from:

- Command line argument: `/autotask 129`
- Environment variable: `SWARM_ISSUE_NUMBER`
- Task description: "Issue #129: ..."

### 2. Swarm Context Awareness

`/autotask` knows it's running in a swarm when:

- `SWARM_AGENT_NAME` environment variable is set
- `SWARM_BRANCH` environment variable is set
- This triggers GitHub issue progress updates

### 3. Graceful Degradation

If GitHub CLI is unavailable or issue doesn't exist:

- Helper script fails silently
- `/autotask` continues execution normally
- No impact on task completion

### 4. Agent Isolation

Each agent works in its own:

- Git worktree (`.gitworktrees/task-129/`)
- Process space
- Network connection

This prevents conflicts when multiple agents work in parallel.

## Configuration

### Orchestrator (.swarm/agents.yaml)

```yaml
agents:
  - name: swarm-agent-1
    host: localhost
    port: 3847
    enabled: true

  - name: swarm-agent-2
    host: localhost
    port: 3848
    enabled: true
```

### Agent Listener (on remote VMs)

```bash
# Start agent listener
SWARM_AGENT_NAME=swarm-agent-1 \
SWARM_AGENT_PORT=3847 \
SWARM_WORKSPACE=/home/opc/growth-mastery \
pnpm exec tsx scripts/swarm/agent-listener.ts
```

### /autotask (.claude/commands/autotask.md)

The command is already configured to:

1. Detect swarm context via environment variables
2. Use the helper script for progress updates
3. Maintain full /autotask functionality

No changes needed for new tasks!

## Benefits

1. **Visibility**: See exactly what each agent is doing at each stage
2. **Traceability**: Full history of task execution in GitHub issues
3. **Debugging**: Easy to identify where tasks fail or get stuck
4. **Accountability**: Know which agent handled which task
5. **User Experience**: Stakeholders can monitor progress in real-time
6. **Zero Overhead**: Graceful degradation if updates fail

## Troubleshooting

### Updates not appearing on GitHub

Check:

1. Is `gh` CLI installed and authenticated on the agent?
2. Does the issue exist? (`gh issue view 129`)
3. Check agent logs for "Failed to post comment" warnings

### /autotask not detecting issue number

Check:

1. Environment variable: `echo $SWARM_ISSUE_NUMBER`
2. Command format: `/autotask 129` (number only)
3. Agent-listener logs for env var setup

### Agent showing as busy but no progress

Check:

1. SSH tunnel to agent: `curl http://localhost:3847/status`
2. Agent logs: SSH to VM and check running processes
3. Task timeout: Default is 30 minutes (MAX_TASK_TIMEOUT)

## Next Steps

To use this integration:

1. **Create GitHub issues** for tasks you want distributed
2. **Create manifest** referencing those issue numbers
3. **Run orchestrator**:
   `pnpm exec tsx scripts/swarm/orchestrator.ts .swarm/manifest.yaml`
4. **Monitor progress** on GitHub issues in real-time
5. **Review PRs** when agents complete tasks

The integration is fully automatic - agents will post updates as they work!
