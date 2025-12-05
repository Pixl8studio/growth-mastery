---
description:
  Execute complete development task autonomously from description to PR-ready state
---

# /autotask - Autonomous Task Execution

<objective>
Execute a complete development task autonomously from description to PR-ready state.
</objective>

<user-provides>
Task description
</user-provides>

<command-delivers>
Pull request ready for review, with all implementation, validation, and bot feedback addressed.
</command-delivers>

## Usage

```
/autotask "task description"
/autotask 123  # GitHub issue number
```

## Execution Flow

Read @rules/git-worktree-task.mdc for comprehensive autonomous workflow guidance.

<github-issue-integration>
**IMPORTANT**: When executing within a swarm context or when a GitHub issue number is provided, maintain continuous communication with the GitHub issue throughout execution.

Issue Number Detection:

- If first argument is a number, treat it as GitHub issue number
- If task description contains "Issue #XXX" or "Original issue: #XXX", extract issue
  number
- Environment variable SWARM_ISSUE_NUMBER is set by swarm agent-listener

Helper Script: Use `.claude/helpers/github-issue-update.sh` for all GitHub updates:

```bash
.claude/helpers/github-issue-update.sh <issue-number> <stage> <status> <message>
```

The helper automatically includes agent name, branch, and timestamp. It fails gracefully
if gh CLI is unavailable or issue doesn't exist.

Progress Checkpoints:

1. **Task Start** (after task preparation): Post comment with execution plan
2. **Implementation Progress** (after worktree setup): Post what's being implemented
3. **Validation Status** (after local validation): Post test/lint results
4. **PR Created** (after PR creation): Post link to PR
5. **Completion** (after bot feedback): Post final status

Example Usage:

```bash
ISSUE_NUM="${SWARM_ISSUE_NUMBER:-129}"

# Checkpoint 1: Task Start
.claude/helpers/github-issue-update.sh "$ISSUE_NUM" "Task Start" "In Progress" \
  "Setting up worktree and loading project standards. Expected completion: ~15-20 minutes."

# Checkpoint 2: Implementation
.claude/helpers/github-issue-update.sh "$ISSUE_NUM" "Implementation" "In Progress" \
  "Environment ready. Implementing feature X following project patterns."

# Checkpoint 3: Validation
.claude/helpers/github-issue-update.sh "$ISSUE_NUM" "Validation" "Completed" \
  "✓ All tests passing (24/24)
✓ Linting clean
✓ Code review addressed"

# Checkpoint 4: PR Created
.claude/helpers/github-issue-update.sh "$ISSUE_NUM" "PR Created" "Ready for Review" \
  "Pull request created: https://github.com/org/repo/pull/456
All checks passing, ready for human review."

# Checkpoint 5: Completion
.claude/helpers/github-issue-update.sh "$ISSUE_NUM" "Task Complete" "Completed" \
  "✅ Task completed successfully
📝 PR: #456
🔍 All bot feedback addressed
⏭️ Ready to merge after approval"
```

The helper gracefully handles errors and never blocks execution.
</github-issue-integration>

<task-preparation>
Ensure task clarity before implementation. If the task description is unclear or ambiguous, use /create-prompt to ask clarifying questions and create a structured prompt. If the task is clear and unambiguous, proceed directly to implementation.

**GitHub Update (Checkpoint 1)**: Post task start comment with execution plan.
</task-preparation>

<worktree-setup>
Create isolated development environment using /setup-environment. The command auto-detects context (worktree vs new machine) and adapts validation appropriately.

**GitHub Update (Checkpoint 2)**: Post implementation progress comment after environment
is ready. </worktree-setup>

<autonomous-execution>
Implement the solution following project patterns and standards. Available agents:

- Dixon (.claude/agents/dev-agents/debugger.md): Root cause analysis, reproduces issues,
  identifies underlying problems
- Ada (.claude/agents/dev-agents/autonomous-developer.md): Implementation work, writes
  tests
- Phil (.claude/agents/dev-agents/ux-designer.md): Reviews user-facing text, validates
  accessibility, ensures UX consistency
- Rivera (.claude/agents/code-review/code-reviewer.md): Architecture review, validates
  design patterns, checks security
- Petra (.claude/agents/dev-agents/prompt-engineer.md): Prompt optimization and
  refinement
- Explore (general-purpose): Investigation, research, evaluates trade-offs

Build an execution plan based on task type. Use /load-cursor-rules to load relevant
project standards. Execute agents in parallel when possible, sequentially when they
depend on each other.

Provide targeted context when launching agents: task requirements, implementation
decisions, relevant standards, and specific focus area. Tailor context to agent type.

Maintain context throughout the workflow. Decisions and clarifications from earlier
phases inform later ones. </autonomous-execution>

<obstacle-and-decision-handling>
Pause only for deal-killers: security risks, data loss potential, or fundamentally unclear requirements. For everything else, make a reasonable choice and document it.

Document design decisions in the PR with rationale and alternatives considered. The
executing model knows when to ask vs when to decide and document.
</obstacle-and-decision-handling>

<validation-and-review>
Adapt validation intensity to task risk:

Default (trust git hooks): Make changes, commit, let hooks validate, fix only if hooks
fail.

Targeted validation: Run specific tests for changed code, use Rivera for architecture
review if patterns change.

Full validation: Comprehensive test suite, multiple agent reviews, security scanning.

Principle: Validation intensity should match task risk. Git hooks handle formatting,
linting, and tests. Add extra validation only when risk justifies it.

**GitHub Update (Checkpoint 3)**: Post validation results - test pass/fail, linting
status, code review findings. </validation-and-review>

<create-pr>
Deliver a well-documented pull request targeting the `development` branch with commits following .cursor/rules/git-commit-message.mdc.

Use `gh pr create --base development` to ensure PRs target the correct base branch for
this project.

**GitHub Update (Checkpoint 4)**: Post PR link and summary immediately after PR
creation.

PR description must include:

Summary:

- What was implemented and why
- How it addresses the requirements

Design Decisions (if any were made):

- Each significant decision with rationale
- Alternatives considered and trade-offs
- Why each approach was chosen

Obstacles Encountered (if any):

- Challenges faced
- How they were resolved or worked around

Testing:

- What validation was performed
- Edge cases considered </create-pr>

<bot-feedback-loop>
Autonomously address valuable bot feedback, reject what's not applicable, and deliver a PR ready for human review with all critical issues resolved.

After creating the PR, wait for AI code review bots to complete initial analysis. You
have context bots lack: project standards, implementation rationale, trade-offs
considered, and user requirements. Evaluate feedback against this context.

Fix what's valuable (security issues, real bugs, good suggestions). Reject what's not
(use WONTFIX with brief explanation for context-missing or incorrect feedback). Trust
your judgment on what matters.

Iterate on bot feedback until critical issues are resolved.

**GitHub Update (Checkpoint 5)**: Post completion status after addressing bot feedback,
include link to PR and next steps. </bot-feedback-loop>

<completion>
Provide a summary scaled to task complexity:

What was accomplished:

- Core functionality delivered
- Design decisions made autonomously
- Obstacles overcome without user intervention

Key highlights:

- Elegant solutions or optimizations
- Significant issues found and fixed
- Bot feedback addressed

Include the PR URL and worktree location. If design decisions were made autonomously,
note they're documented in the PR for review. </completion>

<error-recovery>
Recover gracefully from failures when possible. Capture decision-enabling context: what was attempted, what state preceded the failure, what the error indicates about root cause, and whether you have enough information to fix it autonomously.

Attempt fixes when you can. For issues you can't resolve autonomously, inform the user
with clear options and context. </error-recovery>

## Key Principles

- Single worktree per task: Clean isolation for parallel development
- Adaptive validation: Intensity matches task complexity and risk
- Intelligent agent use: Right tool for the job, no forced patterns
- Git hooks do validation: Leverage existing infrastructure
- Autonomous bot handling: Don't wait for human intervention
- PR-centric workflow: Everything leads to a mergeable pull request
- Smart obstacle handling: Pause only for deal-killers, document all decisions
- Decision transparency: Every autonomous choice documented in the PR

## Requirements

- GitHub CLI (`gh`) installed and authenticated
- Node.js/npm
- Project standards accessible via /load-cursor-rules

## Configuration

The command adapts to your project structure:

- Detects git hooks (husky, pre-commit)
- Detects test runners (jest, mocha, vitest, etc.)
- Finds linting configs (eslint, prettier, etc.)
- Uses available build scripts
- Respects project-specific conventions

## Notes

- This command creates real commits and PRs
- All work happens in isolated worktrees
- Bot feedback handling is autonomous but intelligent
- Worktrees are preserved until you explicitly remove them
