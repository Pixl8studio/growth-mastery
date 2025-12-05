# Swarm Work Manifest Specification

Work manifests define batches of development tasks for distributed execution. Each task
becomes an autonomous /autotask execution, producing its own branch and PR.

## File Format

YAML file, typically named `work.yaml` or `sprint-N.yaml`.

## Complete Schema

```yaml
# Required: Human-readable name for this batch
name: "Sprint 47 - Authentication Overhaul"

# Optional: Repository URL (defaults to current repo)
repo: git@github.com:org/repo.git

# Required: Base branch to create feature branches from
base_branch: main

# Optional: Default priority for tasks without explicit priority
default_priority: medium

# Optional: Maximum parallel tasks (defaults to number of available agents)
max_parallel: 4

# Required: List of tasks to execute
tasks:
  - id: unique-task-identifier        # Required: Unique within manifest
    prompt: |                          # Required: What to accomplish
      Detailed description of the task.
      Can be multi-line.
      Should be specific enough for /autotask.
    branch: feature/branch-name        # Required: Must be unique
    priority: high                     # Optional: high, medium, low
    depends_on: [other-task-id]        # Optional: List of task IDs to wait for
    agent_hint: backend                # Optional: Prefer agents tagged with this
    timeout: 30m                       # Optional: Max execution time
    
  - id: another-task
    prompt: "Simple single-line prompt"
    branch: feature/another
```

## Field Reference

### Top-Level Fields

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `name` | Yes | - | Human-readable batch name, appears in reports |
| `repo` | No | Current repo | Git repository URL |
| `base_branch` | Yes | - | Branch to create features from |
| `default_priority` | No | `medium` | Default for tasks without priority |
| `max_parallel` | No | Agent count | Limit concurrent tasks |
| `tasks` | Yes | - | List of task definitions |

### Task Fields

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `id` | Yes | - | Unique identifier, used in depends_on |
| `prompt` | Yes | - | Task description for /autotask |
| `branch` | Yes | - | Git branch name, must be unique |
| `priority` | No | `default_priority` | Execution priority when queuing |
| `depends_on` | No | `[]` | Task IDs that must complete first |
| `agent_hint` | No | - | Prefer agents with matching tag |
| `timeout` | No | `60m` | Maximum execution time |

## Examples

### Simple Parallel Tasks

Three independent features, maximum parallelism:

```yaml
name: "Feature Batch"
base_branch: main

tasks:
  - id: dark-mode
    prompt: "Add dark mode toggle to settings page"
    branch: feature/dark-mode
    
  - id: notifications
    prompt: "Implement push notification preferences"
    branch: feature/notifications
    
  - id: export
    prompt: "Add CSV export for user data"
    branch: feature/csv-export
```

### Sequential Dependencies

Feature C depends on A and B completing first:

```yaml
name: "Auth Refactor"
base_branch: main

tasks:
  - id: auth-types
    prompt: "Define TypeScript types for new auth system"
    branch: feature/auth-types
    priority: high
    
  - id: auth-api
    prompt: "Implement auth API endpoints using new types"
    branch: feature/auth-api
    priority: high
    
  - id: auth-ui
    prompt: "Build auth UI components"
    branch: feature/auth-ui
    depends_on: [auth-types, auth-api]
```

### Mixed Parallel and Sequential

Complex dependency graph:

```yaml
name: "Sprint 47"
base_branch: development

tasks:
  # These three run in parallel
  - id: database-schema
    prompt: "Add user preferences table with migrations"
    branch: feature/prefs-schema
    priority: high
    
  - id: api-tests
    prompt: "Add integration tests for existing API"
    branch: feature/api-tests
    
  - id: ui-cleanup
    prompt: "Refactor settings page components"
    branch: refactor/settings-ui
    
  # This waits for schema
  - id: preferences-api
    prompt: "Implement preferences CRUD endpoints"
    branch: feature/prefs-api
    depends_on: [database-schema]
    
  # This waits for both api and ui work
  - id: preferences-ui
    prompt: "Build preferences UI with new endpoints"
    branch: feature/prefs-ui
    depends_on: [preferences-api, ui-cleanup]
```

### Bug Fix Batch

Multiple bug fixes from issue tracker:

```yaml
name: "Bug Fix Friday"
base_branch: main
default_priority: high

tasks:
  - id: fix-234
    prompt: |
      Fix issue #234: Users logged out randomly.
      Investigate session refresh logic.
      Add regression test.
    branch: fix/session-refresh-234
    
  - id: fix-256
    prompt: |
      Fix issue #256: Search returns stale results.
      Check cache invalidation.
    branch: fix/search-cache-256
    
  - id: fix-267
    prompt: |
      Fix issue #267: Mobile menu doesn't close.
      Check event handlers on overlay.
    branch: fix/mobile-menu-267
```

## Validation Rules

The orchestrator validates manifests before execution:

1. **Required fields present**: `name`, `base_branch`, `tasks`, and per-task `id`,
   `prompt`, `branch`
2. **Unique IDs**: No duplicate task IDs within manifest
3. **Unique branches**: No duplicate branch names
4. **Valid dependencies**: All `depends_on` references exist as task IDs
5. **No circular dependencies**: Dependency graph must be acyclic
6. **Valid YAML syntax**: Parseable YAML

Validation errors are reported before any execution begins.

## Writing Good Prompts

Task prompts are passed directly to /autotask. Write them as you would for autonomous
execution:

**Good prompt:**
```yaml
prompt: |
  Implement rate limiting for API endpoints.
  - Use Redis for tracking request counts
  - 100 requests per minute per authenticated user
  - 20 requests per minute for anonymous users
  - Return 429 with Retry-After header when exceeded
  - Add tests for rate limit behavior
```

**Too vague:**
```yaml
prompt: "Add rate limiting"
```

**Too prescriptive:**
```yaml
prompt: |
  Step 1: Open src/middleware/rateLimit.ts
  Step 2: Import redis from lib/redis
  Step 3: Create a function called checkRateLimit...
```

Let /autotask figure out implementation details. Describe the goal and constraints.

## Best Practices

**Right-size tasks**: Each task should be a single feature, single PR. If you're writing
"and also" in a prompt, split it into two tasks.

**Use descriptive IDs**: `oauth-token-refresh` is better than `task-1`. IDs appear in
logs, reports, and dependency declarations.

**Minimize dependencies**: More independent tasks = more parallelism. Only add
depends_on when there's a genuine dependency.

**Set realistic timeouts**: Default 60m is generous. Adjust if you know a task is quick
or complex.

**Test locally first**: Run `/swarm manifest.yaml --local` to validate before
distributed execution.

## State Files

During execution, the orchestrator creates:

- `.swarm/state.json` - Execution state for resume
- `.swarm/reports/YYYY-MM-DD-manifest-name.md` - Completion report

These are gitignored by default.
