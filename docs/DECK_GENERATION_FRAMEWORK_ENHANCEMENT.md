# Deck Generation Framework Enhancement

## Overview

Enhanced the deck generation system in genie-v3 to use the **Magnetic Masterclass
Framework** with intake call transcripts, following the proven v1 implementation
pattern. The system now supports both a 5-slide test mode and full 55-slide deck
generation.

---

## Key Features

### 1. Magnetic Masterclass Framework Integration

The deck generation now uses the comprehensive 55-slide framework that includes:

- **Slides 1-10**: Hook & Introduction
- **Slides 11-20**: Personal Story Arc
- **Slides 21-30**: System Development
- **Slides 31-40**: Framework Teaching (Step 1)
- **Slides 41-50**: Framework Teaching (Steps 2-3)
- **Slides 51-55**: Offer & Close

Each slide includes:

- Content Strategy
- Focus Areas
- Image Strategy
- Purpose
- Psychology (behavioral science)

### 2. Test Mode (5 Slides)

Quickly test the generation process with the first 5 slides from the framework:

- **Generation time**: ~30 seconds
- **Use case**: Quick validation, testing, prototyping
- **Slides generated**: Hook & Introduction section

### 3. Full Deck Mode (55 Slides)

Complete Magnetic Masterclass Framework deck:

- **Generation time**: ~3-5 minutes
- **Use case**: Production-ready presentation decks
- **Slides generated**: All 55 slides following the complete framework

### 4. Chunked Generation

Based on v1's proven approach:

- Splits framework into 10-slide chunks
- Generates each chunk sequentially
- 2-second delay between chunks to avoid rate limits
- Graceful error handling with placeholder slides
- Maintains framework structure and context

---

## Implementation Details

### File Changes

#### 1. **API Route**: `app/api/generate/deck-structure/route.ts`

**Key Changes**:

- Added `slideCount` parameter (`"5"` or `"55"`)
- Framework template loading from `templates/` directory
- Chunked generation with `splitFrameworkIntoChunks()`
- Test mode support with `extractTestSlides()`
- Enhanced prompt that uses framework guidance

**How It Works**:

```typescript
// 1. Load framework template
const frameworkContent = fs.readFileSync(frameworkPath, "utf8");

// 2. Split into chunks (or extract test slides)
if (isTestMode) {
  const testChunk = extractTestSlides(frameworkContent);
  generatedSlides = await generateSlideChunk(transcript, testChunk);
} else {
  const slideChunks = splitFrameworkIntoChunks(frameworkContent);
  for (const chunk of slideChunks) {
    const chunkSlides = await generateSlideChunk(transcript, chunk);
    allSlides.push(...chunkSlides);
  }
}

// 3. Each chunk gets framework context + transcript
const prompt = `
FRAMEWORK TEMPLATE SECTION FOR THESE SLIDES:
${chunkContent}

TRANSCRIPT TO EXTRACT CLIENT INFORMATION FROM:
${transcript}

CRITICAL INSTRUCTIONS:
1. Follow the Magnetic Masterclass Framework structure EXACTLY
2. Extract client's specific details from the transcript
3. Use the framework's Content Strategy, Focus Areas, and Purpose
...
`;
```

**Error Handling**:

- Placeholder slides for failed chunks
- Detailed logging with Pino logger
- Graceful degradation

#### 2. **Frontend**: `app/funnel-builder/[projectId]/step/3/page.tsx`

**Key Changes**:

- Added `slideCount` state (`"5"` | `"55"`)
- Visual toggle buttons for deck size selection
- Dynamic generation time estimates
- Passes `slideCount` to API

**UI Components**:

```tsx
// Deck size selector
<div className="grid grid-cols-2 gap-3">
  <button onClick={() => setSlideCount("5")}>
    <div>5 Slides</div>
    <div>Test Mode (~30s)</div>
  </button>
  <button onClick={() => setSlideCount("55")}>
    <div>55 Slides</div>
    <div>Full Deck (~3-5 min)</div>
  </button>
</div>
```

#### 3. **Template**: `templates/2.1 Magnetic Masterclass Framework - 55 Slides.md`

Comprehensive framework document copied from v1 that includes:

- Complete slide-by-slide guidance
- Content strategy for each slide
- Psychological principles
- Image strategy recommendations
- Section organization (hook → problem → agitate → solution → offer → close)

---

## How It Works: Step-by-Step

### User Flow

1. **User selects intake call transcript** from Step 1 (AI Intake Call)
2. **User chooses deck size**:
   - 5 slides for quick test
   - 55 slides for full deck
3. **User clicks "Generate Deck Structure"**
4. **System processes**:
   - Loads Magnetic Masterclass Framework template
   - Extracts transcript content
   - Splits into chunks (or uses first 5 for test)
   - Generates each chunk with AI using framework guidance
   - Saves to database
5. **User can**:
   - View generated slides
   - Edit slide content
   - Download as JSON
   - Use in Step 4 (Gamma Presentation)

### AI Generation Process

For each chunk of slides:

```
1. Framework Section (from template file)
   ↓
2. Client Transcript (from VAPI call)
   ↓
3. AI Prompt (combines framework + transcript)
   ↓
4. OpenAI GPT-4 Generation
   ↓
5. JSON Response Parsing
   ↓
6. Slide Objects Created
   {
     slideNumber: 1,
     title: "...",
     description: "...",
     section: "hook"
   }
```

### Framework Context

The AI receives detailed context for each slide:

- **Content Strategy**: What to include and structure
- **Focus Areas**: Key priorities and messaging
- **Image Strategy**: Visual elements approach
- **Purpose**: Specific goal of the slide
- **Psychology**: Behavioral science behind it

This ensures each generated slide:

- Follows the proven conversion framework
- Uses the client's authentic story
- Maintains psychological progression
- Creates compelling, sales-focused content

---

## Technical Architecture

### Data Flow

```
Step 1: AI Intake Call
  ↓ (VAPI transcript stored)
Step 3: Deck Structure Generation
  ↓
[Frontend] User selects:
  - Transcript
  - Slide count (5 or 55)
  ↓
[API] POST /api/generate/deck-structure
  - Load framework template
  - Split into chunks
  - Generate with OpenAI
  - Save to database
  ↓
[Database] deck_structures table
  {
    funnel_project_id,
    user_id,
    title,
    slides: [...]
  }
  ↓
[Frontend] Display generated deck
  - View in editor
  - Download
  - Use in Step 4
```

### API Request/Response

**Request**:

```json
{
  "projectId": "uuid",
  "transcriptId": "uuid",
  "slideCount": "5" | "55"
}
```

**Response**:

```json
{
  "success": true,
  "deckStructure": {
    "id": "uuid",
    "title": "Magnetic Masterclass - 10/23/2025",
    "slides": [
      {
        "slideNumber": 1,
        "title": "Masterclass Title",
        "description": "Headline: The name of the masterclass...",
        "section": "hook"
      },
      ...
    ],
    "created_at": "2025-10-23T..."
  }
}
```

---

## Benefits Over Previous Implementation

| Feature        | Old Implementation         | New Implementation                   |
| -------------- | -------------------------- | ------------------------------------ |
| Framework      | Generic prompt             | Magnetic Masterclass Framework       |
| Chunking       | Single generation          | 10-slide chunks                      |
| Test Mode      | None                       | 5-slide quick test                   |
| Context        | Limited                    | Full framework guidance per slide    |
| Error Handling | Basic                      | Placeholder slides, detailed logging |
| Scalability    | Single call (timeout risk) | Chunked with delays                  |
| Quality        | Generic structure          | Psychology-backed framework          |

---

## Usage Examples

### Test Mode (Rapid Prototyping)

```typescript
// Frontend
setSlideCount("5");
handleGenerateDeck();

// Result: ~30 seconds
// 5 slides: Hook & Introduction section
```

### Full Deck (Production)

```typescript
// Frontend
setSlideCount("55");
handleGenerateDeck();

// Result: ~3-5 minutes
// 55 slides: Complete framework
```

---

## Performance Characteristics

### Test Mode (5 Slides)

- **API Calls**: 1
- **Tokens**: ~1,500-2,000
- **Time**: 20-40 seconds
- **Cost**: ~$0.01-0.02

### Full Mode (55 Slides)

- **API Calls**: 6 (5.5 chunks)
- **Tokens**: ~15,000-20,000
- **Time**: 3-5 minutes
- **Cost**: ~$0.10-0.15
- **Rate Limiting**: 2-second delays between chunks

---

## Error Handling

### Scenario 1: Framework File Not Found

```typescript
// Error response
{
  "error": "Framework template not found at /path/to/template"
}
```

### Scenario 2: Chunk Generation Fails

```typescript
// System adds placeholder slides
{
  slideNumber: 11,
  title: "Slide 11 - To Be Completed",
  description: "This slide needs to be manually created or regenerated.",
  section: "pending"
}
```

### Scenario 3: AI Parsing Error

```typescript
// Logged and re-thrown
requestLogger.error({ error }, "Failed to parse AI response");
throw error;
```

---

## Future Enhancements

### Possible Improvements

1. **Custom Frameworks**: Allow users to upload their own framework templates
2. **Slide Regeneration**: Regenerate individual slides without full deck
3. **A/B Testing**: Generate multiple versions for comparison
4. **Voice & Tone**: Customizable style parameters (professional, casual, energetic)
5. **Industry Templates**: Pre-built frameworks for specific industries
6. **Collaboration**: Share and edit decks with team members
7. **Analytics**: Track which frameworks convert best
8. **Import/Export**: Support PowerPoint, Google Slides export

---

## Reference: v1 Implementation

This enhancement is based on the proven v1 implementation:

**Key Files Referenced**:

- `genie-v1/app/api/generate-deck/route.ts` - Chunking logic
- `genie-v1/app/api/generate-gamma-deck/route.ts` - Test mode (line 164)
- `genie-v1/docs/Templates/2.1 Magnetic Masterclass Framework - 55 Slides.md` -
  Framework template

**Key Learnings from v1**:

- Chunking prevents timeouts and improves reliability
- Framework context dramatically improves quality
- Test mode enables rapid iteration
- 2-second delays prevent rate limit issues
- Placeholder slides maintain structure on errors

---

## Testing Guide

### Test Checklist

- [ ] Test mode generates 5 slides (~30 seconds)
- [ ] Full mode generates 55 slides (~3-5 minutes)
- [ ] Framework template loads successfully
- [ ] Transcript data is properly used
- [ ] Slides follow framework structure
- [ ] Error handling works (placeholder slides)
- [ ] UI toggle switches between modes
- [ ] Generation time estimates are accurate
- [ ] Saved decks appear in list
- [ ] Deck editor opens and displays slides
- [ ] Download JSON functionality works

### Manual Test Steps

1. Complete Step 1 (AI Intake Call)
2. Navigate to Step 3 (Deck Structure)
3. Select a transcript
4. Choose "5 Slides" test mode
5. Click "Generate Deck Structure"
6. Verify 5 slides generated correctly
7. Repeat with "55 Slides" full mode
8. Verify all 55 slides generated
9. Open deck editor and review content
10. Download deck as JSON

---

## Troubleshooting

### Issue: Framework file not found

**Solution**: Verify file exists at
`genie-v3/templates/2.1 Magnetic Masterclass Framework - 55 Slides.md`

### Issue: Generation takes too long

**Solution**: Use test mode (5 slides) for faster iteration

### Issue: Slides don't match framework

**Solution**: Check prompt includes framework section content

### Issue: Rate limit errors

**Solution**: 2-second delays are implemented; increase if needed

### Issue: Placeholder slides appear

**Solution**: Check OpenAI API key and quota; regenerate failed chunks

---

## Conclusion

This enhancement brings genie-v3 up to par with v1's proven deck generation system while
maintaining the modern architecture and improved user experience. The Magnetic
Masterclass Framework integration ensures high-quality, conversion-focused presentations
that are personalized to each client's intake call.

**Key Wins**: ✅ Framework-guided generation ✅ Test mode for rapid iteration ✅ Chunked
processing for reliability ✅ Enhanced AI context for quality ✅ Proven conversion
psychology ✅ Clean, maintainable code
