---
description: Comprehensively test a service integration end-to-end
---

# Test Integration Command

Thoroughly test an existing service integration to verify all operations work correctly,
identify bugs, and validate the implementation.

## Arguments

`/test-integration <service-name>`

Example: `/test-integration clickup` or `/test-integration gmail`

## Mission

You're testing a service integration end-to-end. This is a **thorough verification
process**: explore all operations, test multi-workspace/multi-account scenarios, verify
edge cases, identify bugs, fix issues, and add appropriate tests.

The goal is to ensure the integration works flawlessly for real users and to catch any
issues before they impact production.

## Testing Methodology

### Phase 1: Discovery & Documentation

**1. Understand What's Available**

Start by examining the integration to understand its full capabilities:

```typescript
// Get the complete operation list
mcp_mcp-hubby_{service}({ action: "describe", params: {} })
```

**Document:**

- Total number of operations available
- Categories of operations (read, write, search, etc.)
- Any special features (raw_api, webhooks, etc.)

**2. Review the Adapter Code**

Read the adapter implementation to understand:

- Authentication method (OAuth via Nango, API key, hybrid)
- How operations are structured
- Error handling patterns
- Any known limitations or TODOs

```typescript
// Read the adapter
read_file(`lib/adapters/{service}.ts`);
```

### Phase 2: Systematic Operation Testing

**3. Test Core Read Operations**

Test all read/list operations to verify data retrieval works:

```typescript
// Example pattern for list operations
mcp_mcp-hubby_{service}({
    action: "list_{resource}",
    params: { /* minimal required params */ }
})

// Example pattern for get operations
mcp_mcp-hubby_{service}({
    action: "get_{resource}",
    params: { id: "test_id" }
})
```

**For each operation, verify:**

- ✅ Returns expected data structure
- ✅ Handles empty results gracefully
- ✅ Includes all documented fields
- ✅ Error messages are user-friendly

**4. Test Write Operations**

Test create/update/delete operations:

```typescript
// Create a test resource
const createResult = mcp_mcp-hubby_{service}({
    action: "create_{resource}",
    params: { /* test data */ }
})

// Update the resource
const updateResult = mcp_mcp-hubby_{service}({
    action: "update_{resource}",
    params: { id: createResult.id, /* changes */ }
})

// Delete the resource (cleanup)
mcp_mcp-hubby_{service}({
    action: "delete_{resource}",
    params: { id: createResult.id }
})
```

**Important:** Always clean up test resources to avoid cluttering the user's account!

**5. Test Search & Filter Operations**

Test operations with various parameters:

```typescript
// Test filtering
mcp_mcp-hubby_{service}({
    action: "search_{resource}",
    params: {
        query: "test",
        filters: { status: "active" },
        limit: 10
    }
})

// Test sorting
mcp_mcp-hubby_{service}({
    action: "list_{resource}",
    params: {
        sort_by: "created_at",
        order: "desc"
    }
})
```

**Common issues to watch for:**

- Array parameters not encoded correctly
- Date parameters in wrong format
- Pagination not working
- Filter combinations causing errors

**6. Test Edge Cases**

Deliberately test boundary conditions:

```typescript
// Empty/missing required parameters
mcp_mcp-hubby_{service}({
    action: "get_{resource}",
    params: {} // Should error gracefully
})

// Invalid IDs
mcp_mcp-hubby_{service}({
    action: "get_{resource}",
    params: { id: "nonexistent_id" }
})

// Very long strings
mcp_mcp-hubby_{service}({
    action: "create_{resource}",
    params: { name: "x".repeat(1000) }
})
```

**7. Test Raw API Access (if available)**

If the service has a `raw_api` operation, test it:

```typescript
mcp_mcp-hubby_{service}({
    action: "raw_api",
    params: {
        endpoint: "/api/v1/endpoint",
        method: "GET"
    }
})
```

Verify:

- ✅ Returns raw API response
- ✅ Works for different HTTP methods
- ✅ Validates endpoint format
- ✅ Error handling for API failures

### Phase 3: Advanced Scenarios

**8. Test Multi-Workspace/Multi-Account Support**

If the service supports workspaces, teams, or organizations:

```typescript
// List all workspaces/teams
const workspaces = mcp_mcp-hubby_{service}({
    action: "get_workspaces", // or similar
    params: {}
})

// Test cross-workspace queries
workspaces.forEach(workspace => {
    mcp_mcp-hubby_{service}({
        action: "list_{resource}",
        params: { workspace_id: workspace.id }
    })
})
```

**Verify:**

- ✅ Can discover all accessible workspaces
- ✅ Can query resources in specific workspaces
- ✅ Can query across all workspaces (if supported)
- ✅ Proper isolation between workspaces

**9. Test Complex Workflows**

Test realistic multi-step workflows:

```typescript
// Example: Create → Comment → Update → Complete
const task = await createTask(...)
await addComment(task.id, "Starting work")
await updateTask(task.id, { status: "in_progress" })
await updateTask(task.id, { status: "completed" })
await deleteTask(task.id) // cleanup
```

**10. Test Array Parameters & Special Characters**

Array parameters are a common source of bugs:

```typescript
// Test array parameters
mcp_mcp-hubby_{service}({
    action: "list_{resource}",
    params: {
        statuses: ["active", "pending"],
        tags: ["urgent", "bug fix"],
        assignees: ["123", "456"]
    }
})

// Test special characters in strings
mcp_mcp-hubby_{service}({
    action: "create_{resource}",
    params: {
        name: "Test with emoji 🚀 and symbols <>&\"",
        description: "Multi\nline\ntext"
    }
})
```

### Phase 4: Bug Identification & Fixing

**11. Document All Bugs Found**

For each bug discovered, document:

- **Location**: File and line number(s)
- **Problem**: What's broken and why
- **Symptoms**: How it manifests (error messages, wrong data, etc.)
- **Root Cause**: The actual code issue
- **Impact**: Which operations are affected

**Example documentation:**

```
Bug #1: Comment Response Parsing Error
Location: lib/adapters/clickup.ts:1054-1063
Problem: Expected response.user.username but API returns different structure
Symptoms: "Cannot read properties of undefined (reading 'username')"
Root Cause: Response type doesn't match actual API response format
Impact: add_comment operation always fails
```

**12. Fix Bugs Systematically**

For each bug:

1. **Read the problematic code section**
2. **Understand the actual API response** (from testing or docs)
3. **Fix the code** to match reality
4. **Update type definitions** if needed
5. **Check for similar patterns** elsewhere in the code

**Example fix pattern:**

```typescript
// Before (incorrect assumption)
const response = await httpClient.post(url, options).json<{
  user: { username: string };
}>();
return { author: response.user.username };

// After (matches actual API)
const response = await httpClient.post(url, options).json<{
  id: string | number;
  date: number;
}>();
return {
  comment_id: String(response.id),
  date: String(response.date),
};
```

**13. Add Tests for Bug Fixes**

For each bug fixed, add or update tests:

```typescript
describe("Bug Fix: [description]", () => {
    it("handles [scenario that was broken]", async () => {
        // Setup mocks with REAL API response structure
        vi.mocked(httpClient.post).mockReturnValue({
            json: vi.fn().mockResolvedValue({
                // Use actual API response format
                id: 90130179350969,
                date: 1760541755199,
                comment_text: "Test"
            })
        });

        const result = await adapter.execute(...);

        expect(result.isError).toBe(false);
        expect(result.content[0].text).toContain("expected data");
    });
});
```

**14. Verify All Tests Pass**

After fixes:

```bash
# Run adapter-specific tests
pnpm test __tests__/lib/adapters/{service}.test.ts

# Run all tests to check for regressions
pnpm test

# Check linting
pnpm lint

# Verify types
pnpm type-check
```

### Phase 5: Summary & Documentation

**15. Create Testing Summary**

Document your findings in a comprehensive report:

```markdown
## 🎯 {Service} Integration Test Results

### ✅ What Works Perfectly:

1. **Multi-Workspace Support** 🌟
   - Operation: get_workspaces - Retrieved X workspaces
   - Cross-workspace queries work correctly
   - Proper isolation maintained

2. **Core Operations** ✏️
   - list\_{resource}: Returns Y items, proper pagination
   - get\_{resource}: Full details with all fields
   - create\_{resource}: Successfully creates with all parameters
   - update\_{resource}: Updates work, returns updated data
   - delete\_{resource}: Clean deletion

3. **Advanced Features** 🔧
   - raw_api: Works for all HTTP methods
   - Filtering: Status, date ranges, custom fields work
   - Comments: Read works, X comments found

### ⚠️ Issues Found & Fixed:

1. **Bug #1: [Description]**
   - Error: [Error message]
   - Root Cause: [Explanation]
   - Fix: [What was changed]
   - Test Added: [Test description]

2. **Bug #2: [Description]**
   - ...

### 💡 Recommendations:

1. [Suggested improvement]
2. [Feature to consider adding]
3. [Documentation update needed]

### 🎭 Use Cases Tested:

- ✅ Single workspace operations
- ✅ Multi-workspace operations
- ✅ Creating → Updating → Deleting resources
- ✅ Search with complex filters
- ✅ Edge cases and error handling

### 📊 Test Coverage:

- Operations tested: X/Y (Z%)
- All core CRUD operations verified
- Multi-workspace scenarios validated
- Error handling confirmed
```

**16. Update Documentation if Needed**

If you found gaps or errors in documentation:

- Update integration page FAQs
- Clarify operation parameters
- Add examples for complex operations
- Document any discovered limitations

## Common Bug Patterns

### Array Parameter Encoding

**Problem:** Using `JSON.stringify()` for array query parameters

```typescript
// ❌ Wrong - creates URL-encoded JSON string
if (statuses) searchParams.statuses = JSON.stringify(statuses);
// Result: ?statuses=%5B%22active%22%5D (breaks most APIs)

// ✅ Correct - use array format with [] suffix
if (statuses && statuses.length > 0) {
  searchParams["statuses[]"] = statuses;
}
// Result: ?statuses[]=active&statuses[]=pending
```

**Fix pattern:**

1. Find all `JSON.stringify()` calls for arrays
2. Replace with proper array parameter format
3. Test with multiple values
4. Add test verifying correct parameter format

### Response Type Mismatches

**Problem:** Type definitions don't match actual API responses

```typescript
// ❌ Wrong - assumes nested structure
.json<{ user: { username: string } }>();
// Actual API returns: { id: 123, date: 1234567890 }

// ✅ Correct - matches actual response
.json<{ id: string | number; date: number }>();
```

**Fix pattern:**

1. Capture actual API response during testing
2. Update type definition to match
3. Handle optional fields safely
4. Update test mocks with real structure

### Missing Error Handling

**Problem:** Errors not caught or poorly formatted

```typescript
// ❌ Wrong - raw error object
catch (error) {
    return { error };  // Returns "[object Object]"
}

// ✅ Correct - user-friendly message
catch (error) {
    console.error(`Failed to {action}:`, {
        error: error instanceof Error ? error.message : String(error),
        params
    });
    return this.createErrorResponse(
        `Failed to {action}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
}
```

## Quality Checklist

Before completing the test:

- [ ] All documented operations tested
- [ ] Multi-workspace scenarios verified (if applicable)
- [ ] Create → Update → Delete workflow tested
- [ ] Edge cases and error handling validated
- [ ] All bugs documented with root causes
- [ ] All bugs fixed in code
- [ ] Tests added/updated for bug fixes
- [ ] All tests passing locally
- [ ] Linting and type checks passing
- [ ] Testing summary documented
- [ ] Cleanup: All test resources deleted

## Deployment Note

If you're testing locally but the MCP server runs on production:

- Code fixes apply to local codebase only
- Tests verify the fix works
- Changes must be deployed before MCP server reflects fixes
- Document that fixes are "ready for deployment"

## Example Usage

```bash
# User runs command
/test-integration clickup

# AI responds:
"Let me comprehensively test the ClickUp integration! 🚀
I'll test all operations, explore multi-workspace support,
create/update/delete test resources, and identify any bugs.
This will take a few minutes..."

# AI proceeds through all phases
# Provides detailed summary at the end
```

## Success Criteria

A successful integration test includes:

1. **Completeness**: All operations tested
2. **Depth**: Multi-step workflows validated
3. **Bug Fixes**: Issues found and resolved
4. **Test Coverage**: Tests added for fixes
5. **Documentation**: Clear summary of findings
6. **Cleanup**: No test data left in user's account

The integration should be production-ready after this process! ✨
