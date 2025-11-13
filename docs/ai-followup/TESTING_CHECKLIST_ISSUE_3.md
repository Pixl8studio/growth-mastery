# Testing Checklist for Issue #3 Fixes

This document provides a comprehensive testing checklist for the AI Follow-Up Engine
improvements implemented to resolve GitHub Issue #3.

## Overview of Changes

The following enhancements were implemented:

1. **Gmail OAuth Status Check** - Added endpoint and UI to detect Gmail OAuth
   availability
2. **Enhanced Error Messages** - Better error handling for Gmail connection failures
3. **Sender Setup Progress Tracker** - Visual progress indicator showing setup
   completion
4. **Brand Voice Loading States** - Loading indicators during AI generation
5. **Brand Voice Regenerate Button** - Allow users to regenerate brand voice from Agent
   Config
6. **Documentation Updates** - Comprehensive troubleshooting guide added

## Pre-Test Setup

### Scenario A: Gmail OAuth Configured (Full Features)

Set these environment variables:

```bash
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
```

### Scenario B: Gmail OAuth NOT Configured (Graceful Degradation)

Remove or comment out:

```bash
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
```

## Test Cases

### 1. Gmail OAuth Status Detection

**Test with OAuth Configured:**

- [ ] Navigate to Step 11: AI Follow-Up Engine
- [ ] Enable AI Follow-Up (toggle switch)
- [ ] Go to Sender tab
- [ ] **Expected**: No warning message appears
- [ ] **Expected**: "Connect Gmail" button is visible and enabled
- [ ] **Expected**: Gmail benefits card is shown with blue background

**Test without OAuth Configured:**

- [ ] Navigate to Step 11: AI Follow-Up Engine
- [ ] Enable AI Follow-Up (toggle switch)
- [ ] Go to Sender tab
- [ ] **Expected**: Amber warning banner appears: "Gmail OAuth Not Configured"
- [ ] **Expected**: Warning explains administrator setup is needed
- [ ] **Expected**: Gmail option is hidden
- [ ] **Expected**: Only SendGrid option is shown
- [ ] **Expected**: SendGrid section title changes to "Use SendGrid" (not "Or use...")

### 2. Gmail Connection Error Handling

**Test without OAuth Configured:**

- [ ] Start without `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- [ ] Navigate to Step 11 → Sender tab
- [ ] Try to click "Connect Gmail" (should not be visible)
- [ ] **Expected**: Button is not shown if OAuth check ran
- [ ] Manually navigate to `/api/followup/gmail/connect?agent_config_id=test`
- [ ] **Expected**: Returns 503 status code
- [ ] **Expected**: Response includes `setupRequired: true`
- [ ] **Expected**: Error message mentions environment variables

**Test with invalid credentials:**

- [ ] Set incorrect `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET`
- [ ] Try to connect Gmail
- [ ] **Expected**: Clear error message appears
- [ ] **Expected**: User is directed to use SendGrid or contact support
- [ ] **Expected**: Toast notification shows the error

### 3. Sender Setup Progress Tracker

**Test initial state:**

- [ ] Enable AI Follow-Up Engine
- [ ] Go to Sender tab immediately
- [ ] **Expected**: Progress card shows "0 of 2 steps complete"
- [ ] **Expected**: Both step indicators are gray/muted
- [ ] **Expected**: Progress bar is at 0%

**Test after connecting Gmail:**

- [ ] Connect Gmail successfully
- [ ] **Expected**: Progress updates to "2 of 2 steps complete"
- [ ] **Expected**: Both steps show green checkmarks
- [ ] **Expected**: Progress bar is at 100%
- [ ] **Expected**: "Setup Complete!" badge appears with green checkmark
- [ ] **Expected**: Gmail email address is shown in "Connected" description

**Test with SendGrid:**

- [ ] Instead of Gmail, fill in SendGrid sender info
- [ ] Enter sender name and sender email
- [ ] Click "Save Sender Info"
- [ ] **Expected**: Progress updates to "2 of 2 steps complete"
- [ ] **Expected**: Sender email shown in progress indicator
- [ ] **Expected**: Green completion badges appear

### 4. Brand Voice Generation Loading States

**Test automatic generation on enable:**

- [ ] Complete intake session (Step 1)
- [ ] Define offer (Step 2)
- [ ] Navigate to Step 11
- [ ] Toggle "Enable AI Follow-Up" to ON
- [ ] **Expected**: Toast appears: "Generating Brand Voice..."
- [ ] **Expected**: Purple loading banner appears below toggle
- [ ] **Expected**: Banner shows spinning loader icon
- [ ] **Expected**: Message: "Setting up your AI Follow-Up Engine..."
- [ ] **Expected**: Toggle is disabled during generation
- [ ] **Expected**: After ~2-5 seconds, success toast: "✨ Brand Voice Generated"
- [ ] **Expected**: Loading banner disappears
- [ ] **Expected**: Toggle re-enables

**Test fallback on API failure:**

- [ ] Temporarily break the brand voice API (or disconnect internet)
- [ ] Enable AI Follow-Up
- [ ] **Expected**: Toast shows: "Using Default Voice Guidelines"
- [ ] **Expected**: Explains AI generation failed but fallback created
- [ ] **Expected**: System continues without crashing
- [ ] Go to Agent tab → Knowledge section
- [ ] **Expected**: Brand Voice field has default fallback content

### 5. Brand Voice Regenerate Button

**Test regenerate in Agent Config:**

- [ ] Enable AI Follow-Up Engine
- [ ] Go to Agent tab
- [ ] Click "Knowledge" sub-tab
- [ ] **Expected**: "Regenerate" button appears next to "Brand Voice Guidelines" label
- [ ] **Expected**: Button shows refresh icon
- [ ] Click "Regenerate" button
- [ ] **Expected**: Button changes to "Regenerating..." with spinner
- [ ] **Expected**: Button is disabled during regeneration
- [ ] **Expected**: Toast: "Regenerating Brand Voice..."
- [ ] **Expected**: After ~2-5 seconds, success toast: "✨ Brand Voice Regenerated"
- [ ] **Expected**: Textarea updates with new content
- [ ] **Expected**: Toast reminds: "Don't forget to save!"
- [ ] Click "Save Configuration"
- [ ] **Expected**: Changes persist

**Test regenerate without project data:**

- [ ] Try regenerate on a project without intake or offer
- [ ] **Expected**: Error toast: "No Data Available"
- [ ] **Expected**: Message: "Please complete your intake session and define your offer
      first"

**Test regenerate without funnel project ID:**

- [ ] This shouldn't happen in normal flow, but button won't show if projectId is
      missing
- [ ] **Expected**: Button doesn't render without funnelProjectId prop

### 6. End-to-End User Flows

**Flow 1: New User, Gmail Available**

- [ ] Create new funnel project
- [ ] Complete Steps 1-2 (Intake + Offer)
- [ ] Navigate to Step 11
- [ ] Enable AI Follow-Up
- [ ] **Expected**: Brand voice generates automatically
- [ ] Go to Sender tab
- [ ] **Expected**: Progress shows 0/2 steps
- [ ] Click "Connect Gmail"
- [ ] **Expected**: OAuth popup opens
- [ ] Complete OAuth flow
- [ ] **Expected**: Return to app with Gmail connected
- [ ] **Expected**: Progress shows 2/2 steps complete
- [ ] **Expected**: Green success indicators

**Flow 2: New User, Gmail NOT Available**

- [ ] Create new funnel project
- [ ] Complete Steps 1-2
- [ ] Navigate to Step 11
- [ ] Enable AI Follow-Up
- [ ] Go to Sender tab
- [ ] **Expected**: Amber warning about Gmail not configured
- [ ] Fill in SendGrid sender details
- [ ] Click "Save Sender Info"
- [ ] **Expected**: Progress updates to complete
- [ ] **Expected**: Can proceed with SendGrid

**Flow 3: Regenerate Brand Voice Mid-Setup**

- [ ] Have existing funnel with intake/offer
- [ ] Enable AI Follow-Up (auto-generates brand voice)
- [ ] Go to Agent tab → Knowledge
- [ ] Review initial brand voice
- [ ] Click "Regenerate" to get fresh version
- [ ] **Expected**: Loading states work correctly
- [ ] **Expected**: New content appears
- [ ] Edit the generated text manually
- [ ] Save configuration
- [ ] **Expected**: Manual edits persist

### 7. Edge Cases

**Gmail connection during brand voice generation:**

- [ ] Enable AI Follow-Up (starts brand voice generation)
- [ ] While generating, quickly navigate to Sender tab
- [ ] Try to interact with Gmail button
- [ ] **Expected**: UI remains responsive
- [ ] **Expected**: No crashes or race conditions

**Rapid toggle on/off:**

- [ ] Toggle AI Follow-Up on, then immediately off, then on again
- [ ] **Expected**: System handles it gracefully
- [ ] **Expected**: No duplicate brand voice generations
- [ ] **Expected**: Loading states clear properly

**Browser refresh during generation:**

- [ ] Start brand voice generation
- [ ] Immediately refresh browser
- [ ] **Expected**: System recovers cleanly
- [ ] **Expected**: Can re-enable and retry

**Gmail disconnect then reconnect:**

- [ ] Connect Gmail successfully
- [ ] Disconnect Gmail
- [ ] **Expected**: Progress resets appropriately
- [ ] Reconnect Gmail
- [ ] **Expected**: Progress updates again
- [ ] **Expected**: All state remains consistent

### 8. Documentation Review

**Test Gmail OAuth Setup Guide:**

- [ ] Open `docs/ai-followup/Gmail-OAuth-Setup.md`
- [ ] Verify "Failed to initiate Gmail connection" section exists
- [ ] Verify section includes symptoms, causes, and solutions
- [ ] Verify "Gmail Status Check" section explains the new endpoint
- [ ] Verify "Missing Test Users" section is present
- [ ] Verify step-by-step instructions are clear
- [ ] Try following the guide to set up OAuth
- [ ] **Expected**: Instructions work as documented

### 9. API Endpoint Testing

**Test Gmail Status Endpoint:**

```bash
# With OAuth configured
curl http://localhost:3000/api/followup/gmail/status

# Expected response:
{
  "available": true,
  "message": "Gmail OAuth is configured and ready to use",
  "configured": true
}

# Without OAuth configured
# Expected response:
{
  "available": false,
  "message": "Gmail OAuth requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET...",
  "configured": false
}
```

**Test Gmail Connect Endpoint:**

```bash
# Without OAuth configured
curl -v http://localhost:3000/api/followup/gmail/connect?agent_config_id=test-id

# Expected: 503 status
# Expected: Response includes setupRequired: true
# Expected: Details explain what's needed
```

### 10. Console and Network Inspection

**Browser console checks:**

- [ ] Open browser DevTools → Console
- [ ] Navigate through Step 11
- [ ] Enable AI Follow-Up
- [ ] **Expected**: No JavaScript errors
- [ ] **Expected**: Structured log messages about brand voice and Gmail status
- [ ] **Expected**: All log messages use proper logger (not console.log)

**Network tab checks:**

- [ ] Open DevTools → Network tab
- [ ] Enable AI Follow-Up
- [ ] **Expected**: See `POST /api/followup/generate-brand-voice`
- [ ] **Expected**: See `GET /api/followup/gmail/status`
- [ ] Check response times
- [ ] **Expected**: Status check returns quickly (<500ms)
- [ ] **Expected**: Brand voice generation takes 2-5 seconds

## Success Criteria

All tests should pass with:

✅ No JavaScript errors in console ✅ No layout shifts or visual glitches ✅ Clear,
helpful error messages ✅ Smooth loading states and transitions ✅ Correct progress
tracking ✅ Gmail available when configured ✅ Graceful degradation when Gmail not
configured ✅ Brand voice generates successfully ✅ Regenerate button works correctly ✅
Documentation is accurate and helpful

## Regression Testing

Ensure existing functionality still works:

- [ ] SendGrid setup still works as before
- [ ] Agent configuration saving works
- [ ] Sequence creation works
- [ ] Message templates work
- [ ] Analytics display correctly
- [ ] Test message modal works
- [ ] All other Step 11 features functional

## Performance Checks

- [ ] Page load time remains acceptable (<3s)
- [ ] Gmail status check doesn't block UI
- [ ] Brand voice generation doesn't freeze UI
- [ ] Progress updates are smooth (no jank)
- [ ] Multiple rapid actions don't cause issues

## Accessibility Checks

- [ ] Loading states are announced to screen readers
- [ ] Error messages are associated with controls
- [ ] Buttons have clear labels
- [ ] Color isn't the only indicator (icons + text too)
- [ ] Keyboard navigation works throughout

## Browser Compatibility

Test in:

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Cleanup

After testing is complete:

- [ ] Remove any test data created
- [ ] Restore production environment variables
- [ ] Document any discovered issues
- [ ] Update this checklist if needed

---

**Testing Notes:**

Add any issues or observations here during testing:

-
-
- **Sign-off:**

Tester: **\*\***\_\_\_\_**\*\*** Date: **\*\***\_\_\_\_**\*\*** Result: ☐ PASS ☐ FAIL
(see notes)
