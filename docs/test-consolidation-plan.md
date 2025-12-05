# Test Consolidation Plan

## Current Situation

### Main Repository Tests

- **Location:** `__tests__/`
- **Count:** 420 test files
- **Structure:**
  - `__tests__/unit/` - ~350 unit tests
  - `__tests__/integration/` - ~50 integration tests
  - `__tests__/e2e/` - ~19 E2E tests (excluded from default runs)

### Gitworktree Tests (Work-in-Progress Branches)

- **Location:** `.gitworktrees/*/`
- **Count:** ~3,355 test files across 15 worktrees
- **Problem:** Pre-push hooks were scanning ALL of these!

| Worktree                             | Test Count | Status     |
| ------------------------------------ | ---------- | ---------- |
| auth-security-tests                  | 60         | WIP branch |
| batch-10-followup-api                | 280        | WIP branch |
| batch-11-ads-module                  | 158        | WIP branch |
| batch-12-generation-api-routes       | 158        | WIP branch |
| batch-13-generators-library          | 189        | WIP branch |
| batch-18-scraping-utils              | 162        | WIP branch |
| batch-21-marketing-funnel-components | 320        | WIP branch |
| batch-22-funnel-settings-components  | 320        | WIP branch |
| batch-26-ui-primitives-tests         | 319        | WIP branch |
| batch-issues-72-75                   | 300        | WIP branch |
| issue-46                             | 300        | WIP branch |
| issue-49                             | 300        | WIP branch |
| marketing-api-tests-batch-6          | 72         | WIP branch |
| stripe-tests                         | 58         | WIP branch |
| update-ai-coding-config              | 359        | WIP branch |

## Immediate Fixes Applied ✅

### 1. Excluded Gitworktrees from Scanning

**Files Modified:**

- `tsconfig.json` - Added `.gitworktrees/**/*` to exclude
- `eslint.config.mjs` - Added `.gitworktrees/**` to ignores
- `.gitignore` - Added `.gitworktrees/` directory
- `vitest.config.ts` - Already excludes `.gitworktrees/**`
- `scripts/validate-test-safety.js` - Excludes `.gitworktrees/*`

**Result:** Pre-push hooks now ONLY scan the 420 tests in `__tests__/`, not the 3,355+
in gitworktrees.

### 2. Test Safety Protection

- Worker limits (max 4)
- Process spawning blocker
- E2E exclusion from default runs
- Pre-test validation

## Test Consolidation Strategy

### Phase 1: Audit (Manual Review Required)

For each gitworktree, determine:

1. **Are the tests already in main `__tests__/`?**
   - If YES → Delete the worktree or merge changes
   - If NO → Proceed to step 2

2. **Are the tests testing NEW features not in main?**
   - If YES → Keep worktree for now, merge when feature is ready
   - If NO → Tests are outdated, can delete

3. **Are the tests improvements/additions to existing tests?**
   - If YES → Cherry-pick improvements into main `__tests__/`
   - If NO → Skip

### Phase 2: Consolidation Process

#### High Priority Worktrees (Likely Complete)

These worktrees likely have tests ready to merge:

1. **batch-26-ui-primitives-tests** (319 tests)
   - Focus: UI component tests
   - Check: Are these testing existing components or new ones?

2. **batch-21-marketing-funnel-components** (320 tests)
   - Focus: Marketing funnel component tests
   - Check: Compare with existing `__tests__/unit/components/marketing/`

3. **batch-10-followup-api** (280 tests)
   - Focus: AI followup API tests
   - Check: Compare with existing `__tests__/integration/api/followup/`

#### Medium Priority (Feature-Specific)

4. **auth-security-tests** (60 tests)
5. **stripe-tests** (58 tests)
6. **marketing-api-tests-batch-6** (72 tests)

#### Low Priority (Large WIP)

These are likely still in development:

- batch-11-ads-module (158)
- batch-12-generation-api-routes (158)
- batch-13-generators-library (189)
- etc.

### Phase 3: Merge Process

For each worktree being consolidated:

```bash
# 1. Checkout the worktree branch
git worktree list
cd .gitworktrees/<worktree-name>

# 2. Check what tests exist
find __tests__ -name "*.test.ts" -o -name "*.spec.ts" | sort

# 3. Compare with main repo tests
cd /Users/lawl3ss/Documents/Growth\ Mastery
diff -r __tests__/ .gitworktrees/<worktree-name>/__tests__/

# 4. If tests are new and good, cherry-pick or copy them
# Option A: Cherry-pick commits
git log --oneline .gitworktrees/<worktree-name>/__tests__/
git cherry-pick <commit-hash>

# Option B: Manual copy
cp -r .gitworktrees/<worktree-name>/__tests__/new-tests/ __tests__/

# 5. Run tests to ensure they pass
pnpm test

# 6. Commit the consolidated tests
git add __tests__/
git commit -m "feat: Consolidate tests from <worktree-name>"

# 7. Remove the worktree if fully merged
git worktree remove .gitworktrees/<worktree-name>
```

## Test Organization Standards

### Directory Structure

```
__tests__/
├── unit/               # Pure unit tests (no external deps)
│   ├── components/     # React component tests
│   ├── lib/           # Library/utility tests
│   └── ...
├── integration/        # Integration tests (with mocked APIs)
│   ├── api/           # API route tests
│   └── ...
└── e2e/               # End-to-end tests (EXCLUDED from default)
    └── ...
```

### Naming Conventions

- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `*.test.ts`
- E2E tests: `*.spec.ts`

### Test File Location

- **Unit tests:** Mirror the source file location
  - Source: `lib/utils/format.ts`
  - Test: `__tests__/unit/lib/utils/format.test.ts`

- **Integration tests:** Group by feature/API
  - API: `app/api/followup/route.ts`
  - Test: `__tests__/integration/api/followup.test.ts`

- **E2E tests:** Group by user flow
  - Test: `__tests__/e2e/auth/login.spec.ts`

### Test Quality Standards

1. **No real process spawning** - Use mocks
2. **No real external APIs** - Mock all external calls
3. **Fast execution** - Unit tests < 100ms each
4. **Isolated** - Tests don't depend on each other
5. **Clear names** - Describe what's being tested

## Action Items

### Immediate (This Session)

- [x] Exclude gitworktrees from type-check
- [x] Exclude gitworktrees from eslint
- [x] Add gitworktrees to .gitignore
- [x] Document current state
- [ ] Push fixes to development

### Short-Term (Next Session)

- [ ] Audit batch-26-ui-primitives-tests (319 tests)
- [ ] Audit batch-21-marketing-funnel-components (320 tests)
- [ ] Audit batch-10-followup-api (280 tests)
- [ ] Consolidate any ready tests from above

### Medium-Term (This Week)

- [ ] Audit remaining high-value worktrees
- [ ] Create GitHub issues for each consolidation task
- [ ] Set up automated test for gitworktree scanning (should fail if found)

### Long-Term (This Month)

- [ ] Consolidate all ready worktree tests
- [ ] Delete merged/outdated worktrees
- [ ] Document which worktrees are active development
- [ ] Set up CI/CD to block gitworktree commits

## Commands Reference

### Find Tests in Worktrees

```bash
for dir in .gitworktrees/*/; do
  echo "$(basename "$dir"): $(find "$dir" -path "*/node_modules" -prune -o \( -name "*.test.ts" -o -name "*.spec.ts" \) -type f -print 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ') tests"
done
```

### Compare Worktree Tests with Main

```bash
# List tests in worktree
find .gitworktrees/<name>/__tests__ -type f -name "*.test.ts" | sed 's|.gitworktrees/<name>/||' | sort > /tmp/worktree-tests.txt

# List tests in main
find __tests__ -type f -name "*.test.ts" | sort > /tmp/main-tests.txt

# Find tests only in worktree (candidates for merge)
comm -23 /tmp/worktree-tests.txt /tmp/main-tests.txt
```

### Check Test Health

```bash
# Run only main tests (should always work)
pnpm test

# Type-check main only
pnpm type-check

# Validate test safety
pnpm test:validate
```

## Success Criteria

- [ ] All tools (type-check, lint, test) only scan `__tests__/`
- [ ] No gitworktree tests run in pre-push hooks
- [ ] All ready tests from worktrees consolidated to main
- [ ] Outdated worktrees removed
- [ ] Test count in main increases from 420 to target ~600-700 (quality tests only)
- [ ] All tests pass with new safety protections
- [ ] Documentation complete for test standards

## Notes

- **DO NOT blindly merge all 3,355 tests** - Many are duplicates, WIP, or outdated
- **Each worktree is a separate branch** - They may have their own feature code that
  tests depend on
- **Quality over quantity** - Better to have 600 good tests than 3,000 flaky ones
- **Git worktrees should be temporary** - Once features merge, delete the worktrees

---

**Status:** Gitworktrees excluded from scanning ✅ | Consolidation plan created ✅ |
Ready for audit phase
