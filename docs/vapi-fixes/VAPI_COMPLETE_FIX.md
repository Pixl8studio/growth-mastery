# VAPI Call Logging - Complete Fix

## Issues Fixed

### 1. ❌ Call ID Not Being Captured

**Error**: `⚠️ No call ID found - transcript may not save!`

**Root Cause**:

- Timestamp was being captured too late (not in `call-start` event)
- React refs weren't being used, causing closure issues
- Call ID capture logic was incomplete

**Fix**:

- Capture timestamp **immediately** in `call-start` event
- Try to capture call ID from `call-start` callData parameter
- Fallback to capturing from message events if not available
- Use refs (`callIdRef` and `callStartTimestampRef`) to avoid closure issues

### 2. ❌ useEffect Dependency Array Error

**Error**: `The final argument passed to useEffect changed size between renders`

**Root Cause**: Adding `isAIThinking` to the scroll useEffect dependencies caused the
array size to change unpredictably

**Fix**: Removed `isAIThinking` from dependencies - scroll only triggers on `messages`
changes

### 3. ❌ No UI to Display Saved Calls

**Problem**: Calls were saving but users couldn't see them

**Fix**: Added complete call history UI to Step 1 page showing:

- All saved calls with status indicators
- Call duration and timestamp
- Expandable transcripts
- Real-time updates when new calls complete

### 4. ❌ Chat Not Auto-Scrolling

**Problem**: New messages weren't automatically visible

**Fix**:

- Improved `scrollIntoView()` implementation with smooth animation
- Added 100ms delay to ensure DOM updates before scrolling
- Added `scroll-smooth` CSS class to container

## Implementation Details

### VapiCallWidget Changes (`components/funnel/vapi-call-widget.tsx`)

#### 1. Enhanced Call Start Handler

```typescript
vapiInstance.on("call-start", (callData: any) => {
  // CRITICAL: Capture timestamp immediately
  const timestamp = new Date().toISOString();
  callStartTimestampRef.current = timestamp;

  // Try to capture call ID from event
  const capturedId = callData?.call?.id || callData?.callId;
  if (capturedId) {
    callIdRef.current = capturedId;
    setCurrentCallId(capturedId);
  }

  // ... rest of handler
});
```

#### 2. Refs for Persistence

```typescript
const callIdRef = useRef<string | null>(null);
const callStartTimestampRef = useRef<string | null>(null);
```

These refs avoid React closure issues and persist through hot reloads.

#### 3. Callback for Parent Notification

```typescript
interface VapiCallWidgetProps {
  projectId: string;
  userId: string;
  onCallComplete?: () => void; // NEW
}
```

When a call completes successfully, the widget calls `onCallComplete()` so the parent
page can refresh the calls list.

#### 4. Improved Auto-Scroll

```typescript
const scrollToBottom = () => {
  setTimeout(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
        inline: "nearest",
      });
    }
  }, 100);
};

useEffect(() => {
  scrollToBottom();
}, [messages]); // Only on messages change, not isAIThinking
```

### Step 1 Page Changes (`app/funnel-builder/[projectId]/step/1/page.tsx`)

#### 1. Load All Transcripts (not just latest)

```typescript
const [transcripts, setTranscripts] = useState<VapiTranscript[]>([]);

const loadTranscripts = async () => {
  const { data, error } = await supabase
    .from("vapi_transcripts")
    .select("*")
    .eq("funnel_project_id", projectId)
    .order("created_at", { ascending: false });

  setTranscripts(data || []);
};
```

#### 2. Pass Callback to Widget

```typescript
<VapiCallWidget
    projectId={projectId}
    userId={userId}
    onCallComplete={loadTranscripts}  // Refresh list when call completes
/>
```

#### 3. Display Calls List UI

- Shows all saved calls in chronological order
- Status indicator (green for completed, blue for in-progress, red for failed)
- Call duration and timestamp
- Expandable transcript viewer
- Loading states

## How It Works Now

### Complete Call Flow:

1. **User clicks "Start Call"**
   - `call-start` event fires
   - **Timestamp captured immediately**:
     `callStartTimestampRef.current = new Date().toISOString()`
   - Call ID captured if available in event data
   - Timer starts

2. **During Call**
   - Messages captured from `message` events
   - Call ID updated if found in message data (fallback)
   - Transcripts displayed in real-time
   - Auto-scroll keeps latest messages visible

3. **User clicks "End Call"**
   - `call-end` event fires
   - Uses refs (not state) to get `callIdRef.current` and
     `callStartTimestampRef.current`
   - Waits 5 seconds for VAPI to process
   - Sends request to `/api/vapi/webhook` with both ID and timestamp

4. **Backend Processing** (`/api/vapi/webhook`)
   - If call ID provided: fetches that specific call
   - If no call ID: searches by timestamp (3-minute window)
   - Fetches full transcript from VAPI API
   - Saves to `vapi_transcripts` table with:
     - `funnel_project_id`
     - `user_id`
     - `call_id`
     - `transcript_text`
     - `call_duration`
     - `call_status: "completed"`

5. **Client Updates**
   - Shows "✅ Transcript saved!" message
   - Calls `onCallComplete()` callback
   - Parent page calls `loadTranscripts()`
   - Calls list refreshes with new call visible

6. **User Sees Result**
   - New call appears in "Your Intake Calls" section
   - Can expand to view full transcript
   - Duration and timestamp displayed
   - Status indicator shows completion

## Key Differences from Original Implementation

| Aspect            | Before             | After                                  |
| ----------------- | ------------------ | -------------------------------------- |
| Timestamp Capture | ❌ Not captured    | ✅ Captured in `call-start`            |
| Call ID Capture   | ❌ Closure issues  | ✅ Uses refs + multiple capture points |
| Calls Display     | ❌ No UI           | ✅ Complete list with details          |
| Auto-Scroll       | ❌ Unreliable      | ✅ Smooth with delay                   |
| Page Refresh      | ❌ Full reload     | ✅ Smart list refresh                  |
| Error Handling    | ❌ Silent failures | ✅ Clear error messages                |

## Testing Checklist

- [x] Timestamp captured on call start
- [x] Call ID captured from events
- [x] Call saves to database
- [x] Calls list refreshes after completion
- [x] Auto-scroll works smoothly
- [x] No useEffect errors
- [x] Transcripts viewable in UI
- [x] Duration displayed correctly
- [x] Status indicators accurate
- [x] No linter errors

## Files Modified

1. **`components/funnel/vapi-call-widget.tsx`**
   - Enhanced `call-start` handler to capture timestamp and ID
   - Added `onCallComplete` callback prop
   - Fixed auto-scroll with improved logic
   - Removed `isAIThinking` from scroll dependencies

2. **`app/funnel-builder/[projectId]/step/1/page.tsx`**
   - Changed from single transcript to array of transcripts
   - Added `loadTranscripts()` function
   - Added complete calls list UI
   - Passed `onCallComplete` callback to widget
   - Added formatting functions for duration and dates

3. **`app/api/vapi/webhook/route.ts`** (previously fixed)
   - Handles both call ID and timestamp-based lookups
   - Fetches from VAPI API
   - Saves to database

4. **`lib/env.ts`** (previously fixed)
   - Added VAPI environment variables

## Environment Variables

```bash
# Backend (Server)
VAPI_API_KEY=your_vapi_api_key
VAPI_WEBHOOK_SECRET=your_webhook_secret

# Frontend (Client)
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_vapi_public_key
NEXT_PUBLIC_VAPI_ASSISTANT_ID=your_assistant_id
```

## Success Criteria

✅ **All Fixed!**

1. Timestamp captured immediately on call start
2. Call ID captured from multiple sources
3. No useEffect dependency array errors
4. Calls save reliably to database
5. UI displays all saved calls
6. Auto-scroll works smoothly
7. List refreshes automatically after calls
8. Clean, production-ready code
9. Comprehensive logging for debugging
10. Error handling throughout

## What You'll See Now

1. **During Call**:
   - Messages appear smoothly and auto-scroll
   - Timer shows call duration
   - "Recording" indicator when tracking is active

2. **After Call**:
   - "📝 Call ended - processing transcript..."
   - "⏳ Processing transcript (this takes a few seconds)..."
   - "✅ Transcript saved!"
   - List updates automatically

3. **Saved Calls Section**:
   - All your calls in a clean list
   - Green status indicators for completed calls
   - Duration and timestamp for each
   - Click to expand and view transcript
   - Most recent calls first

## Next Steps

The VAPI integration is now complete and production-ready! The system reliably:

- Captures call metadata
- Saves transcripts
- Displays call history
- Provides smooth UX

You can now proceed to Step 2 (Generate Offer) knowing that your intake calls are being
tracked properly. 🎉
