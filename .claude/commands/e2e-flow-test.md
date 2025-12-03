---
description: Autonomous browser testing of the complete user flow with Playwright
argument-hint: "[auth-method] (optional: 'login' or 'signup', defaults to login)"
---

# E2E Flow Test Command

Verify the complete user journey through the Growth Mastery AI application by acting as
a real user navigating the funnel builder flow.

## Arguments

`/e2e-flow-test`

No arguments required. The test uses Playwright to navigate through the application as
an autonomous agent.

## Mission

Test the complete straight-line user journey through the application by acting as a
typical user persona. Use Playwright via MCP to interact with the browser, make
intelligent decisions based on what you see, and verify the core flow works end-to-end.

The goal is to validate that a real user can successfully:

- Sign up or log in
- Create a new funnel project
- Complete the intake process (Step 1)
- Navigate through key funnel builder steps
- Verify the funnel is being built correctly

## Typical User Persona

<persona>
Name: Sarah Chen
Role: Executive coach launching an online masterclass
Goal: Create a pitch video funnel to sell her "Leadership Transformation" program
Background: Has business information in various formats (website, existing presentations, documents)
Technical skill: Moderate - comfortable with web apps but not a developer
Expectations: Intuitive flow, clear guidance, AI assistance
</persona>

## Test Strategy

<strategy>
Act as Sarah navigating the application for the first time. Make decisions a real user would make. Observe what the UI presents and respond naturally. Report on both successful flows and any blockers encountered.
</strategy>

## Phase 1: Environment Setup

<setup>
Before starting browser automation, verify Playwright is available and the application is running.

**Check Playwright MCP availability:**

- Verify you can access Playwright browser automation
- If Playwright MCP is not available, inform the user they need to install and configure
  it
- Playwright MCP server: https://github.com/executeautomation/mcp-playwright

**Verify application is running:**

- Check if the application is accessible at http://localhost:3000
- If not running, instruct user to start the dev server: `pnpm dev`
- Wait for confirmation before proceeding </setup>

## Phase 2: Authentication Flow

<authentication>
**Determine authentication approach:**

First, check if there's an existing authenticated session by navigating to
http://localhost:3000/funnel-builder:

- If redirected to login → Proceed with login flow
- If funnel builder loads → Already authenticated, skip to Phase 3

**Login flow (if needed):**

Navigate to http://localhost:3000/login

Observe the login form:

- Identify email and password input fields
- Check for any test credentials in environment or documentation
- If no test account exists, ask user for test credentials
- Fill the form with provided credentials
- Click the sign in button
- Wait for redirect to funnel builder dashboard
- Verify successful authentication by checking URL contains `/funnel-builder`

**Fallback - Signup flow:**

If user prefers creating a new account or no test account exists:

- Navigate to http://localhost:3000/signup
- Observe the signup form fields (name, referral code, email, password, confirm
  password)
- Generate unique test email: `test-e2e-${timestamp}@example.com`
- Ask user for a valid referral code (required for signup)
- Fill all required fields
- Submit the form
- Verify redirect to funnel builder
- Note: New accounts start with no existing funnels

**Validation:**

- Confirm on funnel builder dashboard (URL: `/funnel-builder`)
- Page should show "Create Your AI-Powered Magnetic Masterclass Funnel" heading
- Quick stats cards should be visible (Total Funnels, Active Funnels, Draft Funnels)
  </authentication>

## Phase 3: Funnel Creation

<funnel-creation>
**Check for existing funnels:**

Observe the funnel builder dashboard:

- Look for existing funnel project cards
- If existing funnels are present, ask user whether to:
  - Create a new test funnel
  - Use an existing funnel for testing

**Create new funnel:**

Click "Create New Funnel" button (or the + card if funnels exist)

Verify navigation to `/funnel-builder/create`

Observe the funnel creation form:

- Single input field for "Funnel Name"
- Preview of what happens next (4 main sections, 14 guided steps)

Enter funnel name based on persona:

- Example: "Leadership Transformation Masterclass"
- Or generate contextual name: "[Topic] Masterclass Program"

Click "Create Funnel" button

Wait for redirect to Step 1

**Validation:**

- URL should match pattern: `/funnel-builder/{projectId}/step/1`
- Page should show "Intake" step title
- Step progress indicator should show "Step 1"
- Multiple intake method options should be visible </funnel-creation>

## Phase 4: Intake Process (Step 1)

<intake-process>
**Understand available intake methods:**

Observe the intake method selector. Available options typically include:

- Voice call (AI intake conversation)
- Document upload (PDF, DOCX, etc.)
- Paste content (direct text input)
- Web scraping (extract from URL)
- Google Drive (may show "coming soon")

**Choose appropriate intake method:**

Select "Paste content" method (most reliable for automated testing):

- This method allows direct text input
- No file upload complexity
- No external service dependencies
- Predictable behavior

**Complete paste intake:**

Click the "Paste content" option

Observe the paste intake interface:

- Text area for pasting business information
- Submit button
- Instructions for what to include

Provide realistic business information as Sarah:

Example content structure:

```
Business Name: Leadership Transformation Academy

About: We help mid-career executives transition into senior leadership roles through our proven 12-week transformation program.

Target Audience: Mid-career professionals (5-15 years experience) looking to break into executive leadership. Primary demographics: 35-50 years old, corporate environment, facing career plateau.

Offer: Leadership Transformation Masterclass - 12-week program combining live group coaching, self-paced modules, and 1-on-1 executive mentoring.

Pricing: $3,997 for the complete program. Payment plan available: 3 payments of $1,397.

Key Benefits:
- Master executive presence and communication
- Develop strategic thinking frameworks
- Build powerful professional networks
- Navigate organizational politics effectively
- Lead high-performing teams

Pain Points We Solve:
- Feeling stuck at mid-management level
- Passed over for promotions
- Lack of executive-level skills
- Limited leadership training in current role
- Unclear path to C-suite

Brand Colors: Professional blue (#2563eb), Confident gold (#f59e0b), Clean white (#ffffff)

Call to Action: Enroll in the next cohort starting March 15th
```

Fill the text area with business information

Click submit button

Wait for processing to complete

**Validation:**

- Success message should appear
- Intake session should be added to "Your Intake Sessions" list
- Session card should show:
  - Status indicator (green dot for completed)
  - Method badge ("Pasted Content")
  - Data availability badges (if brand data or pricing extracted)
  - Clickable to view details
- "Next" or "Continue" button should become enabled
- The extracted data can be verified by clicking the session card

**Document findings:**

- Record whether intake data was successfully extracted
- Note any brand data or pricing information detected
- Check if the session appears correctly in the list
- Verify the UI updates properly after submission </intake-process>

## Phase 5: Navigation Through Key Steps

<step-navigation>
**Navigate to Step 2 (Offer Definition):**

Click "Continue" or "Define Offer" button

Verify navigation to `/funnel-builder/{projectId}/step/2`

Observe Step 2 interface:

- Should show step title and description
- May show form fields for offer details
- Check if AI pre-filled any information from intake
- Note the step progress indicator (should show Step 2)

**Document Step 2 state:**

- What fields are present
- Which fields are pre-populated
- Whether the step appears functional
- Any validation or error messages

**Test step navigation controls:**

Locate navigation buttons:

- "Previous" or "Back" button (should go to Step 1)
- "Continue" or "Next" button (may be disabled until step is complete)

Test backward navigation:

- Click "Previous" to return to Step 1
- Verify intake session is still present
- No data should be lost

Return to Step 2:

- Click "Continue" from Step 1
- Verify you're back on Step 2

**Explore step sidebar navigation (if present):**

Look for step list or progress sidebar:

- Should show all 14 steps
- Completed steps should be marked
- Current step should be highlighted
- May show step categories/sections

Attempt to jump to Step 3:

- Click on Step 3 in sidebar (if clickable)
- Or use "Continue" button if Step 2 allows progression
- Note whether the application requires steps to be completed in order

**Sample key steps to verify:**

Step 3: Deck Structure

- Navigate to Step 3
- Observe presentation structure interface
- Check if 55-slide structure is mentioned
- Note any AI-generated content

Step 5: Enrollment Page

- Navigate to Step 5 (if accessible)
- Look for page builder or template selection
- Check for preview functionality

**Validation:**

- All step transitions should work smoothly
- URLs should update correctly
- Progress indicators should be accurate
- No JavaScript errors in console
- Data should persist across step navigation
- Back/forward navigation should work without data loss </step-navigation>

## Phase 6: Data Persistence Verification

<data-verification>
**Test data persistence across sessions:**

Note the current project ID from URL: `/funnel-builder/{projectId}/step/X`

Navigate away from the funnel:

- Click logo or "Back to Funnels" link
- Should return to funnel builder dashboard

Verify project appears in funnel list:

- Find the created funnel project card
- Name should match what was entered
- Status should show "draft"
- Click "Continue" button on the project card

Verify return to correct state:

- Should navigate back to the funnel
- May return to last visited step or Step 1
- Intake session should still be present
- Any completed steps should remain completed

**Test browser refresh:**

While on a funnel step, refresh the page

After refresh, verify:

- User remains authenticated
- Still on the same step
- Project data is intact
- Intake sessions are still visible
- No data loss occurred

**Validation:**

- Project data persists correctly
- Navigation state is maintained
- No authentication issues after refresh
- Database operations are working </data-verification>

## Phase 7: Reporting

<reporting>
Generate a comprehensive test report documenting the complete user journey.

**Report Structure:**

```markdown
# E2E Flow Test Report

Executed: {timestamp} User Persona: Sarah Chen - Executive Coach

## Test Summary

- Status: ✅ PASSED | ⚠️ PARTIAL | ❌ FAILED
- Total Steps Tested: X
- Successful: X
- Blocked: X
- Issues Found: X

## Authentication Flow

✅ Status: [PASSED/FAILED]

- Method used: [Login/Signup]
- Time to authenticate: Xs
- Landing page: /funnel-builder
- Notes: [Any observations]

## Funnel Creation Flow

✅ Status: [PASSED/FAILED]

- Funnel created: "[Funnel Name]"
- Project ID: {projectId}
- Time to create: Xs
- Notes: [Any observations]

## Intake Process

✅ Status: [PASSED/FAILED]

- Method used: [Voice/Upload/Paste/Scrape]
- Data extracted successfully: [Yes/No]
- Brand data detected: [Yes/No]
- Pricing detected: [Yes/No]
- Session appears in list: [Yes/No]
- Time to complete: Xs
- Notes: [Any observations]

## Step Navigation

✅ Status: [PASSED/FAILED]

- Steps accessible: [List of steps tested]
- Step 2 (Offer): [Status and notes]
- Step 3 (Deck): [Status and notes]
- Step 5 (Enrollment): [Status and notes]
- Navigation controls working: [Yes/No]
- Progress indicators accurate: [Yes/No]
- Notes: [Any observations]

## Data Persistence

✅ Status: [PASSED/FAILED]

- Project appears in dashboard: [Yes/No]
- Data persists after navigation: [Yes/No]
- Data persists after refresh: [Yes/No]
- Notes: [Any observations]

## Issues Discovered

[List any bugs, UX issues, or blockers encountered]

1. **[Issue Title]**
   - Location: [Page/Step]
   - Severity: [Critical/High/Medium/Low]
   - Description: [What happened]
   - Expected: [What should happen]
   - Steps to reproduce: [How to recreate]

## User Experience Observations

[Notes on flow, clarity, ease of use from Sarah's perspective]

- [Observation 1]
- [Observation 2]

## Performance Notes

- Page load times: [Fast/Moderate/Slow]
- UI responsiveness: [Smooth/Acceptable/Laggy]
- Any console errors: [Yes/No - list if yes]

## Recommendations

[Suggestions for improvements based on testing]

1. [Recommendation 1]
2. [Recommendation 2]

## Conclusion

[Overall assessment of the straight-line user flow]

The core user journey from signup → funnel creation → intake → step navigation is
[functional/partially functional/blocked].

[Any final thoughts or critical blockers]
```

</reporting>

## Error Handling

<error-handling>
**If authentication fails:**
- Document the exact error message shown
- Check network tab for API errors
- Verify credentials are correct
- Try alternative auth method (signup vs login)
- Report the blocker to user with reproduction steps

**If funnel creation fails:**

- Capture error message
- Check browser console for errors
- Verify user has permission to create funnels
- Document the blocker with steps to reproduce

**If intake process fails:**

- Try alternative intake method
- Document which methods work and which don't
- Capture any error messages
- Note if issue is method-specific or systemic

**If navigation is blocked:**

- Document which steps are accessible
- Note if steps require completion before progression
- Check for any error messages or disabled states
- Report navigation blockers

**General error protocol:**

- Always capture screenshots of errors
- Check browser console for JavaScript errors
- Note the exact URL when error occurred
- Document steps to reproduce
- Continue testing other flows if one is blocked
- Provide complete error context in final report </error-handling>

## Best Practices

<best-practices>
**Act like a real user:**
- Read page instructions and follow them
- Don't rush through forms - observe what's presented
- Make decisions based on what you see, not assumptions
- Notice UI feedback (loading states, success messages, errors)

**Be thorough but efficient:**

- Test the critical path completely
- Don't test every edge case - focus on happy path
- Document issues but continue testing
- Goal is to verify the straight-line flow works

**Observe and report:**

- Note both what works and what doesn't
- Capture UX observations from persona's perspective
- Document any confusion or unclear instructions
- Report performance issues or slow operations

**Maintain test data:**

- Use consistent test naming for easy cleanup
- Note the project IDs created during testing
- Don't delete test data until test is complete
- Helps with debugging if issues arise </best-practices>

## Success Criteria

<success-criteria>
The test is considered successful if Sarah can:

✅ **Complete authentication**

- Log in or sign up without errors
- Land on funnel builder dashboard
- See appropriate welcome state

✅ **Create a funnel project**

- Enter funnel name
- Submit form successfully
- Navigate to Step 1

✅ **Complete intake**

- Choose an intake method
- Submit business information
- See intake session in list
- "Continue" button becomes enabled

✅ **Navigate through steps**

- Access Step 2 and observe its interface
- Navigate backward and forward
- Reach at least Step 3
- No data loss during navigation

✅ **Persist data**

- Project appears in dashboard
- Can return to project
- Data survives browser refresh
- Intake sessions remain accessible

**Critical blockers that would fail the test:**

- Cannot authenticate at all
- Cannot create a funnel project
- Cannot complete any intake method
- Cannot progress past Step 1
- Data is lost during navigation or refresh </success-criteria>

## Completion Checklist

Before finishing the test:

- [ ] Authentication flow verified
- [ ] Funnel creation tested
- [ ] At least one intake method completed successfully
- [ ] Step navigation tested (Steps 1-3 minimum)
- [ ] Data persistence confirmed
- [ ] All issues documented with reproduction steps
- [ ] Screenshots captured for any errors
- [ ] Final report generated
- [ ] Test artifacts noted for cleanup

## Notes for User

After the test completes:

**Test cleanup:** The test creates real database records. Test funnels can be deleted
from the funnel builder dashboard.

**Playwright MCP requirement:** This command requires the Playwright MCP server to be
installed and configured in your Claude Desktop or MCP client configuration.

**Local development server:** The application must be running locally at
http://localhost:3000 before starting the test.

**Test credentials:** You may need to provide valid test account credentials or a
referral code for signup.
