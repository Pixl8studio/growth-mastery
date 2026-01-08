---
description: Automate PR iteration until code reviewer approves - autonomous merge readiness
argument-hint: [pr-number]
version: 1.0.0
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
Waiting for code review analysis... (typically 2-3 minutes)
```

Poll every 60 seconds for up to 10 minutes:
```bash
# Check for claude[bot] comment
curl -s "https://api.github.com/repos/Pixl8studio/growth-mastery/issues/{pr}/comments" | \
  jq -r '[.[] | select(.user.login == "claude[bot]")] | length'
```

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
Address code reviewer concerns

- [List each fix made]
EOF
)"
git push
```

### Step 5: Wait for Re-analysis

After pushing:
- Vercel will redeploy (typically 1-2 minutes)
- Code reviewer will re-analyze (typically 2-3 minutes)

Wait at least 3 minutes before checking for new analysis. Poll for the NEW claude[bot]
comment (compare timestamps or comment counts).

### Step 6: Check New Verdict

Parse the latest code reviewer comment for the new verdict:

- **REQUEST CHANGES**: Return to Step 2 with the new feedback
- **APPROVE with Recommendations**: Continue iterating - this is close but not done
- **APPROVE with minor suggestions**: SUCCESS - proceed to completion
- **APPROVE**: SUCCESS - proceed to completion

</iteration-loop>

<database-migrations>
If any of your fixes required database schema changes:

1. Generate the migration SQL
2. Apply it using the Supabase Management API:

```bash
SUPABASE_PROJECT_ID="ufndmgxmlceuoapgvfco"
SUPABASE_TOKEN="sbp_e2d3403dd355541de7f82f37ef53d288635cda45"

SQL="YOUR MIGRATION SQL HERE"

curl -s -X POST "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$(echo "$SQL" | jq -Rs '{query: .}')"
```

For multi-statement migrations, execute statements separately.

Empty array `[]` response indicates success for DDL statements.

After applying migrations:
- Run `pnpm db:types` to regenerate TypeScript types
- Commit the type changes if any
</database-migrations>

<completion>
When the code reviewer verdict is "APPROVE" or "APPROVE with minor suggestions":

### 1. Final Verification

Confirm:
- Vercel deployment shows "Ready" status
- No build errors in deployment
- Code reviewer verdict is approval

### 2. Create Completion Issue

Create a GitHub issue to signal merge readiness:

```bash
curl -X POST "https://api.github.com/repos/Pixl8studio/growth-mastery/issues" \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$(cat <<'EOF'
{
  "title": "✅ PR #{pr_number} Ready to Merge: {pr_title}",
  "body": "## Merge Ready Summary\n\n**PR:** #{pr_number}\n**Branch:** {branch_name}\n\n### What Was Done\n{summary_of_changes}\n\n### Code Review Iterations\n{number_of_iterations} iteration(s) to reach approval\n\n### Issues Addressed\n{list_of_issues_fixed}\n\n### Why It's Merge Ready\n- Code reviewer verdict: **APPROVE**\n- Vercel preview: **Deployed successfully**\n- All blocking concerns resolved\n- Database migrations applied (if any)\n\n### Next Steps\n1. Review the PR at: {pr_url}\n2. Merge when ready\n3. Close this issue after merge",
  "labels": ["merge-ready", "automated"]
}
EOF
)"
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

1. Summarize the pattern of issues
2. Ask if there's a fundamental design problem to address
3. Consider whether some issues should be declined with explanation (per /address-pr-comments patterns)

Don't give up - iterate until approval. But do flag if there seems to be a deeper issue.
</stuck-iterations>

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
