#!/bin/bash
#
# GitHub Issue Update Helper for /autotask
#
# This script posts progress updates to GitHub issues during autonomous task execution.
# It's called by /autotask at various checkpoints to keep the issue updated.
#
# Usage:
#   ./github-issue-update.sh <issue-number> <stage> <status> <message>
#
# Example:
#   ./github-issue-update.sh 123 "Task Start" "In Progress" "Setting up worktree and environment"

set -e

ISSUE_NUMBER="$1"
STAGE="$2"
STATUS="$3"
MESSAGE="$4"

# Optional: Get agent name from environment (set by swarm agent-listener)
AGENT_NAME="${SWARM_AGENT_NAME:-local}"
BRANCH="${SWARM_BRANCH:-unknown}"

# Validate inputs
if [[ -z "$ISSUE_NUMBER" || -z "$STAGE" || -z "$STATUS" || -z "$MESSAGE" ]]; then
    echo "Usage: $0 <issue-number> <stage> <status> <message>"
    exit 1
fi

# Check if gh is available
if ! command -v gh &> /dev/null; then
    echo "Warning: GitHub CLI (gh) not found, skipping issue update"
    exit 0
fi

# Check if issue exists (fail silently if not)
if ! gh issue view "$ISSUE_NUMBER" &> /dev/null; then
    echo "Warning: Issue #$ISSUE_NUMBER not found, skipping update"
    exit 0
fi

# Build the comment body
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
COMMENT="🤖 **Autonomous Task Update** - ${STAGE}

**Status:** ${STATUS}
**Branch:** \`${BRANCH}\`

${MESSAGE}

---
*Updated: ${TIMESTAMP} | Agent: ${AGENT_NAME}*"

# Post comment to issue
gh issue comment "$ISSUE_NUMBER" --body "$COMMENT" 2>&1 || {
    echo "Warning: Failed to post comment to issue #$ISSUE_NUMBER"
    exit 0
}

echo "✓ Posted update to issue #$ISSUE_NUMBER: $STAGE"
