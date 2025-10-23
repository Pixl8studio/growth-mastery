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
 * 2. Generate offer details from transcript
 */
export function createOfferGenerationPrompt(
    transcriptData: TranscriptData
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return [
        {
            role: "system",
            content: `You are a master offer strategist who creates irresistible offers with high perceived value.

Create a compelling offer with:
- Clear, benefit-driven name (not generic, specific to the transformation)
- Powerful tagline that captures the core promise
- Specific price point that feels like a steal for the value
- 5-7 key features/deliverables (focus on benefits, not just features)
- 3-5 bonuses that add urgency and value
- Strong guarantee that removes all risk
- Clear value proposition

Make the offer feel premium but accessible. Focus on transformation, not just features. Use emotional language.`,
        },
        {
            role: "user",
            content: `Based on this business information, create a compelling offer:

TRANSCRIPT:
${transcriptData.transcript_text}

${transcriptData.extracted_data ? `KEY INFO:\n${JSON.stringify(transcriptData.extracted_data, null, 2)}` : ""}

Return ONLY a JSON object with this structure:
{
  "name": "Offer name (benefit-focused, not generic)",
  "tagline": "One-line value proposition that creates desire",
  "price": 997,
  "currency": "USD",
  "features": [
    "Feature 1 with clear benefit and transformation",
    "Feature 2 with transformation promise",
    "Feature 3 with specific outcome",
    "Feature 4 with measurable result",
    "Feature 5 with unique differentiator",
    "Feature 6 (optional)",
    "Feature 7 (optional)"
  ],
  "bonuses": [
    "Bonus 1 with value ($XXX value)",
    "Bonus 2 with urgency element",
    "Bonus 3 with exclusivity"
  ],
  "guarantee": "Full risk reversal guarantee statement (specific, not generic)"
}`,
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
- Smooth transitions between slides
- Emotional storytelling that builds engagement
- Clear, concise talking points (no fluff)
- Appropriate pacing (aim for 15-20 minute total video)
- Suggestions for tone and delivery
- Estimated time per slide (in seconds)
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
      "script": "What you'll say for this slide (2-4 sentences, conversational)",
      "duration": 20,
      "notes": "Delivery notes (tone, pacing, emphasis, gestures)"
    },
    ...for all ${deckSlides.length} slides
  ]
}

Duration in seconds. Total should be around 900-1200 seconds (15-20 minutes).
Each slide should have enough script to fill the duration naturally.`,
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
