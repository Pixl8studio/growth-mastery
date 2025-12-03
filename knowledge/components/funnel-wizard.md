# Component: 11-Step Funnel Wizard

## What It Is

The core UI of Growth Mastery - a guided 11-step process that takes creators from
initial intake call through published webinar funnel. Each step focuses on one aspect of
the funnel, making the complex process manageable.

## Why It Exists

**Problem**: Creating a webinar funnel is overwhelming. Where do you start? What order?
What's required?

**Solution**: Linear wizard that enforces logical sequence and prevents missing critical
pieces.

## The 11 Steps

### Step 1: AI Intake Call

**Purpose**: Capture creator's expertise via AI voice conversation **Input**: Creator
talks to VAPI AI assistant **Output**: Transcript stored in `vapi_transcripts` table
**Key Decision**: Use VAPI for natural conversation vs. form filling **Status**: ✅
Complete (VAPI integration ready)

### Step 2: Craft Offer

**Purpose**: Define what's being sold and who it's for **Input**: Manual entry or AI
generation from transcript **Output**: Offer details in `offers` table **Key Decision**:
AI generates from transcript or creator edits **Status**: ✅ Complete (AI generation
working)

### Step 3: Deck Structure

**Purpose**: Create 55-slide webinar presentation outline **Input**: Offer + transcript
context **Output**: Structured outline in `deck_structures` table **Key Decision**:
Using Magnetic Masterclass framework (55 slides) **Status**: ✅ Complete (AI generation
working)

### Step 4: Gamma Presentation

**Purpose**: Generate visual slides from structure **Input**: Deck structure + theme
selection **Output**: Gamma deck URL in `gamma_decks` table **Key Decision**: Gamma API
for professional design vs. custom builder **Status**: ✅ Complete (20 themes available)

### Step 5: Enrollment Page

**Purpose**: Create sales/enrollment page for offer **Input**: Offer details **Output**:
Enrollment page content in `enrollment_pages` table **Key Decision**: Two types -
booking call vs. direct purchase **Status**: ✅ Complete (AI generation working)

### Step 6: Talk Track

**Purpose**: Generate webinar script/presenter notes **Input**: Deck structure + offer
**Output**: Script in `talk_tracks` table **Key Decision**: Full script vs. bullet
points (chose full script) **Status**: ✅ Complete (AI generation working)

### Step 7: Upload Video

**Purpose**: Upload recorded webinar video **Input**: Video file **Output**: Cloudflare
Stream URL in `pitch_videos` table **Key Decision**: Cloudflare Stream for enterprise
delivery **Status**: ✅ Complete (upload interface ready)

### Step 8: Watch Page

**Purpose**: Create video viewing page with CTA **Input**: Video + offer **Output**:
Watch page content in `watch_pages` table **Key Decision**: Embedded player with
milestone tracking **Status**: ✅ Complete (AI generation working)

### Step 9: Registration Page

**Purpose**: Create signup page for webinar **Input**: Offer + webinar value prop
**Output**: Registration page content in `registration_pages` table **Key Decision**:
Benefits-focused copy, simple form **Status**: ✅ Complete (AI generation working)

### Step 10: Flow Configuration

**Purpose**: Link pages together and configure URLs **Input**: Page selections + slug
preferences **Output**: Funnel flow in `funnel_flows` table **Key Decision**: UUID +
optional vanity slug system **Status**: ✅ Complete (dual URL system working)

### Step 11: Analytics & Publish

**Purpose**: Review funnel, publish, and access analytics **Input**: Completed funnel
**Output**: Published status + analytics dashboard **Key Decision**: One-click publish
with preview mode **Status**: ✅ Complete (publish system working)

## Key Design Decisions

### Linear vs. Non-Linear

**Choice**: Linear wizard (can't skip ahead) **Why**: Ensures completion, prevents
confusion **Trade-off**: Less flexibility, but higher completion rate **Learning**:
Could add "skip" for advanced users later

### Progress Tracking

**Choice**: Visual stepper at top showing position **Why**: Clear progress indication
reduces abandonment **Implementation**: `StepperNav` component with completion states
**Data**: `funnel_projects.current_step` tracks position

### Save Behavior

**Choice**: Auto-save on every change **Why**: Prevents lost work, enables resume
**Implementation**: Debounced saves to database **Edge Cases**: Handle concurrent edits
(last-write-wins)

### Validation Strategy

**Choice**: Soft validation (warnings, not blockers) **Why**: Don't prevent progress,
but show issues **Implementation**: Yellow indicators for incomplete sections
**Learning**: Hard validation frustrated users in testing

### AI Generation Timing

**Choice**: On-demand generation per step **Why**: User controls when to
generate/regenerate **Alternative Considered**: Auto-generate entire funnel upfront
**Why Not**: Less control, wastes tokens on unused content

### Step Completion Criteria

**Choice**: Fuzzy completion (something entered, not perfect) **Why**: Get creators to
finish vs. perfecting each step **Implementation**: Green check if data exists, not
validated **Philosophy**: Published imperfect > perfect unpublished

## Technical Architecture

### Data Model

```
funnel_projects (parent)
├── vapi_transcripts
├── offers
├── deck_structures
├── gamma_decks
├── enrollment_pages
├── talk_tracks
├── pitch_videos
├── watch_pages
├── registration_pages
└── funnel_flows
```

### State Management

- Zustand store for in-memory step state
- Database as source of truth
- Optimistic UI updates with rollback

### Navigation

- Step-to-step: Next/Previous buttons
- Jump to step: Stepper nav (if step completed)
- Exit wizard: Dashboard link (saves progress)

### URL Structure

```
/funnel-builder/[projectId]/step-1
/funnel-builder/[projectId]/step-2
...
/funnel-builder/[projectId]/step-11
```

## Common Issues & Solutions

### Issue: Users skip AI generation

**Symptom**: Blank fields in later steps **Solution**: Default prompts "Try AI
generation" if empty **Status**: Implemented

### Issue: Users lose progress

**Symptom**: Browser crash, accidental navigation **Solution**: Auto-save + resume from
`current_step` **Status**: Implemented

### Issue: Confusion about order

**Symptom**: "Why can't I do enrollment before offer?" **Solution**: Clear step
descriptions + tooltips **Status**: Ongoing (improve copy)

### Issue: Slow AI generation

**Symptom**: 30-60 second waits for generation **Solution**: Loading states + progress
indicators **Status**: Implemented (could add streaming later)

## Metrics to Track

**Completion Rates**:

- % who complete each step
- Drop-off points (where do they abandon?)
- Time spent per step
- Steps where users get stuck

**AI Usage**:

- % who use AI vs. manual entry per step
- Regeneration rates (sign of poor quality)
- Token usage per step

**Overall Funnel**:

- Time from step 1 → step 11 (first funnel)
- % who publish (step 11)
- % who return after abandonment

## Future Enhancements

### Phase 2 Potential

- [ ] Skip steps for advanced users
- [ ] Duplicate/clone funnels
- [ ] Templates (save funnel as template)
- [ ] Step reordering (advanced mode)
- [ ] Bulk AI generation (all steps at once)
- [ ] AI preview before generating (token savings)

### Phase 3 Potential

- [ ] Collaboration (multiple users on funnel)
- [ ] Version history / rollback
- [ ] A/B testing variants
- [ ] Smart suggestions based on industry

## Design Principles

1. **One Thing at a Time**: Each step focuses on single task
2. **Progress Over Perfection**: Encourage completion, refinement later
3. **AI as Assistant**: Suggest, don't force AI generation
4. **Clear Path Forward**: Always obvious what to do next
5. **Never Lose Work**: Auto-save everything
6. **Visual Progress**: See where you are, what's left

## Related Components

- AI Generation (`/api/generate/*`)
- Public Pages (`/p/[pageId]`, `/[username]/[slug]`)
- Project Dashboard (`/funnel-builder`)
- Analytics (`components/analytics/*`)

---

_Last Updated: 2025-12-03_ _Status: ✅ All 11 steps complete and functional_ _Key
Metric: Completion rate (target 70%+)_ _Next Evolution: Duplication and templating
(Phase 2)_
