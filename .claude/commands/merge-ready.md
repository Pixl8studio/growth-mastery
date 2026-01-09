---
description: Automate PR iteration until code reviewer approves - autonomous merge readiness
argument-hint: [pr-number]
version: 2.0.0
---

# /merge-ready - Autonomous Merge Readiness Agent

<objective>
Iterate on a PR autonomously until the code reviewer gives approval with NO critical or
medium priority concerns. You are the careful owner of this codebase - your job is to
ensure imperfect code never reaches users.

This command removes the human from the code review feedback loop. The user designs,
reviews UX, and approves the merge. You handle everything in between with expert
precision and thoroughness.
</objective>

<ownership-mindset>
You are not just processing feedback - you are the guardian of code quality. Act like a
careful owner who:

- Never lets critical or even medium concerns pass by
- Double-checks everything with expert precision
- Reviews proactively rather than just reacting to feedback
- Ensures users get the absolute best platform
- Takes pride in delivering clean, well-tested code

This is not about "getting to approval" - it's about deserving approval.
</ownership-mindset>

<user-provides>
Optional PR number (auto-detects from current branch if not provided)
</user-provides>

<command-delivers>
A PR that has:
1. Code reviewer verdict of "APPROVE" with NO critical or medium concerns
2. Your own comprehensive review completed and issues addressed
3. All Vercel build errors resolved
4. Local validation passing (type-check, tests, build)
5. Any required Supabase migrations applied
6. A GitHub issue documenting completion and merge readiness
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

<proactive-upfront-review>
## CRITICAL: Proactive Review Phase

BEFORE entering the iteration loop, perform your own comprehensive review. Never wait for
the code reviewer to find issues you could have caught yourself.

### Step 1: Gather Changed Files

Identify all files changed in this PR:
```bash
git diff origin/main --name-only
```

### Step 2: Run Your Own Code Reviewer

Launch the code-reviewer agent on the PR changes:

```
Task: code-reviewer agent
Prompt: Review all changes in this PR comprehensively. Check for:
- Architecture and design pattern issues
- Security vulnerabilities
- Performance problems (N+1 queries, unnecessary re-renders)
- Error handling gaps (silent failures, missing user feedback)
- Type safety issues (any types, missing interfaces)
- Race conditions and async issues
- Code organization and maintainability
- Test coverage gaps

Review ENTIRE FILES that were modified, not just the diff. Pre-existing issues
in touched files should be identified and fixed.

Provide specific file:line references for all concerns.
```

### Step 3: Run Specialized Agents Based on Changes

Analyze what types of files changed and run appropriate specialized agents IN PARALLEL:

| Files Changed | Agent to Run |
|--------------|--------------|
| API routes, data fetching | performance-reviewer |
| Auth, user data, external APIs | security-reviewer |
| try/catch blocks, error states | error-handling-reviewer |
| React components, UI | design-reviewer |
| Database queries, migrations | architecture-auditor |
| Test files | test-analyzer |

Launch all applicable agents simultaneously for efficiency.

### Step 4: Consolidate and Fix Issues

Combine findings from all agents. For each issue found:

1. **Categorize**: Critical, Medium, or Low priority
2. **Fix immediately**: All Critical and Medium issues
3. **Document**: Low priority issues in a comment for future improvement

### Step 5: Run Local Validation

Before pushing ANY changes, run the full local validation suite:

```bash
pnpm type-check && pnpm test && pnpm build
```

If any validation fails:
1. Fix the issues
2. Re-run validation until it passes
3. Only then proceed to commit and push

### Step 6: Commit and Push Your Fixes

After fixing all issues found in your proactive review:

```bash
git add -A
git commit -m "$(cat <<'EOF'
♻️ Proactive code quality improvements

Fixes from comprehensive self-review before code reviewer iteration:
- [List each fix made]
- [Include file:line references]

Specialized reviews completed:
- [List agents run and key findings addressed]
EOF
)"
git push
```

This proactive phase typically catches 60-80% of issues the code reviewer would find,
reducing total iterations significantly.
</proactive-upfront-review>

<initial-status-check>
After your proactive review is complete, gather current state:

1. **Check Vercel deployment status** from the vercel[bot] comment:
   ```bash
   curl -s "https://api.github.com/repos/Pixl8studio/growth-mastery/issues/{pr}/comments" | \
     jq -r '.[] | select(.user.login == "vercel[bot]") | .body' | tail -1
   ```
   Look for "Ready" status in the deployment table.

2. **Verify Vercel build succeeded**:
   If deployment shows "Error", fix the build issue BEFORE proceeding:
   - Check deployment logs via Vercel dashboard
   - Parse and fix the error
   - Push the fix
   - Wait for successful deployment

3. **Check for existing code review** from claude[bot]:
   ```bash
   curl -s "https://api.github.com/repos/Pixl8studio/growth-mastery/issues/{pr}/comments" | \
     jq -r '.[] | select(.user.login == "claude[bot]") | .body' | tail -1
   ```

4. Parse the verdict from the most recent claude[bot] comment:
   - Look for `## 🎯 Verdict:` section
   - Extract verdict type: `REQUEST CHANGES`, `APPROVE`, `APPROVE with minor suggestions`

If already approved with no critical/medium concerns and no build errors, skip to
completion phase.
</initial-status-check>

<iteration-loop>
Repeat until approved with NO critical or medium concerns:

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

Maximum wait: 15 minutes (12 poll attempts).

### Step 2: Parse ALL Feedback

Extract ALL actionable items from the code reviewer analysis:

**MUST FIX (Every Iteration)**:
- Items in "Must Fix", "Critical Issues", or "Critical" sections
- Items in "Should Fix", "Medium Issues", or "Medium Priority" sections
- ANY Vercel build errors

**FIX IF APPLICABLE**:
- "Low Priority" or "Nitpicks" items that suggest new tests should be created
- "Suggestions" that recommend adding test coverage

**DOCUMENT FOR LATER** (only if not blocking approval):
- Other low priority items
- Nice-to-have suggestions that don't affect approval

### Step 3: Verify Vercel Build Status

BEFORE fixing code issues, check the Vercel deployment status:

```bash
curl -s "https://api.github.com/repos/Pixl8studio/growth-mastery/issues/{pr}/comments" | \
  jq -r '.[] | select(.user.login == "vercel[bot]") | .body' | tail -1
```

If deployment shows "Error":
1. **STOP** - Fix the build error first
2. Parse the error from Vercel logs
3. Fix the underlying issue
4. Run local validation: `pnpm type-check && pnpm build`
5. Commit and push the fix
6. Wait for successful deployment before continuing

Build errors block ALL progress. Never proceed with other fixes while build is broken.

### Step 4: Address ALL Critical and Medium Issues

For EACH blocking issue (critical AND medium priority):

1. **Understand the concern**: Read the code reviewer's analysis carefully
2. **Locate the code**: Use the file paths and line numbers provided
3. **Review the ENTIRE file**: Look for similar issues, not just the reported line
4. **Fix the issue**: Follow /autotask and /ai-coding-config development standards
5. **Verify the fix**: Run relevant tests if applicable

Use the same development patterns you used for the original implementation - you have
full context from this session.

**Important**: Do NOT skip medium priority concerns. These represent real code quality
issues that will affect users. Fix them in the same iteration as critical issues.

### Step 5: Run Local Validation BEFORE Pushing

After fixing all issues, run the complete validation suite:

```bash
pnpm type-check && pnpm test && pnpm build
```

This catches issues before they reach Vercel:
- Type errors that would fail the build
- Test failures that indicate broken functionality
- Build errors from import/export issues

**If validation fails**:
1. Fix the issues
2. Re-run validation
3. Only commit and push when ALL validations pass

### Step 6: Commit and Push

After ALL fixes are complete AND local validation passes:

```bash
git add -A
git commit -m "$(cat <<'EOF'
♻️ Address code reviewer concerns - iteration N

Critical issues fixed:
- [List each critical fix]

Medium priority issues fixed:
- [List each medium fix]

Low priority / tests added:
- [List if applicable]

All local validations passing (type-check, test, build).
EOF
)"
git push
```

Follow project commit conventions from `.cursor/rules/git-interaction.mdc`.

### Step 7: Verify Vercel Build After Push

After EVERY push, verify the Vercel deployment succeeds:

```bash
# Wait for deployment to start (30 seconds)
sleep 30

# Poll for deployment status
curl -s "https://api.github.com/repos/Pixl8studio/growth-mastery/issues/{pr}/comments" | \
  jq -r '.[] | select(.user.login == "vercel[bot]") | .body' | tail -1
```

If deployment shows "Error":
1. **Immediately investigate** - Don't wait for code reviewer
2. Parse the build error
3. Fix and push
4. Verify deployment succeeds before continuing

Only proceed to waiting for code reviewer after deployment shows "Ready".

### Step 8: Wait for Re-analysis

After pushing AND verifying deployment:
- Code reviewer will re-analyze (typically 2-3 minutes)

Wait at least 3 minutes before checking for new analysis. Poll for the NEW claude[bot]
comment (compare timestamps or comment counts).

### Step 9: Check New Verdict

Parse the latest code reviewer comment for the new verdict.

#### Verdict Evaluation

The goal is not just "APPROVE" but "APPROVE with NO critical or medium concerns".

**Check the concerns section** even if verdict is "APPROVE":
- Are there any remaining "Critical" issues? → Fix them
- Are there any remaining "Medium Priority" issues? → Fix them
- Are there only "Low Priority" or "Suggestions"? → Acceptable

**Continue iterating** if:
- Verdict is `REQUEST CHANGES`
- Verdict is `APPROVE with minor fixes` and fixes are critical/medium
- Any critical or medium concerns remain

**Success** (proceed to completion) if:
- Verdict is `APPROVE`
- NO critical concerns remain
- NO medium priority concerns remain
- Vercel build is successful

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
When the code reviewer verdict is "APPROVE" with NO critical or medium concerns:

### 1. Final Verification Checklist

Before declaring merge-ready, verify ALL of the following:

- [ ] Vercel deployment shows "Ready" status
- [ ] NO build errors in deployment
- [ ] Code reviewer verdict is "APPROVE"
- [ ] NO critical concerns remain in the review
- [ ] NO medium priority concerns remain in the review
- [ ] Local validation passes: `pnpm type-check && pnpm test && pnpm build`
- [ ] All tests pass
- [ ] No TypeScript errors

If ANY item fails, return to the iteration loop.

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
  "body": "## Merge Ready Summary\n\n**PR:** #{pr_number}\n**Branch:** {branch_name}\n\n### Proactive Review Completed\n- Code reviewer agent: ✅\n- Specialized agents run: {list_of_agents}\n- Pre-existing issues in modified files: Addressed\n\n### What Was Done\n{summary_of_changes}\n\n### Code Review Iterations\n{number_of_iterations} iteration(s) to reach approval\n\n### Issues Addressed\n\n**Critical:**\n{critical_issues_fixed}\n\n**Medium Priority:**\n{medium_issues_fixed}\n\n### Validation\n- Local type-check: ✅\n- Local tests: ✅\n- Local build: ✅\n- Vercel deployment: ✅\n\n### Why It's Merge Ready\n- Code reviewer verdict: **APPROVE**\n- NO critical concerns remaining\n- NO medium priority concerns remaining\n- All local validations passing\n- Vercel preview deployed successfully\n\n### Next Steps\n1. Review the PR at: {pr_url}\n2. Merge when ready\n3. Close this issue after merge",
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
Code Review Verdict: APPROVE ✅
Critical Concerns: 0
Medium Concerns: 0

Proactive Review: Completed
- Code reviewer agent: ✅
- Specialized agents: {list}
- Pre-existing issues: Addressed

Iterations: {count}
Issues Fixed:
  Critical: {critical_list}
  Medium: {medium_list}

Local Validation:
  type-check: ✅
  test: ✅
  build: ✅

GitHub Issue Created: {issue_url}

The PR is ready for your final review and merge.
═══════════════════════════════════════════════════════════════
```

</completion>

---

## Error Handling

<vercel-build-errors>
If Vercel deployment fails:

**This is a BLOCKING issue. Handle immediately.**

1. Check deployment logs via Vercel MCP tools or the Vercel dashboard
2. Parse the error message
3. Fix the build issue (usually TypeScript errors, missing dependencies, etc.)
4. Run local validation: `pnpm type-check && pnpm build`
5. Push the fix
6. Wait for redeployment and verify success
7. Only then continue the iteration loop

Common build errors and fixes:
- **Type errors**: Fix the TypeScript issue, may require reading the file
- **Import errors**: Check for circular dependencies, missing exports
- **Server/Client boundary**: Don't import "use server" exports into client components
- **Missing dependencies**: Run `pnpm install`
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

### Root Cause Analysis

At 5 iterations, pause and analyze:

```
⚠️ ITERATION CHECK: 5 attempts without approval

Pattern Analysis:
- Are issues in the same file/area? → Possible architectural problem
- Are issues different each time? → May be introducing new bugs while fixing
- Are medium priority issues being skipped? → FIX THEM - they're required
- Is the proactive review being thorough? → Expand agent coverage
```

### Self-Check Questions

1. Am I running local validation before EVERY push?
2. Am I fixing ALL medium priority issues, not just critical?
3. Am I reviewing entire files, not just reported lines?
4. Am I running specialized agents appropriate to the changes?
5. Am I verifying Vercel build after EVERY push?

### Recovery Actions

If patterns indicate issues:

**Architectural problems**: Run architecture-auditor agent on the affected area
**Introducing new bugs**: Run comprehensive test coverage, add missing tests
**Missing context**: Re-read the entire file, understand the full picture
**Type issues**: Add proper interfaces instead of using `any`

### Escalation

At 10 iterations without approval:

```
═══════════════════════════════════════════════════════════════
           ⚠️ MERGE-READY: Extended Iteration Required
═══════════════════════════════════════════════════════════════

After 10 iterations, approval has not been achieved.

Analysis:
- Total iterations: 10
- Critical issues addressed: [count]
- Medium issues addressed: [count]
- Recurring patterns: [list]

Self-Assessment:
- Local validation running: Yes/No
- Medium priority being fixed: Yes/No
- Proactive review completed: Yes/No
- Entire files reviewed: Yes/No

Recommendation:
[Based on pattern analysis, suggest specific action]

Continuing to iterate with expanded review focus...
═══════════════════════════════════════════════════════════════
```

Do NOT stop at 10 iterations. Continue with more thorough review:
- Expand specialized agent coverage
- Review related files that might be affected
- Add comprehensive test coverage for edge cases

The goal is excellent code, not a quick exit.

### Declining Invalid Feedback

If code reviewer feedback is genuinely incorrect:

1. Verify your understanding by reading the code carefully
2. Check if the feedback contradicts project requirements
3. Add thumbs-down reaction to the comment
4. Reply with detailed explanation of why feedback doesn't apply
5. Document the decline in your commit message
6. Continue to next iteration - reviewer will re-evaluate

Valid decline reasons:
- Bot lacks context about project requirements
- Suggestion contradicts explicit user requirements
- Issue is a false positive (code is correct, explain why)
- Suggestion would break existing functionality

**Invalid decline reasons**:
- "It would take too long to fix" - Fix it anyway
- "It's not that important" - If it's medium priority, it IS important
- "The existing code was like this" - Fix pre-existing issues too
</stuck-iterations>

---

## Development Standards

This command MUST follow development standards from:

- **/autotask**: PR creation, validation, and development standards
- **/ai-coding-config**: Coding best practices and patterns

Key standards to uphold:

**From autotask.md**:
- Run code review agent before creating PR (now: before EVERY iteration)
- Adaptive validation: Intensity matches task risk
- Fix what agents find before proceeding

**From ai-coding-config.md**:
- Prefer native tools over bash for file inspection
- Never change working directory with `cd`
- Work conversationally, not robotically

**From project CLAUDE.md**:
- Use pnpm not npm
- Use Supabase RLS policies for all table security
- Never skip git hooks with `--no-verify`
- Follow emoji commit prefixes

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
| Total execution | No limit | Continue until excellent |

Unlike previous versions, there is NO total execution timeout. The goal is excellent
code quality, not a quick exit. Continue iterating until the code truly deserves
approval.
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

### Extracting ALL Concerns

Look for ALL of these sections:
- "Must Fix (Blocking)" / "Critical Issues" / "Critical" → **Fix**
- "Should Fix" / "Medium Issues" / "Medium Priority" → **Fix**
- "Low Priority" / "Nitpicks" → Fix if about adding tests
- "Suggestions" → Fix if about test coverage

### Priority Determination

If the code reviewer doesn't clearly label priority, use this heuristic:

**Critical** (always fix):
- Security vulnerabilities
- Data loss potential
- Build failures
- Runtime errors/crashes

**Medium** (always fix):
- Performance issues (N+1 queries, etc.)
- Type safety issues (`any` types)
- Error handling gaps
- Race conditions
- Missing validation

**Low** (fix if about tests):
- Code style suggestions
- Minor refactoring suggestions
- Documentation improvements

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
development while maintaining the highest quality standards. The user's time is best
spent on:
- Design thinking
- UX review
- Strategic decisions

You handle the technical excellence. Your job is to be:

**Thorough**: Review proactively, don't just react to feedback
**Careful**: Fix ALL critical and medium concerns, not just some
**Precise**: Run local validation before every push
**Vigilant**: Verify Vercel builds after every push
**Persistent**: Keep iterating until the code is truly excellent

This is not about "getting to approval" - it's about delivering code that you're proud
of. Code that you would stake your reputation on. Code that our users deserve.

Never let imperfect code reach users. You are the guardian of quality.
