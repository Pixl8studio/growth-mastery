# Component: AI Content Generation

## What It Is

The "magic" of Growth Mastery - AI-powered content generation that transforms a
15-minute intake conversation into complete webinar funnel copy. Uses OpenAI GPT-4o with
specialized prompts to generate offers, deck structures, scripts, and sales copy that
sound human and convert.

## Why This Is Core

**This is our moat**. Anyone can build page templates. AI generation that understands
marketing frameworks and produces conversion-focused copy is the defensible advantage.

## Generation Types

### 1. Offer Generation

**Input**: VAPI transcript from intake call **Output**: Structured offer with headline,
target audience, transformation promise, price, format **Prompt Strategy**: Extract pain
points, desired outcomes, unique mechanism **Quality Bar**: Must sound like creator's
voice, not generic AI **Endpoint**: `/api/generate/offer`

**Key Elements Generated**:

- Value proposition headline
- Target audience description (who it's for)
- Core transformation (from X to Y)
- Delivery format (course, coaching, etc.)
- Pricing strategy guidance
- Positioning vs. alternatives

### 2. Deck Structure (55 Slides)

**Input**: Offer + transcript context **Output**: Complete 55-slide outline following
Magnetic Masterclass framework **Prompt Strategy**: Follow proven webinar structure
(hook → story → teach → offer → close) **Quality Bar**: Logical flow, compelling
narrative, natural transitions **Endpoint**: `/api/generate/deck-structure`

**Framework Structure**:

- Slides 1-5: Hook (grab attention, credibility)
- Slides 6-15: Origin story (relatability, journey)
- Slides 16-25: Content (valuable teaching)
- Slides 26-35: Case studies (social proof)
- Slides 36-45: Offer presentation (value stack)
- Slides 46-55: Close (urgency, CTA, FAQ)

### 3. Talk Track / Script

**Input**: Deck structure + offer **Output**: Full webinar script with speaker notes
**Prompt Strategy**: Conversational tone, natural transitions, timing cues **Quality
Bar**: Sounds natural when spoken, maintains engagement **Endpoint**:
`/api/generate/talk-track`

**Key Elements**:

- Opening hook and credibility
- Storytelling beats
- Teaching transitions
- Offer walkthrough
- Objection handling
- Closing sequence

### 4. Enrollment Page Copy

**Input**: Offer details **Output**: Complete sales page with headlines, benefits,
features, CTAs **Prompt Strategy**: VSL (Video Sales Letter) framework adapted for page
**Quality Bar**: Clear value prop, urgency, handles objections **Endpoint**:
`/api/generate/enrollment-copy`

**Sections Generated**:

- Hero headline + subhead
- Problem agitation
- Solution introduction
- Feature list with benefits
- Bonus stack
- Pricing with value comparison
- Guarantee
- FAQ (objection handling)
- CTA variations

### 5. Registration Page Copy

**Input**: Webinar value prop from offer **Output**: Registration page with
benefits-focused copy **Prompt Strategy**: Promise value, create curiosity, remove
friction **Quality Bar**: Clear benefits, low resistance signup **Endpoint**:
`/api/generate/registration-copy`

**Key Elements**:

- Headline (what they'll learn/get)
- 3-5 key bullets (benefits not features)
- Social proof indicators
- Time investment clarity
- Form copy (button text, field labels)

### 6. Watch Page Copy

**Input**: Webinar title + offer **Output**: Watch page intro and CTA copy **Prompt
Strategy**: Frame webinar value, guide to CTA **Quality Bar**: Smooth video → CTA
transition **Endpoint**: `/api/generate/watch-copy`

**Sections**:

- Welcome copy
- Video frame/intro
- Below-video CTA
- Urgency messaging
- Enrollment link text

## Technical Implementation

### OpenAI Integration

**Model**: GPT-4o

- Why: Best quality, understands nuance, follows instructions
- Alternative considered: GPT-4-turbo (cheaper but less consistent)
- Future: Test GPT-4.5 when available

**Temperature**: 0.7

- Why: Creative but consistent
- Too low (0.3): Repetitive, robotic
- Too high (0.9): Unpredictable, off-brand

**Max Tokens**: Varies by generation type

- Offer: 1,000 tokens
- Deck structure: 3,000 tokens
- Talk track: 4,000 tokens
- Sales copy: 2,000 tokens

**Error Handling**:

- Retry logic (3 attempts with exponential backoff)
- Rate limit handling (wait and retry)
- Token limit handling (chunk if needed)
- Fallback to shorter prompt if fails
- Never show raw error to user

### Prompt Engineering

**Prompt Structure**:

```
[SYSTEM ROLE] You are an expert webinar copywriter...
[CONTEXT] Here's the creator's offer and intake call...
[FRAMEWORK] Follow this proven structure...
[CONSTRAINTS] Stay within voice/tone guidelines...
[OUTPUT FORMAT] Return structured JSON with...
```

**Key Principles**:

1. **Examples Matter**: Show don't tell (include 1-2 examples)
2. **Constraints Improve**: "Don't use jargon" better than "write well"
3. **Structure Output**: JSON schema enforces format
4. **Context Window**: Include relevant info only (token efficiency)
5. **Voice Consistency**: Pass creator's language patterns

**Prompt Files**: `lib/ai/prompts.ts`

### Quality Control

**Pre-Generation Validation**:

- Check required context exists (offer, transcript, etc.)
- Validate input quality (transcript length, offer completeness)
- User-facing warning if context thin

**Post-Generation Validation**:

- Check output against schema
- Verify minimum length requirements
- Flag generic phrases ("leverage", "synergy", etc.)
- Ensure personalization tokens present

**User Controls**:

- Preview before accepting
- Regenerate button (new generation, doesn't save)
- Edit after generation (manual refinement)
- Reset to manual (abandon AI, write from scratch)

## Prompt Strategy by Type

### Offer Generation

**Goal**: Extract essence from rambling transcript **Challenge**: Creators talk in
circles, AI must synthesize **Technique**:

- "What is the transformation? From [X] to [Y]"
- "Who is this NOT for?" (clarifies targeting)
- Extract specific language (don't translate to AI-speak)

### Deck Structure

**Goal**: Logical narrative arc that converts **Challenge**: 55 slides can feel
formulaic **Technique**:

- Follow Magnetic Masterclass exactly (proven)
- Inject creator's stories from transcript
- Maintain engagement through transitions

### Talk Track

**Goal**: Natural-sounding script, not robotic **Challenge**: AI tends toward
formal/corporate **Technique**:

- "Write like you're talking to a friend"
- Include contractions, colloquialisms
- "Sound like [creator's name] based on their transcript"

### Sales Copy

**Goal**: Conversion-focused without sounding salesy **Challenge**: Balance urgency with
authenticity **Technique**:

- Lead with transformation, not features
- Use creator's pain point language
- Include objection handling naturally

## Common Issues & Solutions

### Issue: Generic AI Slop

**Symptom**: "Leverage", "synergy", corporate jargon **Root Cause**: Default GPT
training **Solution**: Explicit constraint in prompt: "Avoid business jargon. Sound
human." **Status**: Improved but ongoing

### Issue: Too Long/Too Short

**Symptom**: 200-word paragraph or 2-word bullets **Root Cause**: Unclear length
guidance **Solution**: Specific token counts + example lengths **Status**: Solved

### Issue: Off-Brand Tone

**Symptom**: Doesn't sound like creator **Root Cause**: Not enough voice context
**Solution**: Pass transcript excerpts showing creator's voice **Status**: Improved
significantly

### Issue: Missing Personalization

**Symptom**: Generic copy that could be anyone's **Root Cause**: Prompt doesn't
emphasize specificity **Solution**: "Use specific examples from [offer]" **Status**:
Solved

### Issue: Slow Generation

**Symptom**: 30-60 second waits **Root Cause**: Large context + long output
**Solution**: Loading states + progress indicators **Future**: Streaming output (show
generation in real-time)

## Metrics to Track

**Generation Quality**:

- Regeneration rate (lower = better)
- Manual edit % (how much users change)
- Acceptance rate (use AI vs. write manual)
- Time saved (vs. manual creation)

**Technical**:

- API latency (target < 20s)
- Token usage per generation
- Error/retry rates
- Cost per generation

**Business**:

- Conversion rate (AI-generated vs. manual)
- Creator satisfaction (NPS)
- Support tickets (quality issues)

## Cost Management

**Current Costs** (GPT-4o):

- Offer: ~$0.10
- Deck structure: ~$0.30
- Talk track: ~$0.40
- Sales copy: ~$0.20
- Total per funnel: ~$1.00

**Optimization Strategies**:

- Cache common prompts
- Reduce context window (trim transcripts)
- Use cheaper model for drafts (GPT-4-turbo)
- Batch generations where possible

**At Scale**:

- 1,000 funnels/month = $1,000
- 10,000 funnels/month = $10,000
- Acceptable given $2.5% platform fee revenue

## Future Enhancements

### Phase 2

- [ ] Streaming output (show generation in real-time)
- [ ] Voice/tone customization (formal/casual slider)
- [ ] Industry-specific prompts (coaching vs. consulting)
- [ ] Multi-language support (Spanish first)
- [ ] Preview before generating (save tokens)

### Phase 3

- [ ] Learn from edits (improve prompts over time)
- [ ] A/B test prompt variations
- [ ] Fine-tuned model (Growth Mastery-specific)
- [ ] User feedback loop (thumbs up/down)

## Competitive Advantage

**Why This Matters**:

1. **Quality**: Better than generic AI tools (Copy.ai, Jasper)
2. **Context**: Uses funnel context, not one-off generation
3. **Framework**: Follows proven webinar structures
4. **Integration**: Native to platform, not bolt-on

**Moat Depth**: Medium

- Prompts can be copied (but we'll improve constantly)
- Integration is harder to replicate
- Data flywheel (learn from successful funnels)

## Related Components

- Funnel Wizard (`knowledge/components/funnel-wizard.md`)
- AI Follow-Up Engine (`knowledge/components/ai-followup-engine.md`)
- VAPI Integration (intake calls)

---

_Last Updated: 2025-12-03_ _Status: ✅ All 6 generation types working_ _Key Metric:
Acceptance rate (target 80%+ use AI-generated)_ _Cost: ~$1.00 per complete funnel
generation_ _Competitive Advantage: HIGH - This is the moat_
