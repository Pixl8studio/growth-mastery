# VAPI Call Logging Fix

## Problem Description

VAPI calls were not being logged to the database when the "End Call" button was clicked.
The error message displayed was:

```
❌ [ERROR] "⚠️ No call ID found - transcript may not save!" {}
```

### Root Cause

The issue was a **React closure problem** in the `vapi-call-widget.tsx` component. The
`currentCallId` state variable was not accessible in the event handlers due to stale
closures - event handlers were capturing the initial `null` value even after the state
was updated.

## Solution Implemented

The fix was inspired by the approach used in genie-v1, which uses React refs and
timestamp-based matching as a fallback.

### 1. Added Persistent References (useRef)

Added two refs to avoid closure issues:

```typescript
const callIdRef = useRef<string | null>(null);
const callStartTimestampRef = useRef<string | null>(null);
```

These refs persist across renders and are accessible in event handlers without closure
issues.

### 2. Capture Call Start Timestamp

When a call starts, we now capture a timestamp:

```typescript
vapiInstance.on("call-start", () => {
  const timestamp = new Date().toISOString();
  callStartTimestampRef.current = timestamp;
  // ... rest of handler
});
```

### 3. Update Call ID in Both State and Ref

Whenever we capture the call ID from VAPI messages, we update both the state (for UI)
and the ref (for event handlers):

```typescript
callIdRef.current = callId;
setCurrentCallId(callId);
```

### 4. Use Refs in call-end Handler

The `call-end` handler now uses the refs instead of state:

```typescript
vapiInstance.on("call-end", async () => {
  const capturedCallId = callIdRef.current;
  const capturedTimestamp = callStartTimestampRef.current;

  // Save transcript with either call ID or timestamp
  if (capturedCallId || capturedTimestamp) {
    await saveTranscript(capturedCallId, capturedTimestamp);
  }

  // Clear refs after processing
  callIdRef.current = null;
  callStartTimestampRef.current = null;
});
```

### 5. Enhanced Webhook Handler

Updated `/api/vapi/webhook` to handle two types of requests:

#### A. VAPI Webhook Events (from VAPI servers)

- Contains a `type` field (`call.started`, `call.ended`, `transcript`)
- Verified with webhook signature
- Processes events as they arrive from VAPI

#### B. Client-Initiated Transcript Requests (from our UI)

- Contains `callId`, `callStartTimestamp`, `projectId`, `userId`
- Supports two matching strategies:
  1. **Direct Call ID**: If call ID is available, fetch that specific call
  2. **Timestamp Matching**: If no call ID, search recent calls and match by timestamp
     (within 3 minutes)

The timestamp matching approach ensures we can save transcripts even when the call ID
isn't captured from VAPI events.

### 6. Timestamp-Based Call Matching

When no call ID is available, the webhook handler:

1. Fetches all recent calls from VAPI API
2. Compares each call's start time with the captured timestamp
3. Matches calls within a 3-minute window
4. Uses the first matching call

```typescript
const matchWindow = 3 * 60 * 1000; // 3 minutes
const targetTime = new Date(callStartTimestamp);

for (const call of calls) {
  const callTime = new Date(call.startedAt);
  const timeDiff = Math.abs(targetTime.getTime() - callTime.getTime());

  if (timeDiff <= matchWindow) {
    targetCallId = call.id;
    break;
  }
}
```

## Files Modified

### 1. `/components/funnel/vapi-call-widget.tsx`

- Added `callIdRef` and `callStartTimestampRef` refs
- Updated `call-start` handler to capture timestamp
- Updated `call-end` handler to use refs instead of state
- Updated `message` handler to update both state and ref
- Modified `saveTranscript` function to accept both callId and timestamp
- Updated UI to show recording indicator when either callId or timestamp is available

### 2. `/app/api/vapi/webhook/route.ts`

- Enhanced to handle both webhook events and client requests
- Added `handleClientTranscriptRequest` function for client-initiated saves
- Implemented timestamp-based call matching as fallback
- Added comprehensive logging for debugging

### 3. `/lib/env.ts`

- Added `NEXT_PUBLIC_VAPI_PUBLIC_KEY` to environment schema
- Added `NEXT_PUBLIC_VAPI_ASSISTANT_ID` to environment schema

## Environment Variables Required

Make sure these environment variables are set:

```bash
# VAPI Configuration (Backend)
VAPI_API_KEY=your_vapi_api_key                    # For fetching calls from VAPI API
VAPI_WEBHOOK_SECRET=your_webhook_secret           # For verifying webhook signatures

# VAPI Configuration (Frontend)
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_vapi_public_key  # For VAPI Web SDK
NEXT_PUBLIC_VAPI_ASSISTANT_ID=your_assistant_id   # The assistant to use for calls
```

## Database Schema

The solution uses the existing `vapi_transcripts` table:

```sql
CREATE TABLE vapi_transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_project_id UUID REFERENCES funnel_projects(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  call_id TEXT,
  transcript_text TEXT,
  extracted_data JSONB,
  call_duration INTEGER,
  call_status TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## How It Works Now

### Call Flow:

1. **User clicks "Start Call"**
   - Captures timestamp: `callStartTimestampRef.current = new Date().toISOString()`
   - Initiates VAPI call

2. **Call starts**
   - `call-start` event fires
   - Timestamp is already captured
   - Call ID might be captured from messages

3. **During call**
   - Transcripts are displayed in real-time
   - Call ID is updated in ref if found in messages
   - UI shows "Recording" indicator

4. **User clicks "End Call"**
   - `call-end` event fires
   - Uses `callIdRef.current` and `callStartTimestampRef.current`
   - Waits 5 seconds for VAPI to process
   - Sends request to `/api/vapi/webhook`

5. **Backend processes request**
   - If call ID available: fetches that specific call
   - If no call ID: searches by timestamp (3-minute window)
   - Fetches full transcript from VAPI
   - Saves to database
   - Returns success/error to client

6. **Client shows result**
   - Success: "Transcript saved! Refreshing page..."
   - Error: Shows error message with details

## Testing

To test the fix:

1. Start a VAPI call in the UI
2. Have a short conversation
3. Click "End Call"
4. Wait for processing (5 seconds + VAPI processing time)
5. Verify the transcript appears in the database

Check the browser console and server logs for detailed information about:

- Call ID capture
- Timestamp capture
- Webhook request/response
- Database save operation

## Fallback Strategy

The solution has multiple layers of reliability:

1. **Primary**: Use call ID if captured from VAPI events
2. **Fallback**: Use timestamp matching if call ID not available
3. **Safety**: Both approaches save to the same database table
4. **Visibility**: Clear logging at every step for debugging

## Future Improvements

Potential enhancements:

1. **Retry Logic**: Add automatic retries if transcript fetch fails
2. **Better Error Handling**: More specific error messages for different failure modes
3. **Real-time Updates**: Show transcript updates during the call
4. **Call Recovery**: Allow manual transcript recovery from VAPI dashboard
5. **Multi-assistant Support**: Handle different assistants dynamically
6. **Call History**: Show previous calls in the UI before starting new one

## References

- VAPI Web SDK: https://docs.vapi.ai/web-sdk
- VAPI API: https://docs.vapi.ai/api-reference
- genie-v1 implementation: `/genie-v1/app/funnel-generator/step-1-intake/page.tsx`
