# Component: AI Follow-Up Engine

## What It Is

Intelligent, behavioral post-webinar follow-up system that segments prospects based on
engagement and sends personalized message sequences to maximize conversions. The system
automatically categorizes viewers into 5 segments and delivers tailored messages over 3
days.

## Why It Exists

**Problem**: Most webinar funnels fail after the webinar. Generic "thanks for watching"
emails don't address specific engagement levels or objections. Creators lose 70%+ of
potential conversions in follow-up.

**Solution**: AI-powered segmentation and personalization that meets each prospect where
they are, addresses their specific objections, and moves them toward enrollment.

## The 5-Segment Behavioral Ladder

### Segment 1: No-Show (0% watched)

**Behavior**: Registered but never showed up **Touches**: 2 messages **Goal**: Get them
to watch the replay **Tone**: Casual, non-pressured **Key Message**: "Life happens -
here's your replay"

**Sample Sequence**:

1. Day 1: Replay available email
2. Day 2: SMS reminder (if enabled)

### Segment 2: Skimmer (1-24% watched)

**Behavior**: Clicked play but bounced quickly **Touches**: 3 messages **Goal**:
Re-engage, address early dropout **Tone**: Curious, empathetic **Key Message**: "What
made you leave? Here's what you missed"

**Sample Sequence**:

1. Day 1: Re-engagement email
2. Day 2: Value-focused email
3. Day 3: SMS with social proof

### Segment 3: Sampler (25-49% watched)

**Behavior**: Watched intro + some content **Touches**: 4 messages **Goal**: Get them to
finish, address objections **Tone**: Helpful, consultative **Key Message**: "You're
halfway there - here's what's coming"

**Sample Sequence**:

1. Day 1: Finish-watching email
2. Day 1 (evening): Key insights email
3. Day 2: Objection-handling story
4. Day 3: Limited-time CTA

### Segment 4: Engaged (50-74% watched)

**Behavior**: Watched most but not finish **Touches**: 4 messages **Goal**: Close the
deal, handle final objections **Tone**: Direct, results-focused **Key Message**: "You're
close - here's why now"

**Sample Sequence**:

1. Day 1: Direct CTA email
2. Day 1 (evening): Urgency + scarcity
3. Day 2: ROI calculator or case study
4. Day 3: Last chance SMS

### Segment 5: Hot (75-100% watched)

**Behavior**: Watched entire webinar **Touches**: 5 messages **Goal**: Immediate
conversion **Tone**: Assumptive, action-oriented **Key Message**: "You're ready - let's
get started"

**Sample Sequence**:

1. Day 1 (immediately): Strike-while-hot email
2. Day 1 (4 hours): Bonus/incentive email
3. Day 1 (evening): Social proof SMS
4. Day 2: FAQ-addressing email
5. Day 3: Final urgency email

## Intent Scoring System

**Formula**:

```
Intent Score = (0.45 × watch_pct) + (0.25 × offer_clicked) +
               (0.15 × email_opened) + (0.10 × page_revisits) +
               (0.05 × shares)
```

**Engagement Levels**:

- **Cold** (0-30): Low intent, nurture needed
- **Warm** (31-65): Moderate intent, address objections
- **Hot** (66-100): High intent, push for close

**Usage**: Informs message personalization and urgency level

## Personalization Tokens

**Contact Tokens**:

- `{{first_name}}` - Personal greeting
- `{{watch_pct}}` - Engagement acknowledgment
- `{{time_watched}}` - Duration in minutes

**Content Tokens**:

- `{{webinar_title}}` - Specific webinar reference
- `{{key_insight}}` - Personalized takeaway
- `{{offer_name}}` - What they're buying
- `{{challenge_notes}}` - From intake call

**Dynamic Tokens**:

- `{{days_until_close}}` - Urgency countdown
- `{{similar_success}}` - Relevant case study
- `{{objection_reframe}}` - Address specific concern

## AI Generation Process

### Step 1: Context Extraction

- Read `deck_structures.slides` for key content
- Read `offers` table for offer details
- Extract pain points, solutions, transformation
- Identify proof points and credibility markers

### Step 2: Prompt Assembly

- Segment-specific system prompt
- Context injection (deck + offer)
- Token usage guidelines
- Output format (JSON matching schema)

### Step 3: OpenAI Call

- Model: GPT-4o (best quality)
- Temperature: 0.7 (creative but consistent)
- Max tokens: 3000 per sequence
- Structured output enforced

### Step 4: Fallback Handling

- If AI fails → use default templates
- If deck missing → generic but personalized
- If offer incomplete → basic sequence
- Never fail completely (always send something)

### Step 5: Database Storage

- Create `followup_sequences` record
- Create 2-5 `followup_messages` records
- Link to funnel project
- Set generation method (AI vs. default)

## Technical Architecture

### Database Schema

```
followup_agent_configs (per project)
├── voice, goals, rules
└── segmentation logic

followup_sequences (per segment)
├── name, description, segment
└── trigger conditions

followup_messages (per sequence)
├── subject, body, tokens
├── channel (email/SMS)
└── send timing

followup_prospects (per contact)
├── segment assignment
├── intent score
└── delivery history

followup_deliveries (per send)
├── message sent
├── status, opens, clicks
└── webhook triggers
```

### Services

- `segmentation-service.ts` - Determine segment from behavior
- `template-generator-service.ts` - Orchestrate AI generation
- `default-templates.ts` - Fallback sequences
- `story-library-service.ts` - Objection-handling stories
- `agent-config-service.ts` - Default configuration

### API Endpoints

- `POST /api/followup/sequences/generate` - Create AI sequence
- `GET /api/followup/sequences` - List sequences
- `POST /api/followup/deliver` - Send message (triggered)
- `POST /api/followup/track` - Record engagement

## Key Design Decisions

### Decision: 5 Segments (not 3 or 7)

**Why**: Balance between personalization and manageability **Research**: 5 matches
industry best practices **Alternative**: 3 (not granular enough), 7 (too complex)

### Decision: 3-Day Sequence

**Why**: Urgency window without being annoying **Research**: Most conversions happen in
72 hours post-webinar **Alternative**: 7 days (too long, momentum lost)

### Decision: AI Generation (not just templates)

**Why**: Deck-specific content converts better **Research**: Generic sequences have 30%
lower open rates **Trade-off**: More complex, but higher quality

### Decision: Behavioral Triggers (not time-based only)

**Why**: Engagement actions matter more than time **Examples**: Clicked offer → send
bonus email immediately **Alternative**: Pure drip (ignores behavior)

### Decision: Email + SMS Multi-Channel

**Why**: SMS has 98% open rate for hot prospects **Implementation**: SMS only for
Engaged/Hot segments **Limit**: 1 SMS per sequence (not spammy)

## Story Library

**Purpose**: Pre-written objection-handling stories **Categories**: Price, Timing, Fit,
Self-belief, Trust **Usage**: Injected into messages based on segment behavior
**Example**: Skimmer segment → "Timing" story about 15-min wedge

**Default Stories**:

1. **Price** → ROI calculator story
2. **Timing** → 15-minute daily wedge
3. **Fit** → "Same but different" case study
4. **Self-belief** → Micro-commitment approach
5. **Trust** → Show-your-work transparency

## Common Objections & Reframes

| Objection                 | Reframe                                                            |
| ------------------------- | ------------------------------------------------------------------ |
| "Too expensive"           | "Investment calculator: What's the cost of not solving this?"      |
| "Need to think"           | "What specific question needs answering? Let's solve it now."      |
| "Not right time"          | "When has timing ever been perfect? What would 'ready' look like?" |
| "Need spouse approval"    | "What would help them see what you see?"                           |
| "Already tried something" | "What was missing that this provides?"                             |

## Metrics to Track

**Segmentation Accuracy**:

- % in each segment (should match engagement curve)
- Segment drift over time
- Intent score correlation with conversion

**Message Performance**:

- Open rates by segment
- Click rates by segment
- Reply rates (engagement signal)
- Unsubscribe rates (avoid spam)

**Conversion**:

- Conversion rate by segment
- Time to conversion
- Messages viewed before conversion
- ROI per segment (value vs. cost)

**AI Quality**:

- Regeneration requests (low = good quality)
- Manual edits to AI content
- Creator satisfaction ratings

## Future Enhancements

### Phase 2

- [ ] A/B testing for sequences
- [ ] Learning from conversion data
- [ ] Voice/tone customization
- [ ] More story templates
- [ ] Webhook triggers (external events)

### Phase 3

- [ ] AI chat bot integration
- [ ] Predictive conversion scoring
- [ ] Dynamic sequence adjustment
- [ ] Multi-offer orchestration
- [ ] Advanced behavioral triggers

## Related Components

- Contact Management (`knowledge/components/contact-management.md`)
- Analytics Tracking (`knowledge/components/analytics.md`)
- AI Content Generation (`knowledge/components/ai-generation.md`)

---

_Last Updated: 2025-12-03_ _Status: ✅ Complete and functional_ _Key Metric: Conversion
lift (target 2-3x vs. no follow-up)_ _Differentiation: High (most competitors have
generic drip campaigns)_
