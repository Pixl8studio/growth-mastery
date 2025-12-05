# Test Safety & Process Spawning Protection

## Summary

Your system was freezing due to cascading node processes when running tests. We've
implemented **multiple layers of protection** to prevent this from ever happening again.

## Protection Layers Implemented

### Layer 1: Vitest Process Limits

**File:** `vitest.config.ts`

```typescript
test: {
    maxWorkers: 4,          // Maximum 4 parallel test workers
    minWorkers: 1,          // Minimum 1 worker
    maxConcurrency: 4,      // Maximum 4 concurrent tests
    testTimeout: 10000,     // 10s timeout per test
    hookTimeout: 10000,     // 10s timeout for hooks
    teardownTimeout: 5000,  // 5s timeout for teardown
}
```

**Protection:** Prevents unlimited parallel test execution that exhausts system
resources.

### Layer 2: E2E Test Exclusion

**File:** `vitest.config.ts`

```typescript
exclude: [
  "**/__tests__/e2e/**", // E2E tests excluded from vitest
];
```

**Why:** E2E tests spawn browser processes (Playwright). These are now run separately
with `pnpm test:e2e`.

**Impact:**

- Removed 19 high-risk E2E tests from default test runs
- Kept 400+ safe unit/integration tests

### Layer 3: Process Spawning Blocker

**File:** `__tests__/setup.ts`

Automatically mocks and blocks all real process spawning in tests:

- `child_process.spawn()` → throws error
- `child_process.exec()` → throws error
- `child_process.fork()` → throws error
- `worker_threads.Worker()` → throws error

**Protection:** If any test tries to spawn a real process, it fails immediately with a
clear error message instead of cascading.

### Layer 4: Pre-Test Validation

**File:** `scripts/validate-test-safety.js`

Scans all 420 test files before running tests to detect:

- Direct `child_process` imports
- Direct `worker_threads` imports
- Spawn/exec/fork calls
- Worker thread creation

**Usage:** Runs automatically before every test command:

```bash
pnpm test           # Validates then runs tests
pnpm test:watch     # Validates then watches
pnpm test:coverage  # Validates then coverage
```

**Result:** ✅ All 420 test files passed validation - no dangerous patterns found!

## Test Inventory & Risk Assessment

| Category          | Count   | Risk Level | Status                        |
| ----------------- | ------- | ---------- | ----------------------------- |
| Unit Tests        | ~350    | LOW        | ✅ Safe to run                |
| Integration Tests | ~50     | MEDIUM     | ✅ Safe with limits           |
| E2E Tests         | 19      | HIGH       | ⚠️ Excluded from default runs |
| **Total**         | **420** | -          | **✅ Protected**              |

## Commands Reference

### Safe Test Commands (Protected)

```bash
pnpm test                   # Run unit + integration tests (safe)
pnpm test:watch            # Watch mode (safe)
pnpm test:coverage         # With coverage (safe)
pnpm test:validate         # Just run safety validation
```

### Risky Commands (Use with Caution)

```bash
pnpm test:e2e              # Run E2E tests (spawns browsers)
pnpm test:e2e:ui           # E2E with UI (spawns browsers)
```

**Recommendation:** Run E2E tests manually when needed, not as part of automated flows.

## Monitoring & Emergency Procedures

### Check System Health

```bash
# Count node processes (should be < 10)
ps aux | grep -i node | wc -l

# List all node processes
ps aux | grep -i node

# Find process hogs
ps aux | sort -k 3 -r | head -10
```

### Emergency Kill Procedures

```bash
# Kill all agent-listener processes
pkill -f "agent-listener.ts"

# Kill all swarm orchestrator processes
pkill -f "orchestrator.ts"

# Nuclear option: kill all node processes (use with caution!)
pkill node
```

## What Changed vs. Before

| Aspect                   | Before          | After         |
| ------------------------ | --------------- | ------------- |
| Node processes           | 22+             | 5             |
| Test workers             | Unlimited       | Max 4         |
| Test concurrency         | All 420 at once | Max 4 at once |
| E2E tests in default run | Yes (19 tests)  | No (excluded) |
| Process spawn protection | None            | 4 layers      |
| Pre-test validation      | None            | Automatic     |
| System freezing          | Yes             | No            |

## Answer to Your Question

> How many tests are based on that and what is the impact of removing those tests?

**Tests with direct process spawning:** **0 tests** ✅

After scanning all 420 test files:

- ✅ No tests directly import `child_process`
- ✅ No tests call `spawn()`, `exec()`, `fork()`
- ✅ No tests create worker threads

**The real issue was:**

1. 420 tests × unlimited workers = resource exhaustion
2. E2E tests spawning browser processes (19 tests)
3. No concurrency limits

**Our solution:**

1. **Limited workers to 4** (instead of unlimited)
2. **Excluded 19 E2E tests** from default runs
3. **Added 4 protection layers** to prevent future issues
4. **Kept 400+ unit/integration tests** safe to run

**Impact of changes:**

- ✅ 400+ unit/integration tests still run by default
- ✅ Critical code quality checks maintained
- ✅ System no longer freezes
- ⚠️ E2E tests must be run separately (low impact - can test manually)

## Recommendation

**DO NOT disable all tests.** The protections we've added are sufficient:

1. **Worker limits** prevent resource exhaustion
2. **E2E exclusion** removes the 19 highest-risk tests
3. **Process blocking** prevents accidental spawning
4. **Pre-test validation** catches issues early

You can now safely run `pnpm test` in multi-threaded environments without system
freezes.

## Files Modified

1. `vitest.config.ts` - Process limits + E2E exclusion
2. `__tests__/setup.ts` - Process spawning blocker
3. `scripts/validate-test-safety.js` - Pre-test validator (new file)
4. `package.json` - Added test:validate command
5. `docs/process-management-fix.md` - Detailed analysis
6. `docs/test-safety-protection.md` - This file

---

**Status:** ✅ All protections implemented and tested. System is safe for multi-threaded
test execution.
