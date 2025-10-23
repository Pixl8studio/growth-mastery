# Database Schema Fix for Deck Generation

## Issue

The deck generation API was failing with:

```
Could not find the 'title' column of 'deck_structures' in the schema cache
```

## Root Cause

**V1 Schema** used `generated_decks` table with a `title` column:

```sql
CREATE TABLE generated_decks (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  slide_count INTEGER DEFAULT 55,
  ...
);
```

**V3 Schema** uses `deck_structures` table **without** a `title` column:

```sql
CREATE TABLE deck_structures (
  id UUID PRIMARY KEY,
  funnel_project_id UUID,
  user_id UUID NOT NULL,
  template_type TEXT DEFAULT '55_slide_promo',
  total_slides INTEGER DEFAULT 55,
  slides JSONB NOT NULL,
  sections JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',  -- Title goes here!
  ...
);
```

## Solution

### 1. API Route Fix (`app/api/generate/deck-structure/route.ts`)

**Before:**

```typescript
.insert({
  funnel_project_id: projectId,
  user_id: user.id,
  title: "Magnetic Masterclass - ...",  // ❌ Column doesn't exist
  slides: generatedSlides,
})
```

**After:**

```typescript
.insert({
  funnel_project_id: projectId,
  user_id: user.id,
  template_type: isTestMode ? "5_slide_test" : "55_slide_masterclass",
  total_slides: generatedSlides.length,
  slides: generatedSlides,
  sections: {},
  metadata: {
    title: deckTitle,  // ✅ Title in metadata JSONB
    framework: "Magnetic Masterclass",
    generatedAt: new Date().toISOString(),
    slideCount: generatedSlides.length,
    mode: isTestMode ? "test" : "full",
  },
})
```

### 2. Frontend Fix (`app/funnel-builder/[projectId]/step/3/page.tsx`)

**Before:**

```typescript
title: deck.title || "Untitled Deck",  // ❌ Column doesn't exist
```

**After:**

```typescript
title: deck.metadata?.title || "Untitled Deck",  // ✅ Read from metadata
slideCount: Array.isArray(deck.slides)
  ? deck.slides.length
  : deck.total_slides || 55,  // ✅ Use total_slides as fallback
```

### 3. Name Editing Fix

**Before:**

```typescript
.update({ title: editingDeckName.trim() })  // ❌ Column doesn't exist
```

**After:**

```typescript
// Get current metadata first
const { data: currentDeck } = await supabase
  .from("deck_structures")
  .select("metadata")
  .eq("id", deckId)
  .single();

// Update metadata object
const updatedMetadata = {
  ...(currentDeck?.metadata || {}),
  title: editingDeckName.trim(),
};

// Save updated metadata
.update({ metadata: updatedMetadata })
```

## V3 Schema Design

The v3 schema is more flexible:

- **`template_type`**: Identifies the deck type (e.g., "5_slide_test",
  "55_slide_masterclass")
- **`total_slides`**: Quick access to slide count without parsing JSONB
- **`slides`**: JSONB array of slide objects
- **`sections`**: JSONB for section organization
- **`metadata`**: JSONB for flexible attributes like title, framework name, generation
  settings, etc.

### Benefits:

1. **Flexible metadata** - Add any custom fields without schema changes
2. **Proper indexing** - `total_slides` is indexed for fast queries
3. **Type safety** - `template_type` helps identify deck structure
4. **Extensible** - Can add more metadata without migrations

## Data Structure

### Slides Array (JSONB)

```json
[
  {
    "slideNumber": 1,
    "title": "Masterclass Title",
    "description": "Content for this slide...",
    "section": "hook"
  },
  {
    "slideNumber": 2,
    "title": "The Big Promise",
    "description": "Transformation outcomes...",
    "section": "hook"
  },
  ...
]
```

### Metadata Object (JSONB)

```json
{
  "title": "Magnetic Masterclass - 10/23/2025",
  "framework": "Magnetic Masterclass",
  "generatedAt": "2025-10-23T12:34:56Z",
  "slideCount": 5,
  "mode": "test"
}
```

## Migration Path from V1 to V3

If migrating data from v1 `generated_decks` to v3 `deck_structures`:

```sql
INSERT INTO deck_structures (
  funnel_project_id,
  user_id,
  template_type,
  total_slides,
  slides,
  metadata
)
SELECT
  funnel_id,
  user_id,
  CASE
    WHEN slide_count = 5 THEN '5_slide_test'
    ELSE '55_slide_masterclass'
  END,
  slide_count,
  content::jsonb,  -- Parse content to JSONB
  jsonb_build_object(
    'title', title,
    'framework', 'Magnetic Masterclass',
    'migratedFrom', 'v1'
  )
FROM generated_decks;
```

## Testing Checklist

- [x] Generate 5-slide test deck
- [x] Generate 55-slide full deck
- [x] View generated deck
- [x] Edit deck name (inline editing)
- [x] Save edited deck structure
- [x] Download deck as JSON
- [x] Use deck in Step 4 (Gamma Presentation)

## Result

✅ Deck generation now works with v3's schema ✅ Title stored in flexible metadata JSONB
✅ Compatible with existing v3 database structure ✅ No migration needed ✅ Maintains v1
functionality with v3 architecture
