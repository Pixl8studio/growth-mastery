# Step 6: Talk Track Enhancement - Complete ✅

## Overview

Enhanced Step 6 (Talk Track generation) to properly reference deck structures and
generate slide-by-slide scripts with 2-4 sentences per slide using chunked generation
for better quality and performance.

---

## Problem Statement

### Original Issues:

1. **API Mismatch**: Step 6 UI was passing `projectId` but API expected
   `deckStructureId`
2. **No Deck Selector**: Users couldn't select which deck structure to generate talk
   track from
3. **Wrong Dependency**: Checked for Gamma deck instead of deck structure
4. **Monolithic Generation**: Generated entire talk track at once (poor quality for 55+
   slides)
5. **Verbose Scripts**: No constraint on sentence count per slide

---

## Solution Implemented

### 1. Updated Step 6 UI (`app/funnel-builder/[projectId]/step/6/page.tsx`)

#### Added Deck Structure Selector

```typescript
interface DeckStructure {
  id: string;
  title: string;
  slide_count: number;
  slides: unknown[];
  created_at: string;
}

const [deckStructures, setDeckStructures] = useState<DeckStructure[]>([]);
const [selectedDeckId, setSelectedDeckId] = useState("");
```

#### Load Deck Structures from Database

- Fetches all deck structures for the project
- Auto-selects first deck if available
- Shows count and title for each deck

#### Proper Dependency Check

- Changed from checking Gamma decks to checking deck structures
- Points to Step 3 (Deck Structure) instead of Step 4 (Gamma)
- Shows helpful message if no deck structures exist

#### Updated Generation Call

```typescript
const response = await fetch("/api/generate/talk-track", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    projectId,
    deckStructureId: selectedDeckId,
  }),
});
```

---

### 2. Updated API Route (`app/api/generate/talk-track/route.ts`)

#### Chunked Generation (Similar to Deck Generation)

```typescript
function splitSlidesIntoChunks(slides: Slide[]): SlideChunk[] {
  const chunks: SlideChunk[] = [];
  const slidesPerChunk = 10;

  for (let i = 0; i < slides.length; i += slidesPerChunk) {
    const chunkSlides = slides.slice(i, i + slidesPerChunk);
    chunks.push({
      startSlide: i + 1,
      endSlide: Math.min(i + slidesPerChunk, slides.length),
      slides: chunkSlides,
    });
  }

  return chunks;
}
```

#### 2-4 Sentences Per Slide Constraint

```typescript
const prompt = `You are a master presentation coach creating a video script for a pitch presentation.

Generate a natural, conversational script for these slides. For EACH slide, provide:
- 2-4 compelling sentences that the presenter will say
- Natural transitions between slides
- Conversational language (use "you", be authentic)
- Estimated duration in seconds
- Delivery notes (tone, pacing, emphasis)

Each script should be 2-4 sentences, conversational, and compelling.
Duration should be 15-30 seconds per slide depending on content complexity.`;
```

#### Proper Database Saving

```typescript
const { data: savedTalkTrack, error: saveError } = await supabase
  .from("talk_tracks")
  .insert({
    funnel_project_id: projectId,
    deck_structure_id: deckStructureId,
    user_id: user.id,
    content,
    slide_timings: {
      totalDuration: Math.round(totalDuration),
      slides: allTalkTrackSlides.map((s) => ({
        slideNumber: s.slideNumber,
        duration: s.duration,
      })),
    },
    total_duration: Math.round(totalDuration),
  })
  .select()
  .single();
```

#### Formatted Content Output

```markdown
# Talk Track Script

Total Duration: 18 minutes

---

## Slide 1

**Duration**: 25 seconds

**Script**: [2-4 sentences of compelling, conversational copy]

**Delivery Notes**: [Tone, pacing, emphasis guidance]

---
```

---

## Key Benefits

### 1. **Better Quality Scripts**

- Chunked generation (10 slides at a time) = better context management
- 2-4 sentence constraint = concise, focused scripts
- Proper timing estimation (15-30 seconds per slide)

### 2. **Proper Dependencies**

- Talk tracks now properly reference deck structures
- Database relationships maintained correctly
- Can generate multiple talk tracks from same deck

### 3. **Better UX**

- Visual deck selector with slide count
- Auto-selects first deck
- Clear dependency warnings
- Shows generation progress

### 4. **Performance**

- Chunked generation prevents timeout issues
- 2-second delays between chunks prevent rate limits
- Better error handling and recovery

---

## Database Schema (Already Exists)

```sql
CREATE TABLE IF NOT EXISTS public.talk_tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_project_id UUID REFERENCES public.funnel_projects(id) ON DELETE CASCADE,
  deck_structure_id UUID REFERENCES public.deck_structures(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Script content
  content TEXT NOT NULL,
  slide_timings JSONB DEFAULT '[]',
  total_duration INTEGER, -- seconds

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Generation Flow

```
1. User selects deck structure from dropdown
   ↓
2. Click "Generate Talk Track"
   ↓
3. API loads deck structure (e.g., 55 slides)
   ↓
4. Split into chunks (e.g., 6 chunks of 10 slides each)
   ↓
5. For each chunk:
   - Generate 2-4 sentences per slide
   - Include timing and delivery notes
   - Wait 2 seconds before next chunk
   ↓
6. Combine all chunks
   ↓
7. Calculate total duration
   ↓
8. Format as readable markdown
   ↓
9. Save to database with all relationships
   ↓
10. Return to UI and display
```

---

## Example Output

### Slide 5: "The Hidden Cost"

**Duration**: 20 seconds

**Script**: But here's what most people don't realize—this isn't just costing you time.
Every day you struggle with this, you're losing money, opportunities, and peace of mind.
The real question is: how much longer can you afford to wait?

**Delivery Notes**: Build tension here. Pause after "losing money." Make eye contact.
Lower voice slightly for emphasis.

---

## Testing Checklist

- [x] Deck structure selector loads correctly
- [x] Auto-selects first deck
- [x] Dependency warning shows when no deck structures
- [x] Generation works with chunking
- [x] 2-4 sentences per slide enforced
- [x] Database saves correctly with all relationships
- [x] Talk track displays properly
- [x] Download works
- [x] Delete works
- [x] Multiple talk tracks can be generated

---

## Files Changed

1. **`app/funnel-builder/[projectId]/step/6/page.tsx`**
   - Added deck structure selector
   - Updated API call to include both projectId and deckStructureId
   - Changed dependency check to deck structures
   - Updated UI messaging

2. **`app/api/generate/talk-track/route.ts`**
   - Implemented chunked generation
   - Added 2-4 sentence constraint
   - Proper database saving with relationships
   - Better error handling and logging
   - Formatted content output

3. **`lib/ai/prompts.ts`**
   - Updated `createTalkTrackPrompt` with 2-4 sentence guidance
   - Added note about new chunked implementation

---

## Future Enhancements (Optional)

1. **Real-time Progress**: Show which chunk is being generated
2. **Regenerate Single Slide**: Allow regenerating specific slides
3. **Voice Preview**: Text-to-speech preview of scripts
4. **A/B Testing**: Generate multiple versions and compare
5. **Tone Selector**: Formal, casual, energetic, etc.

---

## Conclusion

Step 6 is now a robust, high-quality talk track generator that:

- References deck structures properly
- Generates concise, compelling scripts (2-4 sentences per slide)
- Uses chunked generation for better performance
- Maintains proper database relationships
- Provides excellent UX with deck selection

Users can now generate professional presentation scripts directly from their deck
structures, with timing and delivery guidance included.
