# Swarm State Schema

The `.swarm/state.json` file tracks execution state for resumability and full
traceability. This document defines the schema.

## Top-Level Structure

```json
{
  "execution_id": "2024-12-04-sprint47-a3f2",
  "manifest_name": "Sprint 47",
  "manifest_path": "./work.yaml",
  "repo": "git@github.com:org/repo.git",
  "base_branch": "main",
  "started_at": "2024-12-04T10:30:00Z",
  "completed_at": "2024-12-04T11:15:00Z",
  "status": "completed",
  "tasks": { ... },
  "agents": { ... },
  "summary": { ... }
}
```

## Field Definitions

### Execution Metadata

| Field | Type | Description |
|-------|------|-------------|
| `execution_id` | string | Unique ID: `{YYYY-MM-DD}-{manifest-name}-{4-char-hash}` |
| `manifest_name` | string | Human-readable name from manifest |
| `manifest_path` | string | Path to the source manifest file |
| `repo` | string | Git repository URL |
| `base_branch` | string | Branch tasks are created from |
| `started_at` | ISO8601 | When execution began |
| `completed_at` | ISO8601 | When execution finished (null if in progress) |
| `status` | enum | `running`, `completed`, `failed`, `paused` |

### Tasks Object

Each task is keyed by its `task_id`:

```json
{
  "tasks": {
    "feature-a": {
      "id": "feature-a",
      "prompt": "Implement OAuth2 authentication...",
      "branch": "feature/oauth",
      "priority": "high",
      "depends_on": [],
      "status": "completed",
      "execution_trace": {
        "agent_id": "oracle-arm-1",
        "agent_host": "192.168.1.10",
        "agent_port": 3847,
        "assigned_at": "2024-12-04T10:30:10Z",
        "started_at": "2024-12-04T10:30:15Z",
        "completed_at": "2024-12-04T10:42:30Z",
        "duration_seconds": 735,
        "commit_sha": "abc123def456",
        "pr_number": 142,
        "pr_url": "https://github.com/org/repo/pull/142",
        "exit_code": 0,
        "retry_count": 0
      },
      "error": null
    }
  }
}
```

#### Task Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique task identifier |
| `prompt` | string | Full prompt sent to agent |
| `branch` | string | Git branch for this task |
| `priority` | enum | `high`, `medium`, `low` |
| `depends_on` | array | Task IDs that must complete first |
| `status` | enum | `pending`, `queued`, `assigned`, `running`, `completed`, `failed`, `blocked`, `skipped` |
| `execution_trace` | object | Detailed execution metadata (see below) |
| `error` | object | Error details if failed (null otherwise) |

#### Execution Trace Fields

| Field | Type | Description |
|-------|------|-------------|
| `agent_id` | string | Name/ID of the agent that executed |
| `agent_host` | string | IP or hostname of the agent |
| `agent_port` | number | Port the agent was reached on |
| `assigned_at` | ISO8601 | When task was assigned to agent |
| `started_at` | ISO8601 | When agent began execution |
| `completed_at` | ISO8601 | When agent finished |
| `duration_seconds` | number | Total execution time |
| `commit_sha` | string | Git commit SHA produced |
| `pr_number` | number | GitHub PR number |
| `pr_url` | string | Full URL to the PR |
| `exit_code` | number | Agent's exit code (0 = success) |
| `retry_count` | number | How many times this was retried |

#### Error Object (when failed)

```json
{
  "error": {
    "type": "execution_failed",
    "message": "Agent reported non-zero exit code",
    "agent_logs": "...",
    "timestamp": "2024-12-04T10:45:00Z",
    "recoverable": true
  }
}
```

### Agents Object

Tracks agent state during execution:

```json
{
  "agents": {
    "oracle-arm-1": {
      "id": "oracle-arm-1",
      "host": "192.168.1.10",
      "port": 3847,
      "status": "idle",
      "current_task": null,
      "tasks_completed": ["feature-a", "feature-c"],
      "total_execution_time": 1420,
      "last_heartbeat": "2024-12-04T11:14:30Z"
    }
  }
}
```

#### Agent Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Agent identifier |
| `host` | string | IP or hostname |
| `port` | number | Port number |
| `status` | enum | `idle`, `busy`, `offline`, `failed` |
| `current_task` | string | Task ID currently executing (null if idle) |
| `tasks_completed` | array | List of task IDs this agent completed |
| `total_execution_time` | number | Cumulative seconds spent executing |
| `last_heartbeat` | ISO8601 | Last successful health check |

### Summary Object

Generated at completion:

```json
{
  "summary": {
    "total_tasks": 6,
    "completed": 5,
    "failed": 1,
    "skipped": 0,
    "blocked": 0,
    "total_duration_seconds": 2700,
    "parallel_speedup": 3.2,
    "agents_used": ["oracle-arm-1", "oracle-arm-2", "oracle-arm-3"],
    "prs_created": [
      { "task_id": "feature-a", "pr_number": 142, "pr_url": "..." },
      { "task_id": "feature-b", "pr_number": 143, "pr_url": "..." }
    ],
    "suggested_merge_order": ["feature-a", "feature-c", "feature-b", "feature-d"]
  }
}
```

## Status Transitions

```
pending → queued → assigned → running → completed
                                     ↘ failed
                                     
pending → blocked (dependency failed)
pending → skipped (user requested)
```

## Querying Execution History

### Find which agent ran a task

```bash
jq '.tasks["feature-a"].execution_trace.agent_id' .swarm/state.json
```

### List all tasks run by an agent

```bash
jq '.agents["oracle-arm-1"].tasks_completed' .swarm/state.json
```

### Get execution timeline

```bash
jq '[.tasks[] | {id, started: .execution_trace.started_at, agent: .execution_trace.agent_id}] | sort_by(.started)' .swarm/state.json
```

### Calculate agent utilization

```bash
jq '.agents | to_entries | map({agent: .key, tasks: (.value.tasks_completed | length), time: .value.total_execution_time})' .swarm/state.json
```

## Retention

State files are preserved in `.swarm/history/` after execution completes:

```
.swarm/
├── state.json              # Current/latest execution
└── history/
    ├── 2024-12-04-sprint47-a3f2.json
    ├── 2024-12-03-bugfixes-b1c2.json
    └── 2024-12-01-sprint46-d3e4.json
```

This enables historical analysis and debugging of past executions.
