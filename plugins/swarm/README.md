# Swarm Plugin

Distributed task execution across multiple Claude Code agents. Run batches of
development tasks in parallel on remote compute, each producing independent PRs.

## Quick Setup (Per-Project Config)

Each project can have its own swarm agents configured via `.env.local`:

```bash
# Copy the template to your project
cp ~/.ai_coding_config/templates/swarm/.env.local.example .env.local

# Edit with your agent IPs
nano .env.local
```

```bash
# .env.local
CLAUDE_SWARM_1_IP=170.9.226.213
CLAUDE_SWARM_2_IP=170.9.237.208
CLAUDE_SWARM_3_IP=
CLAUDE_SWARM_4_IP=
```

That's it! The swarm commands will automatically read from `.env.local`.

## What This Plugin Provides

- **`/swarm` command** - Execute work manifests across distributed agents
- **`/swarm-issues` command** - Build manifest from GitHub issues and execute
- **Swarm Coordinator agent** - Orchestrates parallel task execution
- **Work manifest format** - YAML specification for batch tasks
- **GitHub issue templates** - Structured templates for swarm-ready tasks
- **Agent setup scripts** - Configure remote VMs as swarm agents

## Quick Start

### Option 1: From GitHub Issues (Recommended!)

```bash
# Install the plugin
/plugin install swarm

# Tag issues in GitHub with 'swarm-ready' label
# Then run:
/swarm-issues --execute

# Or preview first:
/swarm-issues --dry-run
```

### Option 2: From YAML Manifest

```bash
# Install the plugin
/plugin install swarm

# Create a work manifest
cat > work.yaml << 'EOF'
name: "Sprint 47"
base_branch: main

tasks:
  - id: feature-a
    prompt: "Implement user authentication with OAuth2"
    branch: feature/oauth
    
  - id: feature-b
    prompt: "Add rate limiting to API endpoints"
    branch: feature/rate-limiting
    
  - id: feature-c
    prompt: "Improve error handling in auth flow"
    branch: feature/auth-errors
    depends_on: [feature-a]
EOF

# Execute the swarm
/swarm work.yaml
```

## Work Manifest Format

```yaml
name: "Descriptive name for this batch"
repo: git@github.com:org/repo.git  # Optional, defaults to current
base_branch: main                   # Branch to create features from

tasks:
  - id: unique-task-id              # Required, used for dependencies
    prompt: |                       # What to accomplish
      Multi-line prompt describing
      the task in detail
    branch: feature/branch-name     # Required, must be unique
    priority: high                  # Optional: high, medium, low
    depends_on: [other-task-id]     # Optional: wait for these first
```

## Execution Modes

### Distributed (Default)

Tasks run in parallel across configured remote agents:

```bash
/swarm work.yaml
```

Requires agents configured in `~/.swarm/agents.yaml`.

### Local Sequential

Tasks run one-at-a-time on your machine:

```bash
/swarm work.yaml --local
```

Useful for testing manifests or when remote agents unavailable.

## Agent Configuration

### Option 1: Environment Variables (Recommended for Multi-Project)

Configure agents per-project using `.env.local`:

```bash
# .env.local in your project root
CLAUDE_SWARM_1_IP=170.9.226.213
CLAUDE_SWARM_2_IP=170.9.237.208
CLAUDE_SWARM_3_IP=192.168.1.100
CLAUDE_SWARM_4_IP=192.168.1.101
CLAUDE_SWARM_PORT=3847  # Optional, default 3847

# Optional: Custom names
CLAUDE_SWARM_1_NAME=oracle-prod-1
CLAUDE_SWARM_2_NAME=oracle-prod-2
```

**Benefits:**
- Each project can have different agents
- Easily switch between dev/prod swarms
- No need to manage `~/.swarm/agents.yaml`
- Works with existing `.env.local` patterns

**Helper commands:**
```bash
# List configured agents
~/.ai_coding_config/scripts/swarm-env-loader.sh --list

# Generate agents.yaml from .env.local
~/.ai_coding_config/scripts/swarm-env-loader.sh --generate

# Output as JSON (for scripts)
~/.ai_coding_config/scripts/swarm-env-loader.sh --json
```

### Option 2: Global Config (~/.swarm/agents.yaml)

For a single set of agents across all projects:

```yaml
# ~/.swarm/agents.yaml
agents:
  - name: oracle-arm-1
    host: 170.9.226.213
    port: 3847
```

### Config Priority

The swarm looks for agents in this order:
1. `.env.local` in current directory
2. `.env.local` in git root
3. `~/.swarm/agents.yaml`
4. Falls back to `--local` mode (sequential on your machine)

## Setting Up Remote Agents

### Recommended: Oracle Cloud Free Tier

Oracle provides 4 ARM VMs with 24GB total RAM for free, forever:

1. Create Oracle Cloud account
2. Provision Ampere A1 instances (4 x 1 OCPU, 6GB each)
3. Run setup script on each VM:

```bash
curl -fsSL https://raw.githubusercontent.com/TechNickAI/ai-coding-config/main/scripts/setup-remote-agent.sh | bash
```

4. Configure agents in `~/.swarm/agents.yaml`:

```yaml
agents:
  - name: oracle-arm-1
    host: <vm-public-ip>
    port: 3847
  - name: oracle-arm-2
    host: <vm-public-ip>
    port: 3847
```

### Other Free Options

- **Google Cloud** - 1 e2-micro VM (always free)
- **GitHub Codespaces** - 60 hours/month free
- **Gitpod** - 50 hours/month free

## Monitoring Progress

### CLI Output

Real-time progress in terminal:

```
🚀 Swarm: Sprint 47 (6 tasks)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ feature-a → PR #142
🔄 feature-b → 67% (agent-2)
⏳ feature-c → queued
```

### Multi-Agent Dashboard

For rich UI monitoring:

```bash
npx multi-agent-dashboard-connect@latest
```

## Handling Failures

Task failures are isolated. Independent tasks continue.

```bash
# Retry a failed task
/swarm work.yaml --retry feature-b

# Skip a failed task (unblocks dependents)
/swarm work.yaml --skip feature-b

# Resume after interruption
/swarm work.yaml --resume
```

## Traceability & Attribution

Every unit of work is fully traceable back to the agent that executed it.

### Execution IDs

Each swarm execution gets a unique ID that flows through the entire system:

```
2024-12-04-sprint47-a3f2
```

### Git Commit Trailers

All commits include machine-readable trailers:

```
feat: implement rate limiting

Swarm-Execution-ID: 2024-12-04-sprint47-a3f2
Swarm-Task-ID: rate-limiting
Swarm-Agent: oracle-arm-1
```

Query history by agent:

```bash
# Find all commits from specific agent
git log --grep="Swarm-Agent: oracle-arm-1"

# Find all commits from specific execution
git log --grep="Swarm-Execution-ID: 2024-12-04-sprint47"
```

### State Tracking

Full execution traces in `.swarm/state.json`:

```json
{
  "execution_id": "2024-12-04-sprint47-a3f2",
  "tasks": {
    "rate-limiting": {
      "execution_trace": {
        "agent_id": "oracle-arm-1",
        "started_at": "2024-12-04T10:30:15Z",
        "completed_at": "2024-12-04T10:42:30Z",
        "pr_number": 143,
        "commit_sha": "abc123"
      }
    }
  }
}
```

### PR Attribution

PRs include labels for filtering:
- `swarm-task` - Identifies swarm-created PRs
- `agent:oracle-arm-1` - Which agent created it

See [docs/git-trailers.md](docs/git-trailers.md) and [docs/state-schema.md](docs/state-schema.md) for full details.

## GitHub Issues Workflow

The easiest way to use swarm is through GitHub Issues:

### 1. Add Issue Templates

Copy templates from `templates/github-issues/` to your repo's `.github/ISSUE_TEMPLATE/`:

- `swarm-task.md` - General feature tasks
- `bug-fix-swarm.md` - Bug fixes

### 2. Create Issues Normally

Write issues as instructions for an autonomous developer:

```markdown
## Description
Add rate limiting to all API endpoints to prevent abuse.

## Acceptance Criteria
- [ ] 100 requests/minute per authenticated user
- [ ] 20 requests/minute for anonymous users
- [ ] Return 429 with Retry-After header
- [ ] Tests cover rate limit behavior

## Technical Context
Use Redis for tracking. Follow existing middleware pattern in src/middleware/auth.ts
```

### 3. Tag When Ready

Add the `swarm-ready` label when an issue is clear enough for AI execution.

### 4. Execute

```bash
/swarm-issues --execute
```

### 5. Review PRs

Each issue gets a PR. The PR description includes "Closes #123" to auto-link.

### Labels for Control

| Label | Effect |
|-------|--------|
| `swarm-ready` | Will be processed |
| `priority:high` | Runs first |
| `priority:low` | Runs last |
| `blocked` | Skipped |

## Best Practices

**Right-size tasks**: Each task should be /autotask-sized - a single feature, single PR.
Don't cram multiple features into one task.

**Minimize dependencies**: More independent tasks = more parallelism. Only add
`depends_on` when there's a real dependency.

**Use descriptive IDs**: Task IDs appear in logs and reports. `oauth-refresh` is better
than `task-1`.

**Test locally first**: Run `--local` to validate manifest before distributed execution.

**Write good issue descriptions**: The issue body becomes the AI's instructions. Be
specific about acceptance criteria and technical constraints.

## Files Created

- `.swarm/state.json` - Execution state with full traceability
- `.swarm/agents.yaml` - Agent configuration (project-level)
- `.swarm/reports/` - Execution reports
- `.swarm/history/` - Historical state files for past executions

## Requirements

- GitHub CLI (`gh`) authenticated
- For distributed: configured remote agents
- For local: just Claude Code

## See Also

- [State Schema](docs/state-schema.md) - Full `.swarm/state.json` specification
- [Git Trailers](docs/git-trailers.md) - Commit trailer conventions for traceability
- [Swarm Work Manifest Spec](../../context/swarm-work-manifest.md)
- [Setup Remote Agent Script](../../scripts/setup-remote-agent.sh)
- [Optimal Development Workflow](../../context/optimal-development-workflow.md)
