# E2E Flow Test Command - Usage Guide

The `/e2e-flow-test` command enables autonomous browser-based testing of the complete
Growth Mastery AI user journey using Playwright MCP.

## Overview

Unlike traditional scripted E2E tests, this command leverages an LLM agent (Claude) to
intelligently navigate through your application as a real user would. The agent makes
decisions based on what it observes in the UI, adapts to changes, and generates
comprehensive test reports.

## What Makes This Different

**Traditional E2E Tests:**

- Hard-coded selectors and paths
- Break when UI changes
- Require constant maintenance
- Test exactly what you tell them to test

**Autonomous LLM-Based Testing:**

- Adapts to UI changes like a human would
- Makes intelligent decisions based on context
- Discovers unexpected issues
- Tests the actual user experience
- Self-documents findings in natural language

## Prerequisites

### 1. Playwright MCP Server

The command requires Playwright MCP to be installed and configured. See the
[Playwright MCP Setup Guide](./.playwright-mcp-setup.md) for detailed instructions.

**Quick check:**

```bash
> /mcp
```

You should see `playwright` listed as a connected server.

### 2. Running Application

Your development server must be running before executing the test:

```bash
pnpm dev
```

The application should be accessible at `http://localhost:3000`.

### 3. Test Credentials

You'll need either:

- **Existing test account** credentials (email + password)
- **Valid referral code** for creating a new test account

## Basic Usage

### Run with Default Options (Login Flow)

```bash
> /e2e-flow-test
```

The command will:

1. Verify Playwright MCP is available
2. Navigate to the application
3. Attempt to log in with provided credentials
4. Create a test funnel
5. Complete the intake process
6. Navigate through key steps
7. Verify data persistence
8. Generate a comprehensive report

### Specify Signup Flow

```bash
> /e2e-flow-test signup
```

Forces the test to use the signup flow instead of login. Useful for testing new user
onboarding.

## Test Flow

The autonomous agent follows this user journey:

### Phase 1: Environment Setup

- Verifies Playwright MCP availability
- Confirms application is running at http://localhost:3000
- Prepares for browser automation

### Phase 2: Authentication

- **Login path:** Uses existing test credentials
- **Signup path:** Creates new test account with unique email
- Validates successful authentication
- Confirms landing on funnel builder dashboard

### Phase 3: Funnel Creation

- Checks for existing funnels
- Creates new test funnel with contextual name
- Validates navigation to Step 1 (Intake)

### Phase 4: Intake Process

- Selects appropriate intake method (typically "Paste content")
- Submits realistic business information as the test persona
- Verifies intake session is created
- Checks for data extraction (brand data, pricing, etc.)

### Phase 5: Step Navigation

- Navigates to Step 2 (Offer Definition)
- Tests forward and backward navigation
- Explores additional key steps (Step 3, Step 5, etc.)
- Validates progress indicators

### Phase 6: Data Persistence

- Returns to funnel builder dashboard
- Verifies project appears in list
- Tests browser refresh
- Confirms no data loss

### Phase 7: Reporting

- Generates comprehensive test report
- Documents successes and failures
- Provides reproduction steps for issues
- Includes UX observations and recommendations

## Test Persona

The agent acts as **Sarah Chen**, an executive coach:

- Launching "Leadership Transformation Masterclass"
- Moderate technical skills
- Expects intuitive flow and clear guidance
- Has business information from various sources

This persona grounds the test in realistic user behavior and expectations.

## Interpreting Results

### Success Report Example

```markdown
# E2E Flow Test Report

Status: ✅ PASSED

## Test Summary

- Total Steps Tested: 6
- Successful: 6
- Blocked: 0
- Issues Found: 0

## Authentication Flow

✅ Status: PASSED

- Method: Login
- Time: 2.3s
- Landing page: /funnel-builder

## Funnel Creation Flow

✅ Status: PASSED

- Funnel created: "Leadership Transformation Masterclass"
- Project ID: abc123-def456
- Time: 1.8s

... (additional sections)

## Conclusion

The core user journey is fully functional.
```

### Partial Success Example

```markdown
# E2E Flow Test Report

Status: ⚠️ PARTIAL

## Issues Discovered

1. **Step 3 Navigation Blocked**
   - Location: /funnel-builder/{id}/step/3
   - Severity: High
   - Description: "Continue" button remains disabled
   - Expected: Should enable after Step 2 completion
   - Steps to reproduce:
     1. Complete intake
     2. Fill Step 2 offer fields
     3. Click Continue
     4. Observe Step 3 button still disabled
```

### Understanding Issue Severity

- **Critical**: Blocks entire user flow (cannot proceed)
- **High**: Major functionality broken (can proceed but core feature fails)
- **Medium**: UI issue or unexpected behavior (workaround available)
- **Low**: Minor cosmetic or edge case issue

## Common Issues and Solutions

### "Playwright MCP not available"

**Problem:** The command cannot access Playwright tools.

**Solution:**

1. Verify Playwright MCP is configured (see setup guide)
2. Restart Claude Desktop
3. Run `/mcp` to confirm connection

### "Application not accessible"

**Problem:** Cannot reach http://localhost:3000

**Solution:**

1. Ensure development server is running: `pnpm dev`
2. Check server started successfully (look for "ready" message)
3. Verify no other process is using port 3000

### "Authentication failed"

**Problem:** Cannot log in or sign up

**Solution:**

1. Verify test credentials are correct
2. For signup: ensure you have a valid referral code
3. Check Supabase connection is working
4. Review authentication error message in report

### "Intake process failed"

**Problem:** Cannot complete intake

**Solution:**

1. Try different intake method (paste vs upload vs voice)
2. Check network tab for API errors
3. Verify intake validation logic
4. Review exact error message from test report

### "Data not persisting"

**Problem:** Created funnel or intake doesn't appear after navigation

**Solution:**

1. Check database connection
2. Verify Supabase triggers are working
3. Review browser console for errors
4. Check authentication state persistence

## Best Practices

### When to Run E2E Tests

**Run before:**

- Major releases
- Deploying to production
- After significant refactoring
- When fixing critical bugs

**Run periodically:**

- Weekly during active development
- After merging PRs to main
- Before customer demos

### Test Data Cleanup

The test creates real database records:

- Funnel projects with generated names
- Intake sessions with test data
- User accounts (if using signup flow)

**Manual cleanup:**

1. Go to funnel builder dashboard
2. Find test funnels (look for generated names)
3. Delete via UI

**Automated cleanup (future enhancement):**

- Tag test records with `is_test: true`
- Create cleanup script
- Add to CI/CD pipeline

### Handling Flaky Results

If tests pass sometimes and fail other times:

1. **Run multiple times** to confirm flakiness
2. **Check timing issues** (slow API calls, animations)
3. **Review screenshots** from failed runs
4. **Update command timeouts** if needed
5. **Report the flakiness** as an issue

### Adapting to Application Changes

When your UI or flow changes:

**Good news:** The autonomous agent adapts automatically to many changes!

**May need updates:**

- Significant flow reorganization
- New required fields in forms
- Changed authentication requirements
- New intake methods
- Modified step progression logic

**Update the command by editing:**

```
.claude/commands/e2e-flow-test.md
```

Adjust the relevant phase instructions to match new flow.

## Advanced Usage

### Custom Test Scenarios

Create additional commands for specific flows:

```markdown
# .claude/commands/e2e-enrollment-page.md

---

## description: Test enrollment page creation and preview

Focus testing on Step 5 (Enrollment Page):

- Test page builder functionality
- Verify AI-generated content
- Check preview rendering
- Test save/publish flow
```

### Integration with CI/CD

Future enhancement: Run E2E tests in CI pipeline

**Approach:**

1. Set up headless Claude Code in CI environment
2. Configure Playwright MCP with `HEADLESS: "true"`
3. Provide test credentials via environment variables
4. Parse test report for pass/fail status
5. Fail build if critical issues found

### Parallel Testing

Run multiple test scenarios simultaneously:

```bash
# Terminal 1
> /e2e-flow-test login

# Terminal 2
> /e2e-enrollment-page

# Terminal 3
> /e2e-payment-flow
```

## Troubleshooting

### Enable Debug Mode

For more verbose logging, the agent naturally documents its steps. For even more detail:

1. Run with headed browser (`HEADLESS: "false"` in MCP config)
2. Watch the browser as the test runs
3. Screenshot any errors
4. Share screenshots with the development team

### Capture Additional Context

If a test fails, gather:

- Full test report from agent
- Browser console logs (visible in headed mode)
- Network tab (check for failed API calls)
- Application logs (`pnpm dev` terminal output)
- Database state (query relevant tables)

### Report Issues

When reporting bugs discovered by E2E tests:

**Include:**

1. Full test report (especially reproduction steps)
2. Screenshots of the issue
3. Browser console errors
4. Expected vs actual behavior
5. Impact on user flow
6. Suggested fix (if known)

**Format:**

```markdown
## Bug: [Short Description]

**Discovered by:** E2E Flow Test **Severity:** [Critical/High/Medium/Low] **Impact:**
[Description of user impact]

### Reproduction Steps

1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Behavior

[What should happen]

### Actual Behavior

[What actually happened]

### Screenshots

[Attach images]

### Additional Context

[Console errors, network failures, etc.]
```

## Future Enhancements

Planned improvements to the E2E testing system:

- [ ] Visual regression testing (screenshot comparison)
- [ ] Performance benchmarking (page load times, API latency)
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile responsive testing
- [ ] Accessibility testing (WCAG compliance)
- [ ] Load testing (concurrent users)
- [ ] Test data factory (automatic cleanup)
- [ ] CI/CD integration (automated runs)
- [ ] Slack notifications (test results)
- [ ] Test report dashboard (historical trends)

## Resources

- [Playwright MCP Setup Guide](./playwright-mcp-setup.md)
- [Command Source Code](../commands/e2e-flow-test.md)
- [Playwright Documentation](https://playwright.dev/)
- [Claude Code Documentation](https://code.claude.com/docs)
- [MCP Specification](https://modelcontextprotocol.io/)

## Contributing

To improve the E2E testing command:

1. Test the current flow and document issues
2. Propose enhancements via PR
3. Update the command file with improvements
4. Document changes in this guide
5. Share learnings with the team

## Questions?

If you encounter issues or have questions about E2E testing:

1. Review this guide and the setup guide
2. Check the command source code for implementation details
3. Ask in team chat or create an issue
4. Reach out to the maintainer

---

**Last Updated:** 2025-12-02 **Maintainer:** Growth Mastery AI Team **Version:** 1.0.0
