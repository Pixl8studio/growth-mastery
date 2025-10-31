# Real-Time Generation Progress - Test Plan

## Prerequisites

Before testing, ensure:

- [ ] Development server is running
- [ ] Database is accessible
- [ ] User is logged in
- [ ] At least one project with completed intake exists

## Test Scenarios

### 1. Basic Generation Flow ✅

**Objective:** Verify complete generation flow with progress updates

**Steps:**

1. Navigate to a project's Step 1 (Intake)
2. Ensure intake is completed
3. Click "Regenerate All Content" (or "Generate All Content" if first time)
4. Confirm in modal
5. Observe progress card appears
6. Watch progress update in real-time

**Expected Results:**

- [ ] Progress card appears immediately after confirmation
- [ ] Toast shows "Starting Generation..."
- [ ] All steps initially show pending (gray circles)
- [ ] Steps update to "in progress" (blue spinner) one at a time
- [ ] Completed steps show green checkmarks
- [ ] Progress bar advances correctly
- [ ] Current step is highlighted
- [ ] Completion toast shows after all steps done
- [ ] All steps show green checkmarks at the end

**Success Criteria:** All 7 steps complete successfully with proper status updates

---

### 2. Real-Time Progress Updates ✅

**Objective:** Verify progress updates occur in real-time

**Steps:**

1. Start generation as in Test 1
2. Watch for status changes
3. Note timing between updates

**Expected Results:**

- [ ] Progress updates approximately every 2-3 seconds
- [ ] Step status changes immediately when completed
- [ ] Progress bar animates smoothly
- [ ] No delay between step completion and status update
- [ ] Current step indicator follows generation

**Success Criteria:** Updates occur every 2-3 seconds consistently

---

### 3. Navigation to Completed Steps ✅

**Objective:** Verify user can navigate to completed steps

**Steps:**

1. Start generation
2. Wait for at least 2 steps to complete
3. Click on a completed step (should have green checkmark)
4. Observe navigation

**Expected Results:**

- [ ] Click on completed step navigates to that step
- [ ] Hover shows cursor pointer on completed steps
- [ ] Pending/in-progress steps are not clickable
- [ ] External link icon appears on hover
- [ ] Page loads with generated content

**Success Criteria:** Clicking completed steps successfully navigates to them

---

### 4. Background Generation ✅

**Objective:** Verify generation continues when navigating away

**Steps:**

1. Start generation on Step 1
2. Wait for 1-2 steps to complete
3. Manually navigate to Step 2 (or any other page)
4. Observe global tracker appears
5. Wait for more steps to complete
6. Navigate back to Step 1

**Expected Results:**

- [ ] Global tracker appears in bottom-right corner
- [ ] Generation continues in background
- [ ] Tracker updates with progress
- [ ] Completed steps remain accessible
- [ ] Progress persists when returning to Step 1
- [ ] Main progress card reflects current state

**Success Criteria:** Generation completes even after navigation

---

### 5. Global Progress Tracker ✅

**Objective:** Test floating progress tracker on non-intake pages

**Steps:**

1. Start generation on Step 1
2. Navigate to Step 2, 3, or Dashboard
3. Observe tracker in bottom-right
4. Click to expand tracker
5. Click X to dismiss
6. Refresh page

**Expected Results:**

- [ ] Tracker appears on all pages except Step 1
- [ ] Shows mini progress info when collapsed
- [ ] Expands on click to show detailed view
- [ ] Collapses on click again
- [ ] X button dismisses tracker
- [ ] Tracker reappears on page refresh if still generating
- [ ] Auto-dismisses 5 seconds after completion

**Success Criteria:** Tracker works correctly across all pages

---

### 6. Expand/Collapse Tracker ✅

**Objective:** Verify tracker expand/collapse functionality

**Steps:**

1. Have generation running on any page except Step 1
2. Observe collapsed tracker
3. Click on tracker header
4. Observe expanded view
5. Click header again

**Expected Results:**

- [ ] Collapsed view shows: status, step count, progress bar
- [ ] Click expands to show all steps
- [ ] Expanded view shows detailed step list
- [ ] Click again collapses back
- [ ] Animation is smooth
- [ ] State persists during generation

**Success Criteria:** Expand/collapse works smoothly

---

### 7. Error Handling ✅

**Objective:** Verify proper error display for failed steps

**Setup:** May require simulating a failure (temporarily break an API endpoint)

**Steps:**

1. Start generation
2. Observe if any step fails
3. Check error message display

**Expected Results:**

- [ ] Failed step shows red X icon
- [ ] Error message displays under step name
- [ ] Other steps continue generating
- [ ] Progress bar reflects only successful steps
- [ ] User can view completed steps despite failures

**Success Criteria:** Errors are clearly displayed without breaking the flow

---

### 8. Multiple Browser Tabs ✅

**Objective:** Test behavior with multiple tabs open

**Steps:**

1. Open project in two browser tabs
2. Start generation in Tab 1
3. Navigate to Step 2 in Tab 2
4. Observe both tabs

**Expected Results:**

- [ ] Both tabs show generation progress
- [ ] Tab 1 shows main progress card
- [ ] Tab 2 shows global tracker
- [ ] Both update independently via polling
- [ ] Progress stays synced across tabs

**Success Criteria:** Both tabs reflect generation status

---

### 9. Page Refresh During Generation ✅

**Objective:** Verify status persists after page refresh

**Steps:**

1. Start generation
2. Wait for 2-3 steps to complete
3. Refresh the page
4. Observe status

**Expected Results:**

- [ ] Progress card reappears with current status
- [ ] Completed steps show checkmarks
- [ ] In-progress step shows spinner
- [ ] Generation continues from where it was
- [ ] Polling resumes automatically

**Success Criteria:** State is restored correctly after refresh

---

### 10. Complete Then Close ✅

**Objective:** Test closing progress card after completion

**Steps:**

1. Start and complete full generation
2. Observe completion state
3. Click X button on progress card
4. Observe card disappears

**Expected Results:**

- [ ] Success toast appears on completion
- [ ] All steps show green checkmarks
- [ ] X button is visible
- [ ] Click X hides progress card
- [ ] Card stays hidden until next generation

**Success Criteria:** Card closes cleanly after completion

---

### 11. Rapid Navigation ✅

**Objective:** Test rapid page changes during generation

**Steps:**

1. Start generation
2. Rapidly navigate between multiple steps
3. Observe tracker behavior

**Expected Results:**

- [ ] Tracker appears/disappears correctly
- [ ] No memory leaks or duplicate trackers
- [ ] Polling cleanup works properly
- [ ] No console errors
- [ ] Progress stays consistent

**Success Criteria:** System handles rapid navigation gracefully

---

### 12. Network Interruption ✅

**Objective:** Test behavior with network issues

**Setup:** Use browser DevTools to simulate slow/offline network

**Steps:**

1. Start generation
2. Open DevTools → Network tab
3. Set throttling to "Slow 3G" or "Offline"
4. Observe behavior
5. Restore normal network

**Expected Results:**

- [ ] Polling continues attempting
- [ ] Errors logged in console (expected)
- [ ] UI doesn't break
- [ ] Progress resumes when network restored
- [ ] No crashes or frozen states

**Success Criteria:** Graceful handling of network issues

---

### 13. Completion Auto-Dismiss ✅

**Objective:** Verify global tracker auto-dismisses after completion

**Steps:**

1. Start generation on Step 1
2. Navigate to Step 2
3. Wait for generation to complete
4. Observe tracker
5. Wait 5+ seconds

**Expected Results:**

- [ ] Tracker updates to "Generation Complete"
- [ ] Tracker remains visible for ~5 seconds
- [ ] Tracker automatically dismisses after delay
- [ ] Dismissal is smooth

**Success Criteria:** Tracker auto-dismisses 5 seconds after completion

---

### 14. Mobile Responsiveness ✅

**Objective:** Test on mobile/small screens

**Steps:**

1. Open in mobile browser or use responsive mode
2. Start generation
3. Test all interactions

**Expected Results:**

- [ ] Progress card fits mobile screen
- [ ] Touch interactions work
- [ ] Tracker is appropriately sized
- [ ] Text is readable
- [ ] Buttons are touch-friendly
- [ ] No horizontal scrolling

**Success Criteria:** Works well on mobile devices

---

### 15. Concurrent Users ✅

**Objective:** Test with multiple projects/users

**Steps:**

1. Login as User A, start generation on Project 1
2. Login as User B (different browser), start on Project 2
3. Observe both

**Expected Results:**

- [ ] Each user sees only their own progress
- [ ] Progress doesn't mix between projects
- [ ] Authentication verified for each request
- [ ] No cross-user data leakage

**Success Criteria:** Users are properly isolated

---

## Performance Tests

### 16. Memory Leaks ✅

**Objective:** Check for memory leaks

**Steps:**

1. Open browser DevTools → Performance/Memory
2. Start generation
3. Navigate between pages multiple times
4. Let generation complete
5. Check memory usage

**Expected Results:**

- [ ] Memory usage stays stable
- [ ] No continuous memory growth
- [ ] Intervals are properly cleaned up
- [ ] No orphaned event listeners

**Success Criteria:** No memory leaks detected

---

### 17. Polling Efficiency ✅

**Objective:** Verify polling doesn't overload server

**Steps:**

1. Monitor network tab during generation
2. Count API requests
3. Check request timing

**Expected Results:**

- [ ] Requests occur every 2-3 seconds (Step 1)
- [ ] Requests occur every 3 seconds (other pages)
- [ ] Only one polling loop active per page
- [ ] Requests stop when generation completes
- [ ] No duplicate or excessive requests

**Success Criteria:** Polling is efficient and controlled

---

## Edge Cases

### 18. No Intake Data ✅

**Objective:** Test with missing intake

**Steps:**

1. Create new project
2. Navigate to Step 1
3. Don't complete intake
4. Observe button state

**Expected Results:**

- [ ] "Generate All Content" button is visible
- [ ] Click requires intake to be completed
- [ ] Appropriate message if no intake

**Success Criteria:** Cannot generate without intake

---

### 19. Regenerate During Generation ✅

**Objective:** Test starting new generation while one is running

**Steps:**

1. Start generation
2. Try to click "Regenerate All Content" again

**Expected Results:**

- [ ] Button should be disabled during generation
- [ ] Or: API returns error about generation in progress
- [ ] User is warned not to start another

**Success Criteria:** Prevents duplicate generation

---

### 20. Very Slow Generation ✅

**Objective:** Test long-running generation

**Steps:**

1. Start generation
2. Wait entire duration (5+ minutes)
3. Monitor for timeout issues

**Expected Results:**

- [ ] Polling continues throughout
- [ ] No timeout errors
- [ ] UI remains responsive
- [ ] Completion is properly detected

**Success Criteria:** Handles long generation times

---

## Regression Tests

### 21. Existing Functionality ✅

**Objective:** Ensure new feature doesn't break existing features

**Tests:**

- [ ] Intake methods still work (voice, upload, paste, scrape)
- [ ] Manual step navigation works
- [ ] Step content editing works
- [ ] Saving/publishing works
- [ ] Other auto-generation features work

**Success Criteria:** All existing features work as before

---

## Browser Compatibility

### 22. Cross-Browser Testing ✅

Test in multiple browsers:

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

**Success Criteria:** Works consistently across all browsers

---

## Accessibility

### 23. A11y Testing ✅

**Tests:**

- [ ] Screen reader announces progress
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG standards
- [ ] Status changes announced

**Success Criteria:** Meets accessibility standards

---

## Summary Checklist

After completing all tests:

- [ ] All 23 test scenarios passed
- [ ] No console errors during normal operation
- [ ] No memory leaks detected
- [ ] Performance is acceptable
- [ ] Works on mobile devices
- [ ] Cross-browser compatible
- [ ] Accessible to all users
- [ ] Documentation is accurate

## Reporting Issues

If any test fails, document:

1. Test scenario number
2. Steps to reproduce
3. Expected vs actual result
4. Browser/device details
5. Screenshots/video if applicable
6. Console errors

## Approval Criteria

Feature is ready for production when:

- ✅ All critical tests pass (1-10)
- ✅ No blocking bugs
- ✅ Performance is acceptable
- ✅ Documentation is complete
- ✅ Code review approved
