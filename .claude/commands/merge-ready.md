---
description: Automate PR iteration until code reviewer approves - autonomous merge readiness
argument-hint: [pr-number]
version: 1.2.0
---

# /merge-ready - Autonomous Merge Readiness Agent

<objective>
Iterate on a PR autonomously until the code reviewer gives approval. You take over after
the user has reviewed the Vercel preview and approved the UX. Your job is to handle all
the technical feedback cycles until the PR is ready to merge.

This command removes the human from the code review feedback loop. The user designs,
reviews UX, and approves the merge. You handle everything in between.
</objective>

<user-provides>
Optional PR number (auto-detects from current branch if not provided)
</user-provides>

<command-delivers>
A PR that has:
1. Code reviewer verdict of "APPROVE" or "APPROVE with minor suggestions"
2. No Vercel build errors
3. Any required Supabase migrations applied
4. A GitHub issue documenting completion and merge readiness
</command-delivers>

## Usage

```
/merge-ready        - Auto-detect PR from current branch
/merge-ready 123    - Work on PR #123
```

## Prerequisites

This command assumes:
- You are in the same Claude session that wrote the original code (context preserved)
- The user has already reviewed the Vercel preview and approved the UX
- A PR exists or you have uncommitted changes ready to become a PR

### Required Environment Variables

For database migrations (if needed):
- `SUPABASE_PROJECT_ID` - Your Supabase project reference ID
- `SUPABASE_TOKEN` - Supabase Management API token (service role)

For GitHub issue creation:
- `GITHUB_TOKEN` - GitHub personal access token or available automatically in GitHub Actions

**Security Note**: Never hardcode these credentials. Set them via:
- Local development: Export in your shell or use `.env.local`
- CI/CD: Configure as GitHub Secrets
- Claude Code: Set via environment before running

---

## Execution Flow

<pr-detection>
Detect or create the PR:

1. If PR number provided, use it directly
2. Otherwise, check if current branch has an open PR:
   ```bash
   curl -s "https://api.github.com/repos/Pixl8studio/growth-mastery/pulls?head=Pixl8studio:$(git branch --show-current)&state=open"
   ```
3. If no PR exists, create one following /autotask PR creation standards
4. Store the PR number for all subsequent operations
</pr-detection>

<initial-status-check>
Before entering the loop, gather current state:

1. **Check Vercel deployment status** from the vercel[bot] comment:
   ```bash
   curl -s "https://api.github.com/repos/Pixl8studio/growth-mastery/issues/{pr}/comments" | \
     jq -r '.[] | select(.user.login == "vercel[bot]") | .body' | tail -1
   ```
   Look for "Ready" status in the deployment table.

2. **Check for existing code review** from claude[bot]:
   ```bash
   curl -s "https://api.github.com/repos/Pixl8studio/growth-mastery/issues/{pr}/comments" | \
     jq -r '.[] | select(.user.login == "claude[bot]") | .body' | tail -1
   ```

3. Parse the verdict from the most recent claude[bot] comment:
   - Look for `## 🎯 Verdict:` section
   - Extract verdict type: `REQUEST CHANGES`, `APPROVE`, `APPROVE with minor suggestions`

If already approved with no build errors, skip to completion phase.
</initial-status-check>

<iteration-loop>
Repeat until approved:

### Step 1: Wait for Analysis (if not yet available)

If Vercel deployment or code review isn't ready:

```
Waiting for code review analysis... (typically 2-3 minutes, up to 10 for large PRs)
```

Use adaptive polling with increasing intervals to reduce API load:

| Attempt | Wait Time | Cumulative |
|---------|-----------|------------|
| 1-3     | 30 seconds | 1.5 min |
| 4-6     | 60 seconds | 4.5 min |
| 7-10    | 90 seconds | 10.5 min |
| 11-12   | 120 seconds | 14.5 min |

Maximum wait: 15 minutes (12 poll attempts). For large PRs with extensive changes,
the code reviewer may take longer to analyze.

```bash
# Check for claude[bot] comment count
COMMENT_COUNT=$(curl -s "https://api.github.com/repos/Pixl8studio/growth-mastery/issues/{pr}/comments" | \
  jq -r '[.[] | select(.user.login == "claude[bot]")] | length')

# Compare with previous count to detect new analysis
if [ "$COMMENT_COUNT" -gt "$PREVIOUS_COUNT" ]; then
  echo "New code review available"
fi
```

If timeout reached without new analysis, report status and suggest manual check.

### Step 2: Parse Feedback

Extract actionable items from the code reviewer analysis:

**Must Fix (Blocking)**: Items in the "Must Fix" or "Critical Issues" sections
**Should Fix (High Priority)**: Items in "Should Fix" or "Medium Issues" sections

Skip "Nice to Have" and "Low Priority" items - these don't block approval.

Also check for Vercel build errors by examining deployment status.

### Step 3: Address Issues

For each blocking issue:

1. **Understand the concern**: Read the code reviewer's analysis carefully
2. **Locate the code**: Use the file paths and line numbers provided
3. **Fix the issue**: Follow /autotask and /ai-coding-config development standards
4. **Verify the fix**: Run relevant tests if applicable

Use the same development patterns you used for the original implementation - you have
full context from this session.

### Step 4: Commit and Push

After fixing all blocking issues:

```bash
git add -A
git commit -m "$(cat <<'EOF'
♻️ Address code reviewer concerns

- [List each fix made]
- [Reference specific concerns by number if applicable]
EOF
)"
git push
```

For security fixes, use the security emoji:
```bash
git commit -m "🔒 Fix security vulnerability from code review"
```

Follow project commit conventions from `.cursor/rules/git-interaction.mdc`.

### Step 5: Wait for Re-analysis

After pushing:
- Vercel will redeploy (typically 1-2 minutes)
- Code reviewer will re-analyze (typically 2-3 minutes)

Wait at least 3 minutes before checking for new analysis. Poll for the NEW claude[bot]
comment (compare timestamps or comment counts).

### Step 6: Check New Verdict

Parse the latest code reviewer comment for the new verdict.

#### Verified Verdict Formats

Based on actual claude[bot] output analysis, the verdict appears in this format:

```markdown
## 🎯 Verdict: **VERDICT_TEXT**
```

**Observed verdict values** (from PR #416 and similar):
- `REQUEST CHANGES` - Has blocking issues that must be fixed
- `APPROVE` - Full approval, no concerns
- `⚠️ REQUEST CHANGES` - Variant with warning emoji (treat as REQUEST CHANGES)

**Parsing logic with fallback**:
```bash
# Extract verdict from claude[bot] comment
VERDICT=$(echo "$COMMENT_BODY" | grep -oP '(?<=## 🎯 Verdict: \*\*)[^*]+' | head -1)

# Fallback: try without emoji
if [ -z "$VERDICT" ]; then
  VERDICT=$(echo "$COMMENT_BODY" | grep -oP '(?<=Verdict: \*\*)[^*]+' | head -1)
fi

# Normalize variations
VERDICT=$(echo "$VERDICT" | sed 's/^⚠️ //')  # Remove leading warning emoji

# Decision logic
case "$VERDICT" in
  "REQUEST CHANGES")
    echo "Continue iterating"
    ;;
  "APPROVE"|"APPROVE with minor suggestions")
    echo "Success - proceed to completion"
    ;;
  *)
    echo "Unknown verdict: $VERDICT - treating as needs review"
    # Fallback: check for approval keywords in comment body
    if echo "$COMMENT_BODY" | grep -qi "ready to merge\|lgtm\|ship it"; then
      echo "Detected approval language - proceeding"
    else
      echo "Continuing iteration to be safe"
    fi
    ;;
esac
```

**Continue iterating** (not yet approved):
- `REQUEST CHANGES` - Has blocking issues to address
- Unknown/unparseable verdict - Continue to be safe

**Success** (proceed to completion):
- `APPROVE` - Full approval
- `APPROVE with minor suggestions` - Approved with optional improvements

**Important**: If verdict parsing fails consistently, report the raw verdict text to the
user and ask for manual interpretation. Don't infinite loop on parsing errors.

</iteration-loop>

<database-migrations>
If any of your fixes required database schema changes:

### Environment Safety

**CRITICAL**: This section applies to DEVELOPMENT and PREVIEW environments only.

| Environment | When to Apply | Notes |
|-------------|---------------|-------|
| Development | During iteration | Safe to experiment |
| Preview/Staging | After code approval | Test before production |
| Production | AFTER PR merge | Never during iteration |

**Do NOT apply migrations to production during the iteration loop.** Production migrations
should be handled by your deployment pipeline after the PR is merged.

### Migration Workflow

1. **Create migration file** in `supabase/migrations/` following project conventions
2. **Test locally** using `supabase db reset` or preview branch
3. **Commit migration file** with your code fixes
4. **Apply to preview environment** only if needed for Vercel preview to work

### Applying to Preview/Development

Verify environment variables are set:
```bash
# These must be set in your environment - never hardcode credentials
if [ -z "$SUPABASE_PROJECT_ID" ] || [ -z "$SUPABASE_TOKEN" ]; then
  echo "Error: SUPABASE_PROJECT_ID and SUPABASE_TOKEN must be set"
  exit 1
fi

# VERIFY you're targeting the correct environment
echo "Target project: $SUPABASE_PROJECT_ID"
# Should match your development/preview project, NOT production
```

Apply using the Supabase Management API:
```bash
SQL="YOUR MIGRATION SQL HERE"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$(echo "$SQL" | jq -Rs '{query: .}')")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -ne 200 ]; then
  echo "Migration failed (HTTP $HTTP_CODE): $BODY"
  exit 1
fi
```

### Rollback Instructions

If migration needs to be reverted (iteration continues with different approach):

```bash
# Generate rollback SQL (inverse of migration)
ROLLBACK_SQL="DROP TABLE IF EXISTS new_table; -- or ALTER TABLE ... DROP COLUMN ..."

# Apply rollback
curl -s -X POST "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$(echo "$ROLLBACK_SQL" | jq -Rs '{query: .}')"
```

**Document rollback SQL** in a comment at the top of your migration file for safety.

### After Applying Migrations

- Run `pnpm db:types` to regenerate TypeScript types
- Commit the type changes if any
- Push before waiting for re-analysis
- Note in PR description that migrations were applied to preview
</database-migrations>

<completion>
When the code reviewer verdict is "APPROVE" or "APPROVE with minor suggestions":

### 1. Final Verification

Confirm:
- Vercel deployment shows "Ready" status
- No build errors in deployment
- Code reviewer verdict is approval

### 2. Create Completion Issue

Create a GitHub issue to signal merge readiness.

**Note**: `GITHUB_TOKEN` is automatically available in GitHub Actions. For local
development, set it as an environment variable with `repo` scope permissions.

```bash
# Verify token is available
if [ -z "$GITHUB_TOKEN" ]; then
  echo "Warning: GITHUB_TOKEN not set - skipping issue creation"
  echo "The PR is still ready to merge, but no tracking issue was created."
else
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "https://api.github.com/repos/Pixl8studio/growth-mastery/issues" \
    -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$(cat <<'EOF'
{
  "title": "✅ PR #{pr_number} Ready to Merge: {pr_title}",
  "body": "## Merge Ready Summary\n\n**PR:** #{pr_number}\n**Branch:** {branch_name}\n\n### What Was Done\n{summary_of_changes}\n\n### Code Review Iterations\n{number_of_iterations} iteration(s) to reach approval\n\n### Issues Addressed\n{list_of_issues_fixed}\n\n### Why It's Merge Ready\n- Code reviewer verdict: **APPROVE**\n- Vercel preview: **Deployed successfully**\n- All blocking concerns resolved\n- Database migrations applied (if any)\n\n### Next Steps\n1. Review the PR at: {pr_url}\n2. Merge when ready\n3. Close this issue after merge",
  "labels": ["merge-ready", "automated"]
}
EOF
)")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

  if [ "$HTTP_CODE" -ne 201 ]; then
    echo "Warning: Failed to create GitHub issue (HTTP $HTTP_CODE)"
    echo "The PR is still ready to merge - issue creation is non-blocking."

    # Log failure details for debugging
    echo "--- GitHub API Error Details ---"
    case "$HTTP_CODE" in
      401) echo "Cause: Authentication failed - check GITHUB_TOKEN validity" ;;
      403) echo "Cause: Rate limited or insufficient permissions (needs 'repo' scope)" ;;
      404) echo "Cause: Repository not found or token lacks access" ;;
      422) echo "Cause: Validation failed - check issue title/body format" ;;
      *)   echo "Cause: Unknown - see response body below" ;;
    esac
    echo "Response: $RESPONSE_BODY"
    echo "--------------------------------"
  fi
fi
```

### 3. Report to User

Display prominently:

```
═══════════════════════════════════════════════════════════════
                    PR #{number} IS MERGE READY
═══════════════════════════════════════════════════════════════

PR: {title}
URL: {pr_url}

Vercel Preview: {preview_url}
Code Review Verdict: APPROVE

Iterations: {count}
Issues Fixed: {list}

GitHub Issue Created: {issue_url}

The PR is ready for your final review and merge.
═══════════════════════════════════════════════════════════════
```

</completion>

---

## Error Handling

<vercel-build-errors>
If Vercel deployment fails:

1. Check deployment logs via Vercel MCP tools or the Vercel dashboard
2. Parse the error message
3. Fix the build issue (usually TypeScript errors, missing dependencies, etc.)
4. Push the fix and wait for redeployment
5. Continue the iteration loop
</vercel-build-errors>

<connection-issues>
If the connection breaks mid-iteration:

The user should refresh the page to restore the connection and run `/merge-ready {pr}`
again. The command will:
1. Detect the existing PR
2. Check current status
3. Continue where it left off
</connection-issues>

<stuck-iterations>
If the code reviewer keeps finding new issues after 5+ iterations:

### Concrete Recovery Steps

**At 5 iterations**: Pause and analyze the pattern

```
⚠️ ITERATION CHECK: 5 attempts without approval

Pattern Analysis:
- Are issues in the same file/area? → Possible architectural problem
- Are issues different each time? → May be chasing edge cases
- Are issues getting more minor? → Progress is being made
- Are issues severity increasing? → Fixes may be introducing bugs
```

**At 7 iterations**: Create a summary issue and notify user

```bash
# Create issue documenting the iteration pattern
curl -X POST "https://api.github.com/repos/Pixl8studio/growth-mastery/issues" \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "🔄 PR #X requires attention - 7+ review iterations",
    "body": "## Iteration Summary\n\n**Iterations:** 7\n**PR:** #X\n\n### Issue Pattern\n[List recurring themes]\n\n### Recommendation\n[Architectural review / design discussion / scope reduction]\n\n### Options\n1. Continue iterating (may need 3-5 more)\n2. Schedule design review\n3. Split PR into smaller changes",
    "labels": ["needs-attention", "review-stuck"]
  }'
```

**At 10 iterations**: Mandatory pause

Stop iteration and report to user:
```
═══════════════════════════════════════════════════════════════
           ⚠️ MERGE-READY PAUSED: Manual Review Required
═══════════════════════════════════════════════════════════════

After 10 iterations, approval has not been achieved.

Summary:
- Total iterations: 10
- Issues addressed: [count]
- Recurring patterns: [list]

Recommendation: This PR may need:
□ Architectural review before continuing
□ Scope reduction (split into smaller PRs)
□ Design discussion with stakeholders

PR URL: {url}
Review issue created: {issue_url}

Run /merge-ready {pr} to resume after addressing root cause.
═══════════════════════════════════════════════════════════════
```

### Declining Invalid Feedback

If code reviewer feedback seems incorrect (per /address-pr-comments patterns):

1. Add thumbs-down reaction to the comment
2. Reply with explanation of why feedback doesn't apply
3. Document the decline in your commit message
4. Continue to next iteration - reviewer will re-evaluate

Valid decline reasons:
- Bot lacks context about project requirements
- Suggestion contradicts explicit user requirements
- Issue is a false positive (code is correct)
- Suggestion would break existing functionality
</stuck-iterations>

---

## Operational Considerations

<observability>
### Logging and Monitoring

This command runs autonomously for extended periods. Use project logging standards for
visibility into operations.

**Structured logging** (per `.cursor/rules/frontend/typescript-coding-standards.mdc`):

When implementing fixes, use Pino logger for tracking:
```typescript
import { logger } from "@/lib/logger";

logger.info({ pr, iteration, verdict }, "Code review iteration complete");
logger.warn({ pr, iteration, timeout }, "Waiting for code review analysis");
logger.error({ pr, error, attempt }, "Failed to apply migration");
```

**Sentry integration** for error tracking:
```typescript
import * as Sentry from "@sentry/nextjs";

// Add breadcrumb for major phases
Sentry.addBreadcrumb({
  category: "merge-ready",
  message: `Iteration ${iteration} - fixing ${issueCount} issues`,
  level: "info",
  data: { pr, iteration, issueCount }
});

// Report failures
Sentry.captureException(error, {
  tags: { command: "merge-ready", phase: "migration" },
  extra: { pr, iteration, lastVerdict }
});
```

This ensures autonomous operations are visible in your monitoring dashboards.
</observability>

<rate-limiting>
### API Rate Limits

The polling strategy must respect GitHub API rate limits.

**GitHub API limits**:
- Authenticated: 5,000 requests/hour
- Per-repository: Additional limits may apply

**Our usage pattern** (12 polls over 15 minutes):
- ~48 requests/hour for polling (well under limit)
- Additional requests for PR comments, issue creation

**Rate limit detection**:
```bash
# Check remaining rate limit
RATE_INFO=$(curl -s -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  "https://api.github.com/rate_limit")
REMAINING=$(echo "$RATE_INFO" | jq '.resources.core.remaining')

if [ "$REMAINING" -lt 100 ]; then
  echo "Warning: GitHub API rate limit low ($REMAINING remaining)"
  echo "Increasing poll interval to conserve quota"
  # Double poll intervals when rate limited
fi
```

**If rate limited** (HTTP 403 with rate limit headers):
1. Parse `X-RateLimit-Reset` header for reset time
2. Wait until reset (or report to user if > 30 minutes)
3. Resume with longer polling intervals
</rate-limiting>

<concurrent-prs>
### Concurrent PR Handling

Multiple PRs can use this command simultaneously, but consider:

**Resource contention**:
- Each PR uses its own polling cycle
- API rate limits are shared across all PRs
- Database migrations could conflict if targeting same tables

**Recommendations**:
1. Run one `/merge-ready` per repository at a time when possible
2. If running multiple, stagger start times by 5+ minutes
3. Monitor rate limit consumption across all sessions
4. Use separate database environments for each PR's migrations

**No explicit locking is implemented** - this command is stateless by design. Multiple
concurrent executions won't corrupt state, but may exhaust API quotas faster.
</concurrent-prs>

<timeouts>
### Execution Timeouts

To prevent runaway processes:

| Phase | Timeout | Action on Timeout |
|-------|---------|-------------------|
| Wait for analysis | 15 minutes | Report and suggest manual check |
| Single iteration | 30 minutes | Report partial progress |
| Total execution | 2 hours | Mandatory pause, create summary issue |

The 2-hour total timeout provides a safety net. Most PRs should reach approval in
30-60 minutes (2-4 iterations).
</timeouts>

---

## Key Patterns

### Parsing Code Reviewer Verdict

The claude[bot] comment contains a verdict section like:

```markdown
## 🎯 Verdict: **REQUEST CHANGES**
```

or

```markdown
## 🎯 Verdict: **APPROVE**
```

Extract the text after "Verdict:" to determine status.

### Extracting Blocking Issues

Look for sections labeled:
- "Must Fix (Blocking)"
- "Critical Issues"
- "Should Fix" / "Medium Issues" (address these too for full approval)

Each concern typically includes:
- File path and line numbers
- Description of the issue
- Suggested fix or code snippet

### Using Vercel MCP Tools

If available, use the Vercel connector for:
- Checking deployment status
- Viewing build logs
- Getting preview URLs

The connector provides read-only tools and a `deploy_to_vercel` action.

---

## Integration with Other Commands

This command builds on:

- **/autotask**: PR creation and development standards
- **/ai-coding-config**: Coding best practices
- **/address-pr-comments**: Patterns for handling bot feedback
- **/verify-fix**: Ensuring fixes actually work

Follow all project standards from CLAUDE.md and loaded rules.

---

## Philosophy

This command embodies the vision of removing humans from the tedious parts of
development. The user's time is best spent on:
- Design thinking
- UX review
- Strategic decisions

The iteration loop between "code written" and "code approved" is mechanical. That's what
this agent automates.

Your job is to be thorough, patient, and persistent. Keep iterating until the code
reviewer says approve. Don't shortcut the process - earn the approval.
