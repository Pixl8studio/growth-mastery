/**
 * AI Prompts for Funnel Builder
 * OpenAI GPT-4 prompts for generating funnel content
 */

import type OpenAI from "openai";
import type { TranscriptData } from "./types";
import { FUNNEL_CONFIG } from "@/lib/config";

/**
 * 1. Generate 55-slide promo deck structure from VAPI transcript
 */
export function createDeckStructurePrompt(
    transcriptData: TranscriptData
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return [
        {
            role: "system",
            content: `You are an expert presentation designer who creates compelling ${FUNNEL_CONFIG.deckStructure.totalSlides}-slide promotional decks.

Your decks follow the proven structure: Hook → Problem → Agitate → Solution → Offer → Close.

Generate a complete ${FUNNEL_CONFIG.deckStructure.totalSlides}-slide structure with:
- Slide number (1-${FUNNEL_CONFIG.deckStructure.totalSlides})
- Slide title (short, punchy, max 8 words)
- Slide description (what content/visuals go on this slide, 1-2 sentences)
- Section marker (which part of the story: hook, problem, agitate, solution, offer, close)

Make it compelling, emotional, and sales-focused. Use storytelling to build desire and urgency.`,
        },
        {
            role: "user",
            content: `Based on this intake call transcript, create a ${FUNNEL_CONFIG.deckStructure.totalSlides}-slide promotional deck structure:

TRANSCRIPT:
${transcriptData.transcript_text}

${transcriptData.extracted_data ? `EXTRACTED KEY INFO:\n${JSON.stringify(transcriptData.extracted_data, null, 2)}` : ""}

Return ONLY a JSON object with this exact structure:
{
  "slides": [
    {
      "slideNumber": 1,
      "title": "Slide Title",
      "description": "What content goes on this slide",
      "section": "hook"
    },
    ...all ${FUNNEL_CONFIG.deckStructure.totalSlides} slides
  ]
}

Sections should be: "hook", "problem", "agitate", "solution", "offer", or "close"
Distribute slides across sections logically (hook: 5-10, problem: 8-12, agitate: 5-8, solution: 15-20, offer: 8-12, close: 5-8)`,
        },
    ];
}

/**
 * 2. Generate offer details from transcript using the 7 P's Framework
 */
export function createOfferGenerationPrompt(
    transcriptData: TranscriptData
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return [
        {
            role: "system",
            content: `You are a master offer strategist who creates irresistible offers using the proven 7 P's Framework.

THE 7 P's FRAMEWORK:

1. PRICE - The strategic investment point that makes your offer feel like a no-brainer
   - Deliver significantly more perceived value than cost
   - Price reflects transformation and results, not just time/deliverables
   - The cost of NOT solving the problem should outweigh the price

2. PROMISE - The clear, compelling, measurable outcome the client truly desires
   - Specific and emotionally resonant
   - Tied to tangible results
   - The transformation they are investing in

3. PERSON - The narrowly defined ideal client actively experiencing the problem
   - Clarity is crucial - the more precise, the more magnetic
   - Speak to one type of person with one core problem
   - They must be ready to take action

4. PROCESS - The unique method, system, or framework that delivers the outcome
   - Your step-by-step path to results
   - Builds confidence and trust
   - Differentiates from competitors

5. PURPOSE - The deeper "why" behind the offer
   - The mission or belief fueling the work
   - Resonates on a human level
   - Connects emotionally and attracts aligned clients

6. PATHWAY - The purchase path after engagement
   - BOOK_CALL: For offers $2,000+ (high-ticket, needs trust, complex)
     * Lower conversion (1-5% of total leads) but higher close rate on calls (20-50%)
     * High operational load with sales calls
   - DIRECT_PURCHASE: For offers under $2,000 (self-serve)
     * 1.5-10% conversion from engagement to purchase
     * Low operational load, fully automated
     * Best for mature offers and warm audiences

7. PROOF (Credibility/Guarantee) - Risk reversal and credibility
   - Strong guarantee that removes all risk
   - Builds trust and confidence
   - Specific, not generic

Create offers with 3-6 features and 3-5 bonuses. Make the offer feel premium but accessible.`,
        },
        {
            role: "user",
            content: `Based on this business information, create a compelling offer using the 7 P's Framework:

TRANSCRIPT:
${transcriptData.transcript_text}

${transcriptData.extracted_data ? `KEY INFO:\n${JSON.stringify(transcriptData.extracted_data, null, 2)}` : ""}

${
    transcriptData.extracted_data?.pricing &&
    transcriptData.extracted_data.pricing.length > 0
        ? `\nEXTRACTED PRICING FROM SOURCE:
${transcriptData.extracted_data.pricing.map((p: any) => `- $${p.amount} ${p.currency} (confidence: ${p.confidence})\n  Context: ${p.context}`).join("\n")}

PRICING GUIDANCE:
- If multiple prices are detected, choose the PRIMARY offer price (usually the highest or most prominent)
- Use the extracted pricing as the foundation for your offer
- Ensure the price aligns with the value proposition in the content
- If prices seem to be for different tiers/options, select the main offer price`
        : `\nNO PRICING DATA DETECTED:
- Analyze the transcript content to determine an appropriate price point
- Consider the value proposition, target market, and transformation promised
- Use industry standards for similar offers as a guide
- Price should reflect the true value and transformation delivered`
}

Return ONLY a JSON object with this structure:
{
  "name": "Offer name (benefit-focused, transformation-driven)",
  "tagline": "One-line value proposition that creates desire",
  "price": <use extracted price if available, otherwise determine appropriate price based on content>,
  "currency": "USD",
  "promise": "The specific, measurable transformation outcome they will achieve (2-3 sentences)",
  "person": "Detailed description of the ideal client who needs this most (2-3 sentences)",
  "process": "Your unique method/system/framework for delivering results (2-3 sentences)",
  "purpose": "The deeper 'why' behind this offer that resonates emotionally (2-3 sentences)",
  "pathway": "book_call or direct_purchase (based on price: >= $2000 = book_call, < $2000 = direct_purchase)",
  "features": [
    "Feature 1 with clear benefit and transformation",
    "Feature 2 with transformation promise",
    "Feature 3 with specific outcome",
    "Feature 4 (optional)",
    "Feature 5 (optional)",
    "Feature 6 (optional)"
  ],
  "bonuses": [
    "Bonus 1 with value ($XXX value)",
    "Bonus 2 with urgency element",
    "Bonus 3 with exclusivity",
    "Bonus 4 (optional)",
    "Bonus 5 (optional)"
  ],
  "guarantee": "Full risk reversal guarantee statement (specific, not generic)"
}

CRITICAL:
- Include 3-6 features and 3-5 bonuses
- Set pathway based on price tier (>= $2000 = book_call, < $2000 = direct_purchase)
- Use extracted pricing data when available - DO NOT ignore detected prices`,
        },
    ];
}

/**
 * 3. Generate sales copy for enrollment page
 */
export function createEnrollmentCopyPrompt(
    offer: {
        name: string;
        tagline?: string;
        features: string[];
        bonuses?: string[];
        guarantee?: string;
    },
    transcriptData: TranscriptData,
    pageType: "direct_purchase" | "book_call" = "direct_purchase"
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const isDirect = pageType === "direct_purchase";

    return [
        {
            role: "system",
            content: `You are a world-class direct response copywriter who writes enrollment pages that convert.

${isDirect ? "This is a DIRECT PURCHASE page (offer under $2k)" : "This is a BOOK CALL page (offer over $2k)"}.

Write compelling sales copy with:
- Attention-grabbing headline (curiosity + benefit)
- Emotional subheadline (outcome-focused)
- Problem-aware opening that hooks the reader (2-3 sentences)
- Clear benefits and transformation
- Social proof framing (even without specific testimonials)
${isDirect ? "- Urgency and scarcity elements\n- Strong call-to-action for purchase" : "- Value of the call\n- What to expect on the call\n- CTA to book a strategy session"}

Use persuasive language, emotional triggers, and paint the transformation picture. Write in a conversational, authentic voice.`,
        },
        {
            role: "user",
            content: `Write ${isDirect ? "a direct purchase enrollment" : "a book call"} page for this offer:

OFFER:
${JSON.stringify(offer, null, 2)}

BUSINESS CONTEXT:
${transcriptData.transcript_text.substring(0, 1500)}...

Return ONLY a JSON object with this structure:
{
  "headline": "Main headline (max 10 words, curiosity + benefit)",
  "subheadline": "Emotional subheadline (max 20 words, transformation-focused)",
  "opening": "Hook paragraph that acknowledges their problem (2-3 sentences)",
  "problemSection": {
    "heading": "Problem section heading (3-6 words)",
    "content": "Problem description that agitates the pain (2-3 paragraphs)"
  },
  "solutionSection": {
    "heading": "Solution section heading (3-6 words)",
    "content": "Solution description that shows the path forward (2-3 paragraphs)"
  },
  "featuresHeading": "Features section heading (3-6 words)",
  "ctaText": "${isDirect ? "Primary CTA button text (action-oriented)" : "Book call CTA button text (low-friction)"}",
  "urgencyText": "${isDirect ? "Urgency/scarcity statement" : "Reason to book now (not pushy)"}"
}`,
        },
    ];
}

/**
 * 4. Generate talk track script from deck structure
 * Note: This function is kept for backward compatibility and reference.
 * The new implementation in /api/generate/talk-track uses chunked generation
 * for better quality and generates 2-4 sentences per slide.
 */
export function createTalkTrackPrompt(
    deckSlides: {
        slideNumber: number;
        title: string;
        description: string;
        section: string;
    }[]
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return [
        {
            role: "system",
            content: `You are a master presentation coach who writes compelling video scripts for pitch presentations.

Create a natural, conversational script for a pitch video with:
- 2-4 compelling sentences per slide (not more!)
- Smooth transitions between slides
- Emotional storytelling that builds engagement
- Clear, concise talking points (no fluff)
- Appropriate pacing (aim for 15-20 minute total video)
- Suggestions for tone and delivery
- Estimated time per slide (15-30 seconds)
- Conversational language (use "you", be authentic)

Write as if speaking directly to one person who has a problem you can solve. Build rapport, create desire, overcome objections naturally.`,
        },
        {
            role: "user",
            content: `Create a talk track script for this ${deckSlides.length}-slide deck:

DECK STRUCTURE:
${JSON.stringify(deckSlides, null, 2)}

Return ONLY a JSON object with this structure:
{
  "totalDuration": 1080,
  "slides": [
    {
      "slideNumber": 1,
      "script": "2-4 sentences of what to say for this slide (conversational, compelling)",
      "duration": 25,
      "notes": "Delivery notes (tone, pacing, emphasis)"
    },
    ...for all ${deckSlides.length} slides
  ]
}

IMPORTANT: Each script must be exactly 2-4 sentences. Not more, not less.
Duration should be 15-30 seconds per slide depending on content complexity.
Total should be around 900-1200 seconds (15-20 minutes).`,
        },
    ];
}

/**
 * 5. Generate registration page copy
 */
export function createRegistrationCopyPrompt(
    projectInfo: {
        name: string;
        niche?: string;
        targetAudience?: string;
    },
    deckSlides?: { title: string; description: string }[]
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return [
        {
            role: "system",
            content: `You are a conversion copywriter who writes registration pages that capture leads.

Create compelling registration page copy with:
- Curiosity-driving headline (what will they discover?)
- Clear benefit statement (what's in it for them?)
- 5 bullet points of what they'll learn/discover (specific, benefit-driven)
- Trust-building language (professional, credible)
- Clear, low-friction CTA for registration

Focus on curiosity, benefit, and ease. Make registration feel like a no-brainer. Don't give everything away - create intrigue.`,
        },
        {
            role: "user",
            content: `Write registration page copy for:

PROJECT: ${projectInfo.name}
NICHE: ${projectInfo.niche || "Not specified"}
AUDIENCE: ${projectInfo.targetAudience || "Not specified"}

${
    deckSlides
        ? `KEY TOPICS (from deck):\n${deckSlides
              .slice(0, 8)
              .map((s) => `- ${s.title}`)
              .join("\n")}`
        : ""
}

Return ONLY a JSON object:
{
  "headline": "Curiosity-driven headline (8-12 words, asks 'what if' or creates intrigue)",
  "subheadline": "Benefit-focused subheadline (15-20 words, specific transformation)",
  "bulletPoints": [
    "What they'll discover #1 (specific benefit)",
    "What they'll discover #2 (transformation point)",
    "What they'll discover #3 (unique insight)",
    "What they'll discover #4 (outcome promise)",
    "What they'll discover #5 (bonus revelation)"
  ],
  "ctaText": "Register button text (low-friction, benefit-focused)",
  "trustStatement": "Why they can trust this (1 sentence, credibility)"
}`,
        },
    ];
}

/**
 * 6. Generate watch page copy
 */
export function createWatchPageCopyPrompt(
    projectInfo: {
        name: string;
        niche?: string;
    },
    videoDuration?: number
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const durationMinutes = videoDuration ? Math.floor(videoDuration / 60) : 15;

    return [
        {
            role: "system",
            content: `You are a video landing page expert who writes copy that gets people to watch and take action.

Create watch page copy with:
- Compelling headline that creates curiosity
- Clear promise of what they'll learn/discover
- Social proof framing (even without specific testimonials)
- Instructions to watch in full (emphasize value of complete viewing)
- Strong CTA after video (next step in journey)

Keep it simple and focused on getting them to press play, watch til the end, and take the next step.`,
        },
        {
            role: "user",
            content: `Write watch page copy for:

PROJECT: ${projectInfo.name}
NICHE: ${projectInfo.niche || "Not specified"}
VIDEO LENGTH: ${durationMinutes} minutes

Return ONLY a JSON object:
{
  "headline": "Watch this video (curiosity hook, benefit-driven)",
  "subheadline": "What they'll discover in the video (specific outcomes)",
  "watchPrompt": "Instruction to watch (emphasize watching completely, 1 sentence)",
  "ctaText": "Post-video button text (next step in funnel)",
  "ctaSubtext": "What happens when they click (1 sentence, reduce friction)"
}`,
        },
    ];
}

/**
 * 7. Generate analytics insights from funnel data
 * Future enhancement - AI-powered insights
 */
export function createAnalyticsInsightsPrompt(analyticsData: {
    registrations: number;
    videoViews: number;
    videoCompletionRate: number;
    enrollmentViews: number;
    conversions: number;
}): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return [
        {
            role: "system",
            content: `You are a funnel optimization expert who provides actionable insights.

Analyze funnel performance data and provide:
- Key insights about performance
- Specific recommendations for improvement
- Identified bottlenecks or drop-off points
- Suggested optimizations

Be specific, actionable, and data-driven.`,
        },
        {
            role: "user",
            content: `Analyze this funnel performance:

METRICS:
${JSON.stringify(analyticsData, null, 2)}

Return ONLY a JSON object:
{
  "overallHealth": "excellent | good | needs_improvement | poor",
  "keyInsights": [
    "Insight 1 with data point",
    "Insight 2 with comparison",
    "Insight 3 with trend"
  ],
  "recommendations": [
    "Specific action to improve metric X",
    "Optimization for bottleneck Y",
    "Test suggestion for element Z"
  ],
  "bottlenecks": [
    "Drop-off point with percentage",
    "Weak conversion area"
  ]
}`,
        },
    ];
}

/**
 * 8. Generate brand design from transcript/business profile
 */
export function createBrandDesignPrompt(
    transcriptData: TranscriptData
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return [
        {
            role: "system",
            content: `You are an expert brand designer who creates cohesive visual identities based on business context.

Your task is to generate a complete brand color palette and personality that reflects the business's values, target audience, and industry positioning.

COLOR PSYCHOLOGY PRINCIPLES:
- Blue: Trust, stability, professionalism (finance, healthcare, tech)
- Green: Growth, nature, health, wealth (wellness, finance, sustainability)
- Purple: Luxury, creativity, wisdom (coaching, premium services)
- Orange: Energy, enthusiasm, warmth (fitness, youth, food)
- Red: Passion, urgency, power (sales, entertainment, food)
- Yellow: Optimism, clarity, warmth (education, children, creativity)
- Pink: Compassion, nurturing, femininity (wellness, beauty, relationships)
- Black: Sophistication, luxury, authority (high-end brands)
- White: Purity, simplicity, cleanliness (minimalist, modern brands)

DESIGN STYLE GUIDE:
- modern: Clean lines, bold colors, minimalist approach
- classic: Timeless, traditional, refined aesthetics
- minimal: Simple, whitespace-focused, understated
- bold: Strong contrasts, impactful, attention-grabbing
- vibrant: Colorful, energetic, dynamic
- elegant: Sophisticated, luxurious, refined
- playful: Fun, approachable, creative
- professional: Corporate, trustworthy, polished

Generate colors in HEX format (#RRGGBB). Ensure:
1. Primary and secondary colors complement each other
2. Accent color provides good contrast for CTAs
3. Background and text colors ensure readability (WCAG AA compliance)
4. Colors match the business personality and target audience`,
        },
        {
            role: "user",
            content: `Based on this business information, create a cohesive brand design:

BUSINESS CONTEXT:
${transcriptData.transcript_text}

${transcriptData.extracted_data ? `KEY INFO:\n${JSON.stringify(transcriptData.extracted_data, null, 2)}` : ""}

Return ONLY a JSON object with this exact structure:
{
  "primary_color": "#XXXXXX (main brand color - used for headings, buttons, key elements)",
  "secondary_color": "#XXXXXX (complementary color - used for accents, hover states)",
  "accent_color": "#XXXXXX (call-to-action color - must stand out against primary/secondary)",
  "background_color": "#XXXXXX (page background - usually light, ensures readability)",
  "text_color": "#XXXXXX (body text - must contrast with background for readability)",
  "design_style": "modern | classic | minimal | bold | vibrant | elegant | playful | professional",
  "personality_traits": {
    "tone": "professional | friendly | authoritative | conversational | inspirational",
    "mood": "confident | calm | energetic | serious | optimistic",
    "energy": "dynamic | stable | bold | subtle | vibrant",
    "values": ["3-5 brand values that define this business"]
  },
  "rationale": "Brief explanation of why these colors and style fit this business (2-3 sentences)"
}

CRITICAL:
- All colors must be valid 6-digit HEX codes starting with #
- Ensure sufficient contrast between text and background
- Match colors to the business's industry and target audience
- The accent color should work well for CTA buttons`,
        },
    ];
}

/**
 * 9. Generate follow-up sequence messages from deck and offer context
 */
export interface DeckContext {
    title: string;
    keyPoints: string[];
    painPoints: string[];
    solutions: string[];
    mainPromise: string;
}

export interface OfferContext {
    name: string;
    tagline?: string;
    price: number;
    features: string[];
    bonuses?: string[];
    guarantee?: string;
}

export function createFollowupSequencePrompt(
    deckContext: DeckContext,
    offerContext: OfferContext,
    segment: "no_show" | "skimmer" | "sampler" | "engaged" | "hot" = "engaged"
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const segmentGuidance = {
        no_show: {
            focus: "Gentle re-engagement, create curiosity about what they missed",
            tone: "Warm and inviting, no pressure",
            cta: "Watch the replay or key highlights",
        },
        skimmer: {
            focus: "Show them the value they started to discover, pique curiosity",
            tone: "Encouraging and intriguing",
            cta: "Complete watching or see key moments",
        },
        sampler: {
            focus: "Reinforce value, encourage completion, soft conversion",
            tone: "Supportive and value-focused",
            cta: "Finish watching then decide",
        },
        engaged: {
            focus: "Move to conversion, address objections, show transformation",
            tone: "Professional and consultative",
            cta: "Book call or enroll",
        },
        hot: {
            focus: "Direct conversion, urgency, strong social proof",
            tone: "Confident and urgent",
            cta: "Enroll now or book immediately",
        },
    };

    const guidance = segmentGuidance[segment];

    return [
        {
            role: "system",
            content: `You are an expert follow-up sequence writer who creates personalized, professional email and SMS messages for post-webinar engagement.

Your messages are:
- Professional yet personal (conversational tone, first-person)
- Focused on transformation and value (not just features)
- Strategic use of storytelling and social proof
- Token-based for dynamic personalization
- Following the proven 3-day discount sequence structure

IMPORTANT GUIDELINES:
1. Use token placeholders: {{first_name}}, {{watch_pct}}, {{minutes_watched}}, {{challenge_notes}}, {{goal_notes}}, {{objection_hint}}, {{offer_click}}, {{timezone}}, {{replay_link}}, {{next_step}}, {{checkout_url}}, {{book_call_url}}

2. Each message should mirror the prospect's language ({{challenge_notes}}) in the opening

3. Focus on OUTCOMES not features - paint the transformation picture

4. Use micro-stories (120-200 words) that reframe objections

5. Include specific, non-defensive objection handling when {{objection_hint}} is present

6. CTAs should match intent level - don't push too hard too soon

7. Deadline and urgency elements should support, not lead, the message

8. Write as if speaking to ONE person who has a specific problem you can solve

TARGET SEGMENT: ${segment.toUpperCase()}
Focus: ${guidance.focus}
Tone: ${guidance.tone}
Primary CTA: ${guidance.cta}`,
        },
        {
            role: "user",
            content: `Create a 5-message follow-up sequence based on this webinar and offer:

WEBINAR CONTENT:
Title: ${deckContext.title}
Main Promise: ${deckContext.mainPromise}

Key Points Covered:
${deckContext.keyPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}

Pain Points Addressed:
${deckContext.painPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}

Solutions Presented:
${deckContext.solutions.map((s, i) => `${i + 1}. ${s}`).join("\n")}

OFFER DETAILS:
${JSON.stringify(offerContext, null, 2)}

SEQUENCE STRUCTURE:
Day 0 (immediately after webinar):
- Message 1: Email - Thank you + value echo + personalized question
- Message 2: SMS - Short, friendly check-in with micro-ask

Day 1 (24 hours later):
- Message 3: Email - Story/case study that mirrors their challenge + one clear CTA

Day 2 (48 hours later):
- Message 4: Email - Offer recap + deadline reminder (T-1 day) + social proof

Day 3 (72 hours later):
- Message 5: Email - Mission/why you built this + final call + deadline urgency

Return ONLY a JSON object with this structure:
{
  "sequence_name": "Descriptive name for this sequence",
  "sequence_description": "1-2 sentence description",
  "messages": [
    {
      "name": "Day 0 - Thank You Email",
      "message_order": 1,
      "channel": "email",
      "send_delay_hours": 0,
      "subject_line": "Subject with {{token}} personalization",
      "body_content": "Full email body with {{tokens}} for personalization. Use natural, conversational language. Include specific CTAs.",
      "tone_notes": "Delivery guidance for this message",
      "estimated_read_time": "2 minutes"
    },
    {
      "name": "Day 0 - SMS Check-in",
      "message_order": 2,
      "channel": "sms",
      "send_delay_hours": 0,
      "body_content": "Short SMS (under 160 chars) with {{tokens}}",
      "tone_notes": "Casual, friendly"
    },
    {
      "name": "Day 1 - Story + Value",
      "message_order": 3,
      "channel": "email",
      "send_delay_hours": 24,
      "subject_line": "Subject line...",
      "body_content": "Email with micro-story (120-200 words) that reframes objection + clear CTA",
      "tone_notes": "Storytelling, consultative",
      "estimated_read_time": "3 minutes"
    },
    {
      "name": "Day 2 - Offer Recap",
      "message_order": 4,
      "channel": "email",
      "send_delay_hours": 48,
      "subject_line": "Subject line...",
      "body_content": "Email with offer breakdown + bonuses + guarantee + deadline (T-1)",
      "tone_notes": "Clear, benefit-focused",
      "estimated_read_time": "2 minutes"
    },
    {
      "name": "Day 3 - Final Call",
      "message_order": 5,
      "channel": "email",
      "send_delay_hours": 72,
      "subject_line": "Subject line...",
      "body_content": "Email with mission/purpose + mirrors their challenge + final CTA + deadline urgency",
      "tone_notes": "Authentic, purposeful, urgent",
      "estimated_read_time": "2 minutes"
    }
  ]
}

CRITICAL:
- Use tokens extensively for personalization
- First line of each email should reference {{challenge_notes}} or {{goal_notes}}
- Include conditional logic hints in body_content (e.g., "If {{watch_pct}} >= 50, emphasize conversion; if < 50, encourage replay completion")
- CTAs should use {{next_step}}, {{checkout_url}}, {{book_call_url}}, {{replay_link}}
- Deadline references should include {{timezone}}
- Write naturally - this should sound like a real person helping another real person`,
        },
    ];
}
