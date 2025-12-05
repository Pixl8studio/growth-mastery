---
description: Execute multiple development tasks in parallel across distributed agents
argument-hint: <work-manifest.yaml>
---

# /swarm - Distributed Task Execution

<objective>
Execute a batch of development tasks across multiple agents, each producing independent
PRs, with intelligent dependency handling and consolidated reporting.
</objective>

<user-provides>
Work manifest (YAML file) defining tasks, branches, and dependencies
</user-provides>

<command-delivers>
Multiple pull requests ready for review, progress dashboard, consolidated summary
</command-delivers>

## Usage

```
/swarm work.yaml
/swarm sprint-47.yaml --local  # Run sequentially on local machine
```

## Work Manifest Format

Read @context/swarm-work-manifest.md for complete specification.

```yaml
name: "Sprint 47 - Auth Overhaul"
repo: git@github.com:org/repo.git
base_branch: main

tasks:
  - id: oauth-refresh
    prompt: "Implement OAuth2 token refresh flow"
    branch: feature/oauth-refresh
    priority: high
    
  - id: session-cleanup
    prompt: "Fix session memory leak from issue #234"
    branch: fix/session-leak-234
    depends_on: [oauth-refresh]  # Sequential when needed
```

## Execution Flow

<manifest-parsing>
Load and validate work manifest. Build dependency graph from `depends_on` fields.
Identify parallelizable tasks (no dependencies or dependencies satisfied) vs sequential
chains. Verify all branch names are unique and don't conflict with existing branches.

Validation failures: Missing required fields, circular dependencies, duplicate branch
names, invalid YAML syntax. Report all errors before execution begins.
</manifest-parsing>

<agent-discovery>
Query available execution targets. For remote agents, each reports status (idle/busy),
current task if any, and health metrics. For local-only mode (--local flag or no remote
agents configured), tasks run sequentially using /autotask.

Agent configuration lives in `~/.swarm/agents.yaml` or project's `.swarm/agents.yaml`:

```yaml
agents:
  - name: oracle-arm-1
    host: agent1.example.com
    status_endpoint: /status
    execute_endpoint: /execute
```

If no agents configured, default to local sequential execution.
</agent-discovery>

<task-distribution>
For each task ready to execute (no pending dependencies):

1. Find available agent (idle status, healthy)
2. Claim task for that agent (update manifest state)
3. Send task to agent with: prompt, branch name, base branch, repo URL
4. Agent executes /autotask internally with the prompt
5. Monitor progress via polling or WebSocket

Parallel execution: Multiple tasks without dependencies run simultaneously on different
agents. Sequential execution: Tasks with `depends_on` wait for dependencies to complete
successfully before starting.
</task-distribution>

<progress-monitoring>
Track all active tasks. Display real-time status:

- Task state: queued → claimed → in-progress → pr-ready → failed
- Agent assignment and utilization
- Estimated completion based on task complexity
- Branch and PR URLs as they become available

Use Multi-Agent Dashboard if available (`npx multi-agent-dashboard-connect@latest`).
Fall back to CLI progress output with periodic updates.

Progress state persisted to `.swarm/state.json` for recovery from interruptions.
</progress-monitoring>

<failure-handling>
Task failure does not block unrelated tasks. Only tasks with direct dependency on the
failed task are blocked.

On failure:
- Log error context and stack trace
- Mark task as failed in state
- Notify blocked dependent tasks
- Continue other independent tasks
- Report failure in final summary

Recovery options: Retry failed task (`/swarm --retry task-id`), skip and continue
(`/swarm --skip task-id`), or abort remaining (`/swarm --abort`).
</failure-handling>

<completion-reporting>
On all tasks complete (success or failure), generate consolidated report:

Summary:
- Total tasks: N completed, M failed, K skipped
- Execution time: actual vs estimated sequential time
- Parallel speedup factor

Per-task details:
- PR URL and status
- Execution time
- Agent that processed it
- Any issues encountered

Suggested merge order based on dependency graph (merge dependencies first).

Report saved to `.swarm/reports/YYYY-MM-DD-HH-MM-manifest-name.md`.
</completion-reporting>

## Local Mode

When running with `--local` flag or no remote agents available:

```
/swarm work.yaml --local
```

Tasks execute sequentially using /autotask. Same manifest format, same branch/PR
creation, same reporting. Useful for testing manifests before distributed execution or
when remote infrastructure is unavailable.

## Agent Setup

Remote agents are Claude Code instances running in headless mode on cloud VMs. Setup
script: `scripts/setup-remote-agent.sh`.

Recommended free compute: Oracle Cloud Always Free tier provides 4 ARM VMs with 24GB
total RAM at no cost.

Each agent needs:
- Node.js and Claude Code CLI installed
- Claude authentication configured
- Agent listener running (receives tasks via HTTP)
- Access to git repositories (SSH key or token)

## State Management

Git is the source of truth. Agent state is ephemeral. If an agent restarts mid-task:
- Work-in-progress exists as uncommitted changes in worktree
- Orchestrator detects agent restart, reassigns task
- New agent clones fresh, task restarts from beginning

Manifest state tracked in `.swarm/state.json`:
- Which tasks are complete (have PRs)
- Which tasks are in progress (claimed by agent)
- Which tasks are queued

Resume interrupted swarm: `/swarm work.yaml --resume`

## Key Principles

- Git is truth: Branches and PRs are the durable state, not databases
- Agents are stateless: Can restart without losing work
- Graceful degradation: Falls back to local when remote unavailable
- Dependency awareness: Respects task ordering when specified
- Parallel by default: Independent tasks run simultaneously
- Single PR per task: Clean separation, easy review

## Requirements

- GitHub CLI (`gh`) installed and authenticated
- Work manifest file (YAML)
- For remote execution: configured agents in `~/.swarm/agents.yaml`
- For local execution: just Claude Code

## See Also

- @context/swarm-work-manifest.md - Complete manifest specification
- @plugins/swarm/agents/swarm-coordinator.md - Orchestration agent
- @.claude/skills/swarm-orchestration/SKILL.md - Distributed execution patterns
- @scripts/setup-remote-agent.sh - Agent VM setup
