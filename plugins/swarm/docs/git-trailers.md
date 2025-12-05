# Git Trailer Conventions for Swarm

All commits created by swarm task execution include standardized trailers for
traceability. This enables querying git history to understand which agent did what.

## Required Trailers

Every commit from a swarm task MUST include:

```
Swarm-Execution-ID: 2024-12-04-sprint47-a3f2
Swarm-Task-ID: feature-a
Swarm-Agent: oracle-arm-1
```

## Trailer Definitions

| Trailer | Format | Description |
|---------|--------|-------------|
| `Swarm-Execution-ID` | `{date}-{manifest}-{hash}` | Unique swarm execution identifier |
| `Swarm-Task-ID` | string | Task ID from manifest |
| `Swarm-Agent` | string | Agent ID that executed the task |

## Optional Trailers

These may be included for additional context:

| Trailer | Format | Description |
|---------|--------|-------------|
| `Swarm-Manifest` | string | Name of the manifest file |
| `Swarm-Duration` | `{N}s` | Execution duration in seconds |
| `Swarm-Retry` | number | Retry attempt (0 = first try) |

## Example Commit

```
feat: implement OAuth2 refresh token handling

Adds automatic token refresh when access tokens expire. The refresh flow
checks token expiry 5 minutes before actual expiration to avoid race
conditions during API calls.

- Add TokenRefreshMiddleware
- Update AuthService with refresh logic  
- Add tests for token expiry edge cases

Closes #45

Swarm-Execution-ID: 2024-12-04-sprint47-a3f2
Swarm-Task-ID: oauth-refresh
Swarm-Agent: oracle-arm-1
Swarm-Duration: 423s
```

## Querying Git History

### Find all swarm commits

```bash
git log --grep="Swarm-Execution-ID:"
```

### Find commits from specific agent

```bash
git log --grep="Swarm-Agent: oracle-arm-1"
```

### Find commits from specific execution

```bash
git log --grep="Swarm-Execution-ID: 2024-12-04-sprint47"
```

### Find commits for specific task

```bash
git log --grep="Swarm-Task-ID: oauth-refresh"
```

### Count commits per agent

```bash
git log --grep="Swarm-Agent:" --oneline | \
  grep -oP "Swarm-Agent: \K[^\s]+" | \
  sort | uniq -c | sort -rn
```

### List all executions

```bash
git log --grep="Swarm-Execution-ID:" --format="%s %b" | \
  grep -oP "Swarm-Execution-ID: \K[^\s]+" | \
  sort -u
```

### Get agent attribution for a commit

```bash
git log -1 --format="%B" <commit-sha> | grep "Swarm-"
```

## Programmatic Access

### Parse trailers from commit

```bash
git log -1 --format="%(trailers:key=Swarm-Agent,valueonly)" <sha>
```

### Get all trailers as key-value

```bash
git log -1 --format="%(trailers)" <sha>
```

### In scripts (bash)

```bash
get_swarm_agent() {
  git log -1 --format="%B" "$1" | grep "^Swarm-Agent:" | cut -d: -f2 | tr -d ' '
}

get_swarm_execution() {
  git log -1 --format="%B" "$1" | grep "^Swarm-Execution-ID:" | cut -d: -f2 | tr -d ' '
}
```

## GitHub Search

On GitHub, you can search commit messages:

```
repo:org/repo "Swarm-Agent: oracle-arm-1"
```

## Integration with CI/CD

### Verify swarm commits have required trailers

```bash
#!/bin/bash
# verify-swarm-trailers.sh

COMMIT_MSG=$(git log -1 --format="%B")

if echo "$COMMIT_MSG" | grep -q "Swarm-Task-ID:"; then
  # This is a swarm commit, verify all required trailers
  for trailer in "Swarm-Execution-ID" "Swarm-Task-ID" "Swarm-Agent"; do
    if ! echo "$COMMIT_MSG" | grep -q "^$trailer:"; then
      echo "ERROR: Swarm commit missing required trailer: $trailer"
      exit 1
    fi
  done
  echo "✅ All swarm trailers present"
fi
```

### Extract attribution in GitHub Actions

```yaml
- name: Get swarm attribution
  if: contains(github.event.head_commit.message, 'Swarm-')
  run: |
    echo "SWARM_AGENT=$(echo '${{ github.event.head_commit.message }}' | grep -oP 'Swarm-Agent: \K\S+')" >> $GITHUB_ENV
    echo "SWARM_TASK=$(echo '${{ github.event.head_commit.message }}' | grep -oP 'Swarm-Task-ID: \K\S+')" >> $GITHUB_ENV
```

## Why Trailers?

Git trailers are the standard way to add machine-readable metadata to commits:

1. **Native git support** - `git interpret-trailers`, `%(trailers)` format
2. **Preserved in rebases** - Unlike commit notes
3. **Visible in logs** - Part of the commit message
4. **Searchable** - Works with `git log --grep`
5. **Convention** - Used by Linux kernel, Signed-off-by, Co-authored-by, etc.

## Enforcement

The swarm coordinator ensures all commits include required trailers by:

1. Passing trailer requirements to agents in task payload
2. Validating commits before marking tasks complete
3. Failing tasks that don't include proper attribution

This makes the git history a reliable source of truth for "who did what."
