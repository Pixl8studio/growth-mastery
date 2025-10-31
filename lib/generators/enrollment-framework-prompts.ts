/**
 * Enrollment Page Framework Prompts
 * Generates AI prompts based on Enrollment Page Universal Framework
 * Bottom-of-funnel conversion focus with urgency, proof, and purchase clarity
 */

import type { Slide } from "@/lib/ai/types";

interface OfferData {
    name: string;
    tagline?: string | null;
    description?: string | null;
    price: number;
    currency: string;
    promise?: string | null;
    person?: string | null;
    process?: string | null;
    features?: Array<{
        title: string;
        description: string;
        value?: string;
    }>;
    bonuses?: string[];
    guarantee?: string | null;
}

interface IntakeData {
    targetAudience?: string;
    businessNiche?: string;
    desiredOutcome?: string;
}

const ENROLLMENT_FRAMEWORK = `
# Enrollment Page Universal Framework

Bottom-of-funnel conversion focus emphasizing proof, urgency, and purchase clarity.
Completely separate AI logic from registration pages.

## Framework Sections:

1. **Hero Section**:
   - Audience line: "For [Target Audience]"
   - Bold headline: Transformation + System/Method name
   - One-line tagline with 3 short benefits (period-separated)
   - Clear CTA button + trust statement
   - Psychology: Direct, confident, emotionally charged

2. **Video Intro Section**:
   - Curiosity-driven intro line
   - Headline highlighting program duration/structure + transformation
   - 1-2 line summary of what they'll learn (emotional/financial outcomes)
   - Psychology: Builds trust and curiosity

3. **Core Features Section**:
   - Strong, benefit-driven headline
   - 4-8 feature cards with memorable titles + 1-2 sentence descriptions
   - Each card: transformation-focused, emotionally resonant, concrete
   - Psychology: Breakthrough system feeling

4. **3-Step Process**:
   - Energetic headline introducing simple path
   - Three action-oriented steps (verb-led titles + descriptions)
   - Motivational closing line + CTA button
   - Psychology: Simplifies path to success

5. **Testimonials / Social Proof**:
   - Multiple testimonials with specific results
   - Format: Name, role, transformation achieved
   - Include before/after metrics where possible
   - Psychology: Reduces risk through peer validation

6. **Value Stack**:
   - List all components with individual values
   - Show total value vs. actual price
   - Emphasize savings percentage
   - Psychology: Anchoring and perceived value

7. **Urgency Section**:
   - Limited time offer messaging
   - Countdown timer (visual representation)
   - Specific deadline and consequence
   - Psychology: Scarcity drives action

8. **Guarantee**:
   - Clear, risk-reversal statement
   - Specific terms (30-day, 60-day, etc.)
   - Psychology: Removes purchase anxiety

9. **Final CTA Section**:
   - Direct enrollment call with price
   - Form fields for purchase
   - Trust badges and security messaging
   - Psychology: Clear path to purchase
`;

export function createFullPageEnrollmentPrompt(
    offerData: OfferData,
    intakeData: IntakeData,
    deckSlides: Slide[]
): string {
    const audience = intakeData.targetAudience || "entrepreneurs";
    const outcome = intakeData.desiredOutcome || "transform their business";

    return `You are an expert sales copywriter creating a high-converting enrollment/sales page.

${ENROLLMENT_FRAMEWORK}

## Offer Details:

**Offer Name**: ${offerData.name}
**Price**: ${offerData.currency} ${offerData.price}
**Tagline**: ${offerData.tagline || "Transform your business"}
**Description**: ${offerData.description || ""}
**Promise**: ${offerData.promise || `Help ${audience} ${outcome}`}
**Target Audience**: ${audience}
**Business Niche**: ${intakeData.businessNiche || "business coaching"}

## Features/Components:
${offerData.features?.map((f, i) => `${i + 1}. ${f.title}: ${f.description} (Value: ${f.value || "TBD"})`).join("\n") || "Core training program with comprehensive modules"}

## Bonuses:
${offerData.bonuses?.map((b, i) => `${i + 1}. ${b}`).join("\n") || "Exclusive bonus materials"}

## Guarantee:
${offerData.guarantee || "30-day money-back guarantee"}

## Deck Content (for proof points):
${deckSlides
    .slice(0, 8)
    .map((s, i) => `Slide ${i + 1}: ${s.title}\n${s.description}`)
    .join("\n\n")}

## Your Task:

Generate complete, conversion-optimized sales copy for ALL sections of the enrollment page following the framework above.

**Critical Requirements:**
1. This is BOTTOM-OF-FUNNEL - assume they've seen the webinar and are ready to buy
2. Focus on URGENCY, PROOF, and PURCHASE CLARITY
3. Use direct, confident language (not tentative or educational)
4. Include specific pricing and value calculations
5. Create FOMO (fear of missing out) without being manipulative
6. Make the path to purchase crystal clear
7. Address objections preemptively

Return your response as a JSON object:
{
  "heroAudienceLine": "For [Target Audience]",
  "heroHeadline": "Bold transformation headline",
  "heroTagline": "Three benefits separated by periods",
  "heroCtaButton": "Button text",
  "heroTrustStatement": "Trust line under button",

  "videoIntroLine": "Curiosity-driven intro",
  "videoHeadline": "Program duration + transformation",
  "videoSummary": "1-2 lines on what they'll learn",

  "featuresHeadline": "Benefit-driven features headline",
  "features": [
    {"title": "Feature title", "description": "1-2 sentences", "icon": "emoji"}
  ],

  "processHeadline": "3-step process headline",
  "processSteps": [
    {"title": "Action verb title", "description": "What happens"}
  ],
  "processClosing": "Motivational line",
  "processCtaButton": "Button text",

  "testimonials": [
    {"quote": "Result quote", "story": "Full story", "name": "Name", "role": "Role", "metric": "Specific result"}
  ],

  "valueStackItems": [
    {"component": "Item name", "description": "What it is", "value": "$X,XXX"}
  ],
  "valueStackTotal": "$X,XXX",
  "valueStackSavings": "XX%",

  "urgencyHeadline": "Limited time headline",
  "urgencyText": "Deadline and consequence",
  "urgencyCountdown": "24 hours",

  "guaranteeHeadline": "Guarantee headline",
  "guaranteeText": "Full guarantee terms",

  "finalCtaHeadline": "Direct enrollment headline",
  "finalCtaText": "Supporting persuasion text",
  "finalCtaButton": "Button text with price",
  "finalCtaTrust": "Security/trust badges text"
}

Generate compelling, urgent, conversion-focused sales copy now.`;
}

export function createEnrollmentFieldPrompt(
    fieldId: string,
    fieldContext: string,
    offerData: OfferData,
    intakeData: IntakeData
): string {
    const audience = intakeData.targetAudience || "entrepreneurs";

    const fieldGuidance: Record<string, string> = {
        "hero-headline": `Bold transformation headline. Format: "[Transform outcome] with [System/Method Name]". Make it powerful and specific. This is a SALES page, not educational.`,
        "hero-tagline": `Three short benefits separated by periods. Example: "Simplify Your Marketing. Automate Your Sales. Reclaim Your Time." Make each benefit concrete and desirable.`,
        "features-title": `Memorable feature title that evokes transformation. Keep it 2-5 words. Make it exciting and unique, not generic.`,
        "features-description": `1-2 sentences explaining how this helps achieve the desired result. Be specific about the transformation, not just what it is.`,
        "process-step": `Action-oriented title (1-3 words starting with verb) + 1-2 sentence description. Focus on movement toward the goal.`,
        testimonial: `Specific result with metrics. Format: "[Name] achieved [specific outcome] because [reason]." Include before/after if possible.`,
        urgency: `Create FOMO without being manipulative. Be specific about the deadline and what happens after. Make it believable.`,
        cta: `Direct, confident call to action. This is a purchase decision. Remove all friction and hesitation.`,
        guarantee: `Specific risk-reversal that removes purchase anxiety. Include exact terms and what they get if not satisfied.`,
    };

    const guidance = Object.keys(fieldGuidance).find((key) => fieldId.includes(key))
        ? fieldGuidance[
              Object.keys(fieldGuidance).find((key) => fieldId.includes(key))!
          ]
        : "Generate compelling, sales-focused copy that drives enrollment. This is bottom-of-funnel.";

    return `You are an expert sales copywriter regenerating a specific field on an enrollment/sales page.

${ENROLLMENT_FRAMEWORK}

## Offer Context:
- Offer Name: ${offerData.name}
- Price: ${offerData.currency} ${offerData.price}
- Target Audience: ${audience}
- Promise: ${offerData.promise || `Transform business for ${audience}`}

## Current Field:
Field ID: ${fieldId}
Current Content: "${fieldContext}"

## Framework Guidance:
${guidance}

## Your Task:
Regenerate ONLY this field's content for a BOTTOM-OF-FUNNEL SALES PAGE.

Remember:
- This is about PURCHASING, not learning
- Use urgent, confident, direct language
- Focus on transformation and results
- Remove all hesitation and friction
- Make the value crystal clear

Return just the new text content (no JSON, no labels, just the raw text):`;
}

export function createEnrollmentSectionPrompt(
    sectionType: string,
    currentContent: string,
    offerData: OfferData,
    intakeData: IntakeData
): string {
    const audience = intakeData.targetAudience || "entrepreneurs";

    return `You are an expert sales copywriter regenerating a section of an enrollment/sales page.

${ENROLLMENT_FRAMEWORK}

## Offer Context:
- Offer: ${offerData.name}
- Price: ${offerData.currency} ${offerData.price}
- Target Audience: ${audience}

## Section to Regenerate:
Section Type: ${sectionType}
Current Content:
${currentContent}

## Your Task:
Regenerate this entire section following the enrollment framework for "${sectionType}".

This is BOTTOM-OF-FUNNEL. Focus on:
1. Urgency and scarcity
2. Proof and credibility
3. Clear path to purchase
4. Removing objections
5. Creating FOMO

Return a JSON object with all fields for this section based on its type.

Generate the new sales-focused section content now (JSON only):`;
}
