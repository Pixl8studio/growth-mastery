# Step 6: Talk Track Editing & Duration Range Update ✅

## Overview

Enhanced Step 6 with realistic duration estimates and inline editing functionality based
on v1's proven pattern.

---

## 🎯 Changes Implemented

### 1. **Realistic Duration Ranges**

Instead of showing a single duration, we now show a range based on slides:

- **Calculation**: 15-30 seconds per slide
- **Display**: "5-10 min estimated" (for a 20-slide deck)

#### Implementation

```typescript
const getDurationRange = (slideCount: number) => {
  const minMinutes = Math.round((slideCount * 15) / 60);
  const maxMinutes = Math.round((slideCount * 30) / 60);
  return `${minMinutes}-${maxMinutes} min`;
};
```

#### Display Logic

```typescript
{track.deck_structure_id && deckStructureMap.get(track.deck_structure_id) ? (
    <>
        <span>⏱️ {getDurationRange(deckStructureMap.get(track.deck_structure_id)!.slide_count)} estimated</span>
        <span>📄 {deckStructureMap.get(track.deck_structure_id)!.slide_count} slides</span>
    </>
) : (
    <span>⏱️ {track.slide_timings?.totalDuration || 0} min</span>
)}
```

---

### 2. **Inline Editing (Based on v1 Pattern)**

Users can now edit talk tracks directly in the modal, just like v1.

#### Features

- **Edit Button**: Click to enter edit mode
- **Textarea**: Full-height, monospace font for easy editing
- **Save/Cancel**: Save changes or revert
- **Saved Indicator**: Green "✓ Saved" badge for 2 seconds
- **Auto-close on modal X**: Resets edit state

#### State Management

```typescript
const [isEditingTrack, setIsEditingTrack] = useState(false);
const [editedContent, setEditedContent] = useState("");
const [showSavedIndicator, setShowSavedIndicator] = useState(false);
```

#### Edit Handler

```typescript
const handleEditTrack = () => {
  if (!selectedTrack) return;
  setIsEditingTrack(true);
  setEditedContent(selectedTrack.content);
};
```

#### Save Handler

```typescript
const handleSaveTrack = async () => {
  if (!selectedTrack) return;

  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("talk_tracks")
      .update({ content: editedContent })
      .eq("id", selectedTrack.id);

    if (error) throw error;

    // Update local state
    setTalkTracks((prev) =>
      prev.map((track) =>
        track.id === selectedTrack.id ? { ...track, content: editedContent } : track
      )
    );

    setSelectedTrack((prev) => (prev ? { ...prev, content: editedContent } : null));

    setIsEditingTrack(false);

    // Show saved indicator
    setShowSavedIndicator(true);
    setTimeout(() => setShowSavedIndicator(false), 2000);
  } catch (error) {
    logger.error({ error }, "Failed to save talk track");
    alert("Failed to save changes. Please try again.");
  }
};
```

#### Cancel Handler

```typescript
const handleCancelEdit = () => {
  if (!selectedTrack) return;
  setEditedContent(selectedTrack.content);
  setIsEditingTrack(false);
};
```

---

### 3. **Modal UI Updates**

#### Header with Deck Info

```tsx
<div>
  <h2 className="text-2xl font-bold text-gray-900">Talk Track Script</h2>
  {selectedTrack.deck_structure_id &&
    deckStructureMap.get(selectedTrack.deck_structure_id) && (
      <p className="mt-1 text-sm text-gray-600">
        {deckStructureMap.get(selectedTrack.deck_structure_id)!.title}(
        {deckStructureMap.get(selectedTrack.deck_structure_id)!.slide_count} slides,
        estimated{" "}
        {getDurationRange(
          deckStructureMap.get(selectedTrack.deck_structure_id)!.slide_count
        )}
        )
      </p>
    )}
</div>
```

#### Action Buttons

```tsx
<div className="flex items-center gap-2">
  {showSavedIndicator && (
    <span className="rounded bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
      ✓ Saved
    </span>
  )}
  {isEditingTrack ? (
    <>
      <button onClick={handleSaveTrack}>Save</button>
      <button onClick={handleCancelEdit}>Cancel</button>
    </>
  ) : (
    <button onClick={handleEditTrack}>Edit</button>
  )}
  <button
    onClick={() => {
      setSelectedTrack(null);
      setIsEditingTrack(false);
    }}
  >
    ×
  </button>
</div>
```

#### Content Area (View/Edit Toggle)

```tsx
<div className="flex-1 overflow-hidden">
  {isEditingTrack ? (
    <textarea
      value={editedContent}
      onChange={(e) => setEditedContent(e.target.value)}
      className="h-full w-full resize-none border-none p-6 font-mono text-sm leading-relaxed text-gray-900 focus:ring-0"
      placeholder="Edit your talk track here..."
    />
  ) : (
    <div className="h-full overflow-y-scroll p-6">
      <div className="prose max-w-none">
        <pre className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm">
          {selectedTrack.content}
        </pre>
      </div>
    </div>
  )}
</div>
```

---

### 4. **Deck Structure Map for Quick Lookup**

Instead of looking up deck structure info every time, we create a map:

```typescript
const [deckStructureMap, setDeckStructureMap] = useState<
  Map<string, DeckStructureForDisplay>
>(new Map());

// When loading deck structures:
const map = new Map(
  transformed.map((deck) => [
    deck.id,
    {
      id: deck.id,
      title: deck.title,
      slide_count: deck.slide_count,
    },
  ])
);
setDeckStructureMap(map);
```

This allows O(1) lookup:

```typescript
deckStructureMap.get(track.deck_structure_id)?.slide_count;
```

---

## 📊 Duration Examples

| Slides | Min Duration | Max Duration | Display     |
| ------ | ------------ | ------------ | ----------- |
| 5      | 1 min        | 3 min        | "1-3 min"   |
| 10     | 3 min        | 5 min        | "3-5 min"   |
| 20     | 5 min        | 10 min       | "5-10 min"  |
| 55     | 14 min       | 28 min       | "14-28 min" |

Formula:

- **Min**: `(slides × 15 seconds) / 60`
- **Max**: `(slides × 30 seconds) / 60`

---

## 🎨 UX Improvements

### Before

- Single duration number (not realistic)
- No way to edit talk tracks
- Had to regenerate for changes

### After

- **Realistic range**: "5-10 min estimated"
- **Inline editing**: Click Edit, modify, Save
- **Visual feedback**: "✓ Saved" indicator
- **Deck context**: Shows deck title and slide count in modal
- **Smart fallback**: Shows old duration if deck not found

---

## 🔄 Edit Workflow

```
1. User clicks on talk track card
   ↓
2. Modal opens in view mode
   ↓
3. User clicks "Edit" button
   ↓
4. Textarea appears with content
   ↓
5. User edits the text
   ↓
6. User clicks "Save"
   ↓
7. Updates Supabase database
   ↓
8. Updates local state
   ↓
9. Shows "✓ Saved" for 2 seconds
   ↓
10. Switches back to view mode
```

### Cancel Flow

```
1. User clicks "Cancel"
   ↓
2. Resets textarea to original content
   ↓
3. Switches back to view mode
   ↓
4. No database update
```

---

## 🗄️ Database Operations

### Update Talk Track Content

```typescript
const { error } = await supabase
  .from("talk_tracks")
  .update({ content: editedContent })
  .eq("id", selectedTrack.id);
```

No API route needed - direct Supabase client update from browser (RLS protected).

---

## 📝 Files Changed

1. **`app/funnel-builder/[projectId]/step/6/page.tsx`**
   - Added `getDurationRange()` helper
   - Added edit state management
   - Added `handleEditTrack()`, `handleSaveTrack()`, `handleCancelEdit()`
   - Updated modal UI with Edit/Save/Cancel buttons
   - Updated duration display to show ranges
   - Added deck structure map for quick lookups
   - Added textarea for editing mode
   - Added saved indicator

---

## ✨ Key Features

1. **Realistic Durations** 📊
   - 15-30 seconds per slide
   - Shows as range: "5-10 min"
   - Based on actual slide count

2. **Inline Editing** ✏️
   - Edit directly in modal
   - Monospace font for readability
   - Full-height textarea
   - Save/Cancel buttons

3. **Visual Feedback** ✅
   - "✓ Saved" indicator
   - Smooth transitions
   - Clear button states

4. **Smart Context** 🧠
   - Shows deck title in modal
   - Shows slide count
   - Shows duration range
   - Fast lookups with map

5. **Data Integrity** 🔒
   - Canceling restores original
   - Local state updates immediately
   - Database updates asynchronously
   - Error handling with alerts

---

## 🧪 Testing Checklist

- [x] Duration range displays correctly (5 slides = "1-3 min")
- [x] Duration range displays correctly (55 slides = "14-28 min")
- [x] Edit button switches to textarea mode
- [x] Save button updates database and local state
- [x] Cancel button restores original content
- [x] Saved indicator shows for 2 seconds
- [x] Modal close resets edit state
- [x] Deck title shows in modal header
- [x] Duration range shows in modal header
- [x] Works with and without deck_structure_id

---

## 🎉 Result

Step 6 now provides:

- ✅ Realistic duration estimates
- ✅ Professional inline editing
- ✅ Excellent UX with visual feedback
- ✅ Fast performance with smart caching
- ✅ Consistent with v1 patterns

Users can generate talk tracks, see realistic time estimates, and edit them inline
without regenerating!
