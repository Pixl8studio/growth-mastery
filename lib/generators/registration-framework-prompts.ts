/**
 * Registration Page Framework Prompts
 * Generates AI prompts based on Universal Webinar Registration Landing Page Framework
 * Follows the 13-section structure with psychology and conversion strategies
 */

import type { Slide } from "@/lib/ai/types";
import {
    DESIGN_SYSTEM_GUIDELINES,
    ICON_USAGE_GUIDELINES,
} from "@/lib/ai/design-system-guidelines";

interface IntakeData {
    targetAudience?: string;
    businessNiche?: string;
    mainProblem?: string;
    desiredOutcome?: string;
    industry?: string;
    person?: string;
}

interface OfferData {
    name: string;
    tagline?: string | null;
    promise?: string | null;
    purpose?: string | null;
}

const REGISTRATION_FRAMEWORK = `
# Universal Webinar Registration Landing Page Framework

This framework ensures high-converting registration pages using proven psychology and conversion strategies.

## Framework Sections:

1. **Hero Header**: [Free] [Type of Event] For [Target Audience] + [#] Steps To [Specific Desired Outcome]
   - Psychology: Instantly position the offer as free, valuable, and targeted

2. **Sub-Header (Hook Promise)**: Discover how to [convert current struggle] into [desirable outcome] that [emotional payoff]
   - Psychology: Introduces transformation and relief of pain points

3. **Opt-In Form**: First Name + Email (required), Phone + SMS consent (optional)
   - Button: [Action Verb] For Free [Event]
   - Psychology: Minimal fields reduce friction

4. **Social Proof Bar**: [Impressive Metric] + [Trusted Network] + [Projects Completed] + [Notable Partners]
   - Psychology: Authority + bandwagon effect

5. **Agenda / What You'll Learn**: 5 bullets with "How to" framing
   - Each bullet: How to [overcome obstacle] so you can [achieve desired result]
   - Psychology: Reduces uncertainty, creates anticipation

6. **3-Step Transformation**: [Step 1: Internal Clarity] → [Step 2: External Expression] → [Step 3: Tangible Result]
   - Psychology: Simplifies complexity into achievable roadmap

7. **Founder / Host Section**: Mini-bio + credentials + mission statement
   - Psychology: Builds trust through humanization and expertise

8. **Proof of Concept**: It took us [X years/resources] to master... you'll get it in [short time frame]
   - Psychology: Scarcity of expertise + authority

9. **Community / Support**: Proven Models | Guidance & Support | Like-Minded Community
   - Psychology: Emphasizes belonging (safety in numbers)

10. **Testimonials**: Curate diverse testimonials (results, emotional impact, credibility)
    - Format: "Working with [Name] helped me [result] because [reason]."

11. **Call-to-Action**: It's time for you to [achieve dream]. Join us and [bigger vision].
    - Button: Join Free Masterclass / Register Now

12. **Inspirational Closing Quote** (optional): Famous quote reinforcing positioning
`;

export function createFullPageRegenerationPrompt(
    intakeData: IntakeData,
    offerData: OfferData | null,
    deckSlides: Slide[]
): string {
    const audience = intakeData.targetAudience || "business owners";
    const outcome = intakeData.desiredOutcome || "achieve their goals";
    const problem = intakeData.mainProblem || "challenges they face";

    return `You are an expert conversion copywriter creating a high-converting webinar registration page.

${REGISTRATION_FRAMEWORK}

${DESIGN_SYSTEM_GUIDELINES}

${ICON_USAGE_GUIDELINES}

## Context About This Business:

**Target Audience**: ${audience}
**Business Niche**: ${intakeData.businessNiche || "business coaching"}
**Main Problem**: ${problem}
**Desired Outcome**: ${outcome}
**Offer Name**: ${offerData?.name || "Masterclass Training"}
**Offer Promise**: ${offerData?.promise || `Help ${audience} ${outcome}`}
**Offer Purpose**: ${offerData?.purpose || `Transform how ${audience} approach their business`}

## Deck Content (for extracting benefits and proof):
${deckSlides
    .slice(0, 10)
    .map((s, i) => `Slide ${i + 1}: ${s.title}\n${s.description}`)
    .join("\n\n")}

## Your Task:

Generate complete, conversion-optimized copy for ALL sections of the registration page following the framework above.

**Requirements:**
1. Follow the psychological principles stated in each section
2. Use the conversion strategies provided
3. Maintain the user's authentic voice and terminology
4. Make it specific to their business context (not generic)
5. Create compelling, actionable copy (not placeholder text)
6. Include specific numbers, metrics, and proof points where possible
7. Make every section work toward the single goal: getting registrations

Return your response as a JSON object with these keys:
{
  "heroHeadline": "The main hero headline",
  "heroSubheadline": "The supporting headline/promise",
  "subHeader": "The hook promise text",
  "socialProofStats": ["stat 1", "stat 2", "stat 3", "stat 4"],
  "agendaBullets": ["bullet 1", "bullet 2", "bullet 3", "bullet 4", "bullet 5"],
  "threeStepProcess": {
    "step1": {"title": "Step 1", "description": "desc"},
    "step2": {"title": "Step 2", "description": "desc"},
    "step3": {"title": "Step 3", "description": "desc"}
  },
  "founderBio": "Founder bio paragraph",
  "founderMission": "Mission statement quote",
  "proofOfConcept": "The 'it took us X years' paragraph",
  "communityPoints": ["point 1", "point 2", "point 3"],
  "testimonials": [
    {"quote": "short quote", "story": "full story", "name": "Name", "title": "Title"}
  ],
  "finalCtaHeadline": "Final CTA headline",
  "finalCtaSubtext": "Supporting text for final CTA",
  "inspirationalQuote": "Optional closing quote"
}

Generate compelling, specific, conversion-focused copy now.`;
}

export function createFieldRegenerationPrompt(
    fieldId: string,
    fieldContext: string,
    intakeData: IntakeData,
    offerData: OfferData | null,
    deckSlides: Slide[]
): string {
    const audience = intakeData.targetAudience || "business owners";
    const outcome = intakeData.desiredOutcome || "achieve their goals";

    // Map field IDs to framework sections
    const fieldGuidance: Record<string, string> = {
        "hero-headline": `Follow the framework: [Free] [Type of Event] For [Target Audience]. Example: "A Free Masterclass For ${audience}". Make it specific and compelling.`,
        "hero-subheadline": `Follow the framework: [#] Steps To [Specific Desired Outcome]. Example: "5 Steps To ${outcome}". Make it actionable and clear.`,
        "sub-header": `Follow the framework: Discover how to [convert current struggle] into [desirable outcome] that [emotional payoff]. Focus on transformation.`,
        "social-proof": `Follow the framework: [Impressive Metric] + [Trusted Network] + [Projects Completed] + [Notable Partners]. Use real numbers if available from deck.`,
        "agenda-bullet": `Follow the framework: How to [overcome obstacle] so you can [achieve desired result]. Make it actionable and valuable.`,
        "founder-bio": `Include years of experience + tangible results + humanizing story. Build trust through authority and relatability.`,
        testimonial: `Follow the framework: "Working with [Name] helped me [result] because [reason]." Include specific outcomes and emotional impact.`,
        "cta-headline": `Follow the framework: It's time for you to [achieve dream]. Join us and [bigger vision]. Make it inspirational and urgent.`,
    };

    const guidance = Object.keys(fieldGuidance).find((key) => fieldId.includes(key))
        ? fieldGuidance[
              Object.keys(fieldGuidance).find((key) => fieldId.includes(key))!
          ]
        : "Generate compelling, conversion-focused copy that fits naturally in the page.";

    return `You are an expert conversion copywriter regenerating a specific field on a webinar registration page.

${REGISTRATION_FRAMEWORK}

## Business Context:
- Target Audience: ${audience}
- Business Niche: ${intakeData.businessNiche || "business coaching"}
- Main Problem: ${intakeData.mainProblem || "challenges they face"}
- Desired Outcome: ${outcome}
- Offer: ${offerData?.name || "Masterclass Training"}

## Current Field Context:
Field ID: ${fieldId}
Current Content: "${fieldContext}"

## Framework Guidance for This Field:
${guidance}

## Your Task:
Regenerate ONLY this field's content. Return just the new text content (no JSON, no labels, just the raw text).
Make it:
1. Specific to this business (not generic)
2. Aligned with the framework's psychology principles
3. Conversion-optimized
4. Natural and compelling
5. Consistent with the user's brand voice

Generate the new content now (text only):`;
}

export function createSectionRegenerationPrompt(
    sectionType: string,
    currentContent: string,
    intakeData: IntakeData,
    offerData: OfferData | null,
    deckSlides: Slide[]
): string {
    const audience = intakeData.targetAudience || "business owners";
    const outcome = intakeData.desiredOutcome || "achieve their goals";

    return `You are an expert conversion copywriter regenerating a section of a webinar registration page.

${REGISTRATION_FRAMEWORK}

## Business Context:
- Target Audience: ${audience}
- Business Niche: ${intakeData.businessNiche || "business coaching"}
- Desired Outcome: ${outcome}
- Offer: ${offerData?.name || "Masterclass Training"}

## Section to Regenerate:
Section Type: ${sectionType}
Current Content:
${currentContent}

## Your Task:
Regenerate this entire section following the framework guidelines above for "${sectionType}".

Return a JSON object with all fields for this section. The structure depends on the section type:

- For "hero": {"headline": "...", "subheadline": "..."}
- For "testimonial": {"testimonials": [{"quote": "...", "story": "...", "name": "...", "title": "..."}]}
- For "agenda": {"bullets": ["...", "...", "..."]}
- For "three-step": {"steps": [{"title": "...", "description": "..."}]}

Generate the new section content now (JSON only):`;
}
