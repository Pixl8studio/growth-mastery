# Process Management Fix - System Freeze Issue

## Problem

System was freezing with TONS of node processes spawning uncontrollably after adding new
tests. This created a cascading effect where tests spawned subprocesses that spawned
more subprocesses, overwhelming the system.

## Root Cause

1. **No worker limits in vitest** - Unlimited parallel test workers being spawned
2. **No concurrency limits** - All tests running simultaneously
3. **No timeouts** - Hung processes never timing out
4. **Orphaned agent-listener processes** - Background processes from swarm testing not
   being cleaned up

## Solution Applied

### 1. Vitest Configuration Limits (`vitest.config.ts`)

Added critical process management settings:

```typescript
test: {
    // Prevent cascading process spawning
    maxWorkers: 4,           // Max 4 parallel test workers
    minWorkers: 1,           // At least 1 worker
    maxConcurrency: 4,       // Max 4 tests running concurrently
    fileParallelism: true,   // Run test files in parallel

    // Timeout protection
    testTimeout: 10000,      // 10 second test timeout
    hookTimeout: 10000,      // 10 second hook timeout
    teardownTimeout: 5000,   // 5 second teardown timeout
}
```

### 2. Killed Orphaned Processes

- Killed 16+ orphaned agent-listener.ts processes
- Killed background swarm orchestrator processes
- Reduced node process count from 22 to 6

## Impact

**Before:**

- System freezing
- 22+ node processes
- Unlimited test workers spawning
- Cascading subprocess creation

**After:**

- System responsive
- 6 node processes (only essential ones)
- Maximum 4 test workers
- Controlled concurrency with timeouts

## Prevention

### For Future Test Writing

1. **Avoid spawning processes in tests** unless absolutely necessary
2. **Mock subprocess calls** instead of actually spawning them
3. **Use vi.fn() mocks** for any functions that would spawn processes
4. **Clean up processes in afterEach/afterAll** if you must spawn them

### Test Examples to Avoid

❌ **BAD** - Spawns real processes:

```typescript
it("should run command", async () => {
  const result = await exec("npm run build"); // Spawns real process!
});
```

✅ **GOOD** - Mocks the spawn:

```typescript
vi.mock("child_process", () => ({
  exec: vi.fn((cmd, cb) => cb(null, { stdout: "mocked" })),
}));

it("should run command", async () => {
  const result = await exec("npm run build"); // Uses mock, no process!
});
```

### Monitoring

Check node process count periodically:

```bash
ps aux | grep -i node | wc -l
```

If count > 10, investigate:

```bash
ps aux | grep -i node
```

Kill specific problematic processes:

```bash
pkill -f "pattern-of-process"
```

## Test Analysis

### Current Test Inventory

- **Total test files:** 420
- **Integration tests:** ~50+ (in `__tests__/integration/`)
- **E2E tests:** ~19 (in `__tests__/e2e/`)
- **Unit tests:** ~350+ (in `__tests__/unit/`)

### Tests with Process Spawning Risk

**Good news:** After scanning all 420 test files, **NO tests directly spawn processes**.
The validation script confirmed:

- ✅ No direct `child_process` imports
- ✅ No `spawn()`, `exec()`, `fork()` calls
- ✅ No worker thread creation

### Why the System Was Still Freezing

The issue wasn't individual tests spawning processes - it was:

1. **420 tests × unlimited workers = cascading resource exhaustion**
2. **E2E tests with Playwright** - Each E2E test spawns browser processes
3. **Integration tests** - Tests hitting real APIs/databases may spawn background
   workers
4. **No concurrency limits** - All 420 tests trying to run simultaneously

### Risk Assessment by Test Type

| Test Type         | Count | Process Risk                    | Impact of Disabling                     |
| ----------------- | ----- | ------------------------------- | --------------------------------------- |
| Unit tests        | ~350  | LOW - Pure JS/TS logic          | ⚠️ HIGH - Lose code quality checks      |
| Integration tests | ~50   | MEDIUM - May spawn API workers  | ⚠️ MEDIUM - Lose integration validation |
| E2E tests         | ~19   | HIGH - Spawns browser processes | ✅ LOW - Can test manually              |

### Recommendation: Selective Disabling

**DON'T disable all tests** - You'd lose critical code quality protection.

**INSTEAD, disable only high-risk tests:**

1. **Disable E2E tests in multi-threaded environments** (19 files)
   - These spawn browser processes (Playwright)
   - Test manually or in CI only

2. **Keep unit tests enabled** (350 files)
   - No process spawning
   - Fast, safe, valuable feedback

3. **Keep integration tests with limits** (50 files)
   - Run with maxWorkers: 2
   - Critical for API validation

## Files Modified

- `vitest.config.ts` - Added worker limits, concurrency limits, timeouts
- `__tests__/setup.ts` - Added process spawning protection layer
- `scripts/validate-test-safety.js` - Pre-test validation script
- `package.json` - Added test:validate command, automatic validation before tests

## Configuration Details

| Setting         | Value   | Purpose                              |
| --------------- | ------- | ------------------------------------ |
| maxWorkers      | 4       | Limit parallel test worker processes |
| minWorkers      | 1       | Ensure at least one worker           |
| maxConcurrency  | 4       | Limit concurrent test execution      |
| testTimeout     | 10000ms | Kill hung tests after 10 seconds     |
| hookTimeout     | 10000ms | Kill hung hooks after 10 seconds     |
| teardownTimeout | 5000ms  | Force teardown after 5 seconds       |

## Related Issues

- Tests spawning bash subprocesses via mocked functions
- Agent listener processes from swarm testing
- Background orchestrator processes not being cleaned up
- No process lifecycle management in test runs

## Recommendations

1. **Always set worker limits** in test configurations
2. **Mock external processes** aggressively
3. **Add cleanup hooks** for any spawned processes
4. **Monitor process counts** during test runs
5. **Use timeouts** to prevent hung tests
6. **Kill background processes** after test sessions

---

**Summary:** System freeze caused by unlimited test worker spawning. Fixed by adding
strict limits (4 workers max) and timeouts (10s) to vitest config, plus killing 16+
orphaned processes.
