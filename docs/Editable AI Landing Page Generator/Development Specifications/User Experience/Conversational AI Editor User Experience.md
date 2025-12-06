# Conversational AI Editor - Technical Specification

A natural language interface for editing landing pages in GrowthMastery.ai.

---

## The Vision

Users should be able to edit their landing pages by describing what they want in plain
English. Instead of clicking through menus or manually editing text, they type "make the
headline more urgent" or "add a testimonial section after the pricing" and watch the
page update in real-time.

This is Lovable-style editing applied to our funnel pages.

---

## What We're Building

A split-screen editor with two panels:

**Left Panel (35% width): AI Chat Interface**
- Message thread showing the conversation history
- Input area for typing requests
- "Thinking" indicator when AI is processing
- Edit summaries showing what changed
- Quick action chips for suggested next steps

**Right Panel (65% width): Live Page Preview**
- The actual page being edited, rendered in real-time
- Changes appear immediately after AI processes them
- Existing edit mode functionality still works (sparkle buttons, drag-drop blocks)

---

## How It Works

### The User Experience

1. User opens a page in the funnel builder (registration, watch, or enrollment)
2. They see the familiar page preview, now with an AI chat panel on the left
3. They type a request: "Change the headline to focus on the transformation, not the
   features"
4. A thinking indicator appears: "Thinking for 4s..." with a lightbulb icon
5. AI responds with what it did: "I've updated the headline to emphasize the
   transformation your customers will experience. The new headline focuses on outcomes
   rather than features."
6. Below the response, an expandable card shows "1 edit made" - clicking reveals details
7. The page preview updates instantly to show the new headline
8. Quick action chips appear: "Add urgency element" / "Improve subheadline" / "Add
   social proof"
9. Everything auto-saves to the database

### The Technical Flow

1. User message goes to an API endpoint with the current page HTML and project context
2. OpenAI processes the request with knowledge about the page type, offer, and brand
3. AI returns structured data: explanation text, list of edits to apply, suggested next
   actions
4. Frontend applies each edit to the DOM (updating text, adding sections, etc.)
5. Existing auto-save system persists changes to Supabase
6. Conversation state is stored so users can continue where they left off

---

## Integration with Existing Systems

This feature builds on infrastructure we already have:

### Existing Visual Editor
The `EditorPageWrapper` component already handles page editing with vanilla JS. We wrap
this in a split-pane layout and add the chat panel alongside it. All existing edit
functionality (sparkle regenerate buttons, block drag-drop, inline editing) continues
to work.

### Existing AI Infrastructure
We already have `lib/ai/client.ts` for OpenAI calls, `lib/ai-assistant/` for action
execution patterns, and page generation prompts in `lib/generators/`. We extend these
rather than reinvent them.

### Existing Auto-Save
The vanilla JS editor already calls `window.scheduleAutoSave()` when content changes.
After AI applies edits, we trigger the same function so changes persist automatically.

### Existing State Management
We use Zustand throughout the app. The conversation state (messages, processing status,
pending edits) follows the same pattern as existing stores like `usePageContext`.

---

## Components to Build

### New Directory: `components/ai-editor/`

**ai-editor-layout.tsx**
The split-pane container. Uses CSS flexbox to divide the screen. Left side gets the
chat panel, right side wraps the existing EditorPageWrapper. Handles responsive
behavior (collapse chat on mobile, maybe a drawer instead).

**chat-panel.tsx**
The main left panel component. Contains the message thread, input area, and quick
action chips. Manages the conversation state and API calls.

**message-thread.tsx**
Renders the conversation history. User messages appear on the right (or with different
styling), assistant messages on the left. Assistant messages can include thinking time
("Thought for 8s") and expandable edit summaries.

**thinking-indicator.tsx**
Shows when AI is processing. Displays a lightbulb icon and running timer ("Thinking
for 4s...") with animated dots. Creates anticipation and transparency.

**edit-summary-card.tsx**
Collapsible card showing "2 edits made" with a "Show all" toggle. Expands to show each
edit with its description. Optional "Preview" and "Code" buttons for power users who
want to see the actual changes.

**quick-action-chips.tsx**
Horizontal row of suggestion buttons below the AI response. Clicking one sends that
text as a new message. Chips are contextual - AI suggests relevant next steps based on
what was just changed.

**chat-input.tsx**
Text input with send button. Could include attachment button (for uploading reference
images), voice input button (using existing VAPI integration), and mode toggles.

**preview-panel.tsx**
Thin wrapper around EditorPageWrapper. Sets up the bridge for AI edits to communicate
with the vanilla JS editor. Handles any additional preview-specific UI.

---

## API Endpoint to Build

### `POST /api/ai-editor/chat`

Receives: user message, page ID, page type, current HTML content, project context

Returns: AI response text, list of edits to apply, suggested next actions, thinking
time

The system prompt gives the AI context about:
- What type of page this is (registration, watch, enrollment)
- The offer being sold (from funnel project data)
- Target audience and brand voice
- What kinds of edits are possible (text updates, style changes, section additions)

The AI returns structured JSON specifying exactly what to change - not just prose
explanation, but actionable edit instructions the frontend can apply.

---

## State Management

### Conversation Store (Zustand)

Stores:
- Array of messages (user and assistant, with timestamps)
- Whether AI is currently processing
- How long current thinking has been going (for the timer)
- Pending edits waiting to be applied
- Session ID for persistence

Actions:
- Add a message to the thread
- Set processing state
- Update thinking time
- Apply pending edits to the page
- Clear conversation for fresh start

---

## Edit Application Logic

When AI returns edits, the frontend applies them to the DOM:

**Text Updates**
Find the element by selector, replace its text content. Important: preserve any child
elements like the sparkle regenerate buttons - only replace text nodes.

**Style Updates**
Find the element, update its className to apply different Tailwind classes.

**Section Additions**
Use the existing `window.visualEditor.insertGeneratedSection()` function that we
already have for the section block generator.

**Section Removals**
Find the element and remove it from DOM.

After any edit, flash a green outline briefly on the affected element so users see
exactly what changed. Then trigger auto-save.

---

## Database Changes

Add a table to store conversation sessions:
- `ai_editor_sessions`
- Links to page ID and user ID
- Stores messages array as JSONB
- Tracks total edits applied
- Created/updated timestamps

This lets users resume conversations if they leave and come back.

---

## Implementation Plan

### Week 1: Foundation

Set up the component structure and basic UI. Create the split-pane layout, chat panel
with message display, and input area. Wire up a simple API endpoint that echoes back
the message (no AI yet). Get the visual flow working end-to-end.

Deliverables:
- Directory structure and component files created
- Split-pane layout rendering correctly
- Messages can be typed and displayed
- Basic styling with existing design tokens

### Week 2: AI Integration

Connect to OpenAI and build the conversation engine. Create the system prompt with page
context. Parse AI responses and apply edits to the DOM. Implement the thinking indicator
with live timer.

Deliverables:
- API endpoint calling OpenAI with proper prompts
- Edits successfully applied to page DOM
- Thinking indicator showing real processing time
- Auto-save triggered after edits

### Week 3: Polish & Persistence

Add edit summary cards, quick action chips, and conversation persistence. Implement
session storage in Supabase. Handle edge cases and error states.

Deliverables:
- Edit summaries show what changed
- Quick action chips appear and work
- Conversation persists across page refreshes
- Graceful error handling

### Week 4: Enhancement & Testing

Add power-user features (code diff view, undo/redo). Write tests. Performance
optimization. User feedback mechanism (thumbs up/down).

Deliverables:
- Tests passing (unit and E2E)
- Performance acceptable (< 8s response time)
- Feedback collection working
- Ready for production

---

## Success Criteria

**User Adoption**
At least 60% of users try the AI editor within first month of launch.

**Edit Success Rate**
95% or more of AI-suggested edits apply correctly to the page.

**Response Time**
Average time from send to response visible is under 8 seconds.

**Engagement**
Users average 3+ edits per session (they find it useful enough to keep using).

**Satisfaction**
70%+ positive feedback ratio (thumbs up vs thumbs down).

---

## What This Enables

Once we have conversational editing working for landing pages, the pattern extends to:

- Editing email follow-up sequences via chat
- Modifying presentation decks via natural language
- Adjusting funnel settings through conversation
- Any content editing in the platform

The chat interface becomes a universal input method for the entire application.

---

## Key Design Decisions

**Why split-pane instead of modal?**
Users need to see the page while describing changes. A modal would hide the context.
Split-pane lets them reference what's on screen in their requests.

**Why preserve existing editor?**
The vanilla JS editor works well for direct manipulation. Some users prefer clicking
and typing directly. The AI chat is additive, not replacement.

**Why structured edit responses?**
Prose explanations are nice for users, but we need machine-readable instructions to
actually apply changes. AI returns both.

**Why Zustand for conversation state?**
We already use Zustand throughout the app. Consistency matters more than finding the
"best" state management solution.

**Why session persistence?**
Users might work on a page across multiple sittings. Losing context is frustrating.
Storing the conversation lets them pick up where they left off.

---

## Dependencies

Requires these to be working (which they already are):
- OpenAI API key configured
- Supabase database connection
- EditorPageWrapper component
- Auto-save infrastructure
- Radix UI and Tailwind setup

No new external dependencies needed.

---

## Risks & Mitigations

**Risk: AI makes bad edits**
Mitigation: Always show what changed, make it easy to undo, keep existing manual edit
tools available.

**Risk: Slow response times**
Mitigation: Show thinking indicator with timer so users know it's working. Optimize
prompts to reduce token count. Consider streaming responses.

**Risk: Users don't adopt it**
Mitigation: Make it discoverable but not forced. Offer quick action suggestions to
lower the barrier to trying it.

**Risk: Complex edits fail**
Mitigation: Start with simple edit types (text changes). Expand capabilities gradually
as we learn what works.

---

## Summary

We're building a chat interface that lets users edit their landing pages by describing
what they want. It sits alongside the existing visual editor, applies changes in
real-time, and persists everything automatically.

The core insight: editing should feel like talking to a helpful assistant, not
operating a complex tool. Users describe the outcome, AI figures out the implementation.

This specification gives the developer everything needed to build it: the user
experience, the component structure, the data flow, and the implementation timeline.
The codebase already has the building blocks - this is about connecting them in a new
way.
