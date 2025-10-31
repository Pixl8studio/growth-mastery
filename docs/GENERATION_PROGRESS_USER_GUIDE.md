# Auto-Generation Progress - User Guide

## What to Expect

When you click "Regenerate All Content" from the intake step, you'll now see real-time
progress as each step of your funnel is generated.

## On the Intake Page (Step 1)

### Starting Generation

1. Click the **"Regenerate All Content"** button
2. Confirm in the modal dialog
3. A progress card will appear showing all steps

### What You'll See

**Progress Card Features:**

- **Progress Bar**: Shows overall completion (e.g., "3 of 7 steps")
- **Step List**: All steps with their current status:
  - ⚪ Gray circle = Pending (not started yet)
  - 🔵 Blue spinner = Currently generating
  - ✅ Green checkmark = Completed
  - ❌ Red X = Failed (with error message)

**Example Progress Display:**

```
🎨 Generating Content...
Progress: 3 of 7 steps
[================>            ] 43%

Step 2: Offer ✅
Step 3: Deck Structure ✅
Step 5: Enrollment Pages ✅
Step 8: Watch Pages 🔵 (Generating now...)
Step 9: Registration Pages ⚪
Step 11: AI Followup ⚪
Marketing Profile ⚪

💡 Generation continues in the background.
You can navigate to other pages while we work!
```

### What You Can Do

**During Generation:**

- ✅ **Click any completed step** to view the generated content
- ✅ **Navigate to other pages** - generation continues
- ✅ **Work on other things** - no need to wait
- ✅ **Check back anytime** - progress is saved

**After Completion:**

- All steps show green checkmarks ✅
- Click any step to navigate and review
- Close the progress card with the X button
- A success toast confirms completion

## On Other Pages (Steps 2-12, Dashboard)

### While Generation is Running

If you navigate away from the intake page during generation, you'll see a **floating
progress tracker** in the bottom-right corner:

**Collapsed View (Default):**

```
┌─────────────────────────┐
│ 🔵 Generating Content   │
│ 3 of 7 steps            │
│ [===>      ] 43%        │
└─────────────────────────┘
```

**Expanded View (Click to expand):**

```
┌─────────────────────────┐
│ 🔵 Generating Content  ✕│
│ 3 of 7 steps            │
│ [===>      ] 43%        │
├─────────────────────────┤
│ Step 2: Offer ✅        │
│ Step 3: Deck... ✅      │
│ Step 5: Enroll... ✅    │
│ Step 8: Watch... 🔵     │
│ Step 9: Regist... ⚪    │
│ Step 11: AI... ⚪       │
│ Marketing... ⚪          │
│                         │
│ Currently generating:   │
│ Watch Pages             │
└─────────────────────────┘
```

### Tracker Behavior

**Shows when:**

- Generation is in progress
- You're on any page except Step 1

**Hides when:**

- You return to Step 1 (to avoid duplication)
- You click the X button
- Generation completes (after 5 seconds)

**Features:**

- Click anywhere on header to expand/collapse
- Click X to dismiss (generation continues)
- Auto-updates every 3 seconds
- Stays visible across page navigation

## Steps Being Generated

When you regenerate all content, the system creates:

1. **Step 2: Offer** - Your product/service offering
2. **Step 3: Deck Structure** - 55-slide presentation outline
3. **Step 5: Enrollment Pages** - Sales pages and enrollment forms
4. **Step 8: Watch Pages** - Video presentation viewing pages
5. **Step 9: Registration Pages** - Lead capture and registration forms
6. **Step 11: AI Followup** - Automated follow-up sequence
7. **Marketing Profile** - Marketing campaign initialization

## Generation Timeline

**Typical Duration:** 2-5 minutes for all steps

**Per-Step Timing:**

- Offer: ~20-30 seconds
- Deck Structure: ~30-45 seconds
- Enrollment Pages: ~25-35 seconds
- Watch Pages: ~20-30 seconds
- Registration Pages: ~25-35 seconds
- AI Followup: ~30-40 seconds
- Marketing Profile: ~15-25 seconds

_Note: Times vary based on content complexity and server load_

## What Happens During Generation

### Real-Time Updates

- Progress updates every 2-3 seconds
- Step status changes immediately when complete
- Progress bar advances smoothly
- Current step highlighted with animation

### In the Background

1. AI analyzes your intake data
2. Generates content for each step
3. Saves to database
4. Updates completion status
5. Marks step as complete

### If Something Fails

- Failed steps show red X with error message
- Other steps continue generating
- You can retry regeneration after review
- Completed steps remain accessible

## Tips for Best Experience

### During Generation

✅ **DO:**

- Navigate to view completed steps
- Continue working on other pages
- Check the floating tracker for status
- Wait for completion toast notification

❌ **DON'T:**

- Close the browser (generation will stop)
- Start another regeneration (wait for current to finish)
- Edit steps being generated (changes may be overwritten)

### After Generation

1. **Review each step** - Click through to verify content
2. **Make edits** - Customize generated content as needed
3. **Test your funnel** - Ensure everything works together
4. **Regenerate if needed** - Refine with new intake data

## Troubleshooting

### Progress Not Updating?

- Check your internet connection
- Refresh the page and check status
- Wait 30 seconds for next poll
- Check browser console for errors

### Generation Taking Too Long?

- Normal: 2-5 minutes total
- Slow network may add time
- Check system status
- Contact support if > 10 minutes

### Steps Failed?

- Read error message for details
- Check intake data completeness
- Try regeneration again
- Contact support if persistent

### Tracker Not Appearing?

- Only shows during active generation
- Hidden on Step 1 (use main card)
- Check if generation already completed
- Refresh page to resync status

## Keyboard Shortcuts

- **Escape**: Close progress card (Step 1)
- **Click completed step**: Navigate to that step
- **Click tracker header**: Expand/collapse

## Mobile Experience

The progress tracking works on mobile devices:

- Responsive design adapts to screen size
- Touch-friendly buttons and links
- Collapsible sections save space
- Floating tracker anchors to bottom

## Questions?

**"Can I close the tab during generation?"** No - generation happens on the server but
requires the client to show progress. Keep the browser open.

**"What if I need to edit intake data?"** Wait for generation to complete, then you can
add more intake and regenerate.

**"Can I regenerate individual steps?"** Not yet - this regenerates all content.
Individual step regeneration coming soon.

**"Does regeneration overwrite my edits?"** Yes - regeneration replaces all content.
Make backups before regenerating.

**"How do I know when it's done?"** You'll see a success toast notification and all
steps will show green checkmarks.

## Benefits

### Transparency

- Always know what's happening
- See exactly which step is generating
- Track progress in real-time

### Flexibility

- Navigate anywhere during generation
- View completed content immediately
- Continue working on other tasks

### Confidence

- Visual confirmation of progress
- Clear status for each step
- Error messages if something fails

Enjoy your improved auto-generation experience! 🎉
