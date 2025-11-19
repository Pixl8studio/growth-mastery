/**
 * AI Ad Generation Engine
 * Generates 5 ad variations using persuasion frameworks and funnel data
 */

import { logger } from "@/lib/logger";
import type { AdVariation, AdGenerationRequest } from "@/types/ads";

/**
 * Generate 5 ad variations using combined frameworks:
 * - Plus Plus / Minus Minus (transformation focus)
 * - 6-Part Ad Framework (hook, problem, agitate, promise, proof, CTA)
 * - Hormozi Principles (value equation, urgency, guarantee)
 * - 70/20/10 Variation Framework (proven/test/experiment)
 */
export async function generateAdVariations(
    request: AdGenerationRequest
): Promise<AdVariation[]> {
    const { offer_data, audience_data, brand_voice } = request;

    logger.info(
        { funnelProjectId: request.funnel_project_id },
        "Generating ad variations"
    );

    // Generate 5 variations: 3 proven angles (70%), 1 new test (20%), 1 wild experiment (10%)
    const variations: AdVariation[] = [];

    // Variation 1: Plus Plus / Minus Minus (Transformation focus)
    variations.push(
        generateTransformationAd(offer_data, audience_data, 1, brand_voice)
    );

    // Variation 2: 6-Part Framework (Problem-Agitate-Solve)
    variations.push(generate6PartAd(offer_data, audience_data, 2, brand_voice));

    // Variation 3: Hormozi Value Equation (Value focus)
    variations.push(generateHormoziAd(offer_data, audience_data, 3, brand_voice));

    // Variation 4: New Test (Social proof + curiosity)
    variations.push(generateSocialProofAd(offer_data, audience_data, 4, brand_voice));

    // Variation 5: Wild Experiment (Pattern interrupt)
    variations.push(
        generatePatternInterruptAd(offer_data, audience_data, 5, brand_voice)
    );

    logger.info({ variationsCount: variations.length }, "Ad variations generated");

    return variations;
}

/**
 * Variation 1: Plus Plus / Minus Minus (Transformation)
 * Highlights before → after transformation
 */
function generateTransformationAd(
    offer: AdGenerationRequest["offer_data"],
    audience: AdGenerationRequest["audience_data"],
    variationNumber: number,
    brandVoice?: string
): AdVariation {
    // Extract first pain point for "minus minus" (before state)
    const painPoint = audience.pain_points[0] || "struggling with challenges";

    // Primary text (95 chars max)
    const primaryText = `Stop ${painPoint}. ${offer.product_name} helps you ${audience.desired_outcome}.`;

    // Headline (40 chars max)
    const headline = `${audience.desired_outcome}`.substring(0, 40);

    // Link description (30 chars max)
    const linkDescription = offer.tagline.substring(0, 30) || "Transform your results";

    // Hooks
    const hooks = {
        long: `Tired of ${painPoint}? Imagine ${audience.desired_outcome} - that's exactly what ${offer.product_name} delivers.`,
        short: `From ${painPoint} to ${audience.desired_outcome}`,
        curiosity: `What if you could ${audience.desired_outcome} without ${painPoint}?`,
    };

    return {
        id: `transformation-${variationNumber}`,
        variation_number: variationNumber,
        framework: "plus_minus",
        primary_text: primaryText.substring(0, 95),
        headline: headline.substring(0, 40),
        link_description: linkDescription.substring(0, 30),
        hooks,
        call_to_action: "LEARN_MORE",
        body_copy: `Before: ${painPoint}\nAfter: ${audience.desired_outcome}\n\n${offer.promise}\n\n${offer.guarantee ? `Guaranteed: ${offer.guarantee}` : ""}`,
        selected: false,
    };
}

/**
 * Variation 2: 6-Part Framework
 * Hook → Problem → Agitate → Promise → Proof → CTA
 */
function generate6PartAd(
    offer: AdGenerationRequest["offer_data"],
    audience: AdGenerationRequest["audience_data"],
    variationNumber: number,
    brandVoice?: string
): AdVariation {
    const problem = audience.pain_points[0] || "common challenges";
    const agitate = audience.pain_points[1] || "holding you back";

    const primaryText = `${problem}? We get it. Let's fix that with ${offer.product_name}.`;

    const headline = `Solve ${problem}`.substring(0, 40);

    const linkDescription = `${offer.promise}`.substring(0, 30);

    const hooks = {
        long: `If ${problem} is ${agitate}, you need a proven solution. ${offer.product_name} is that solution.`,
        short: `The answer to ${problem}`,
        curiosity: `Everyone struggles with ${problem}. Here's what works.`,
    };

    return {
        id: `6part-${variationNumber}`,
        variation_number: variationNumber,
        framework: "6_part",
        primary_text: primaryText.substring(0, 95),
        headline: headline.substring(0, 40),
        link_description: linkDescription.substring(0, 30),
        hooks,
        call_to_action: "SIGN_UP",
        body_copy: `Hook: ${problem} keeping you stuck?\nProblem: ${agitate}\nPromise: ${offer.promise}\nProof: ${audience.desired_outcome}\nCTA: Join now`,
        selected: false,
    };
}

/**
 * Variation 3: Hormozi Value Equation
 * (Dream Outcome × Perceived Likelihood) / (Time Delay × Effort & Sacrifice)
 */
function generateHormoziAd(
    offer: AdGenerationRequest["offer_data"],
    audience: AdGenerationRequest["audience_data"],
    variationNumber: number,
    brandVoice?: string
): AdVariation {
    const primaryText = `${audience.desired_outcome} in record time. ${offer.product_name} makes it easy.`;

    const headline = `Fast Results, Less Effort`.substring(0, 40);

    const linkDescription = `Starting at ${offer.currency}${offer.price}`.substring(
        0,
        30
    );

    const hooks = {
        long: `High value, low effort. ${offer.product_name} delivers ${audience.desired_outcome} without the usual struggle.`,
        short: `Maximum results, minimum effort`,
        curiosity: `What if achieving ${audience.desired_outcome} was actually easy?`,
    };

    return {
        id: `hormozi-${variationNumber}`,
        variation_number: variationNumber,
        framework: "hormozi",
        primary_text: primaryText.substring(0, 95),
        headline: headline.substring(0, 40),
        link_description: linkDescription.substring(0, 30),
        hooks,
        call_to_action: "APPLY_NOW",
        body_copy: `Dream Outcome: ${audience.desired_outcome}\nGuaranteed Results: ${offer.promise}\nNo Risk: ${offer.guarantee || "100% satisfaction"}\nPricing: ${offer.currency}${offer.price}`,
        selected: false,
    };
}

/**
 * Variation 4: Social Proof + Curiosity (20% test)
 */
function generateSocialProofAd(
    offer: AdGenerationRequest["offer_data"],
    audience: AdGenerationRequest["audience_data"],
    variationNumber: number,
    brandVoice?: string
): AdVariation {
    const primaryText = `Join thousands who achieved ${audience.desired_outcome} with ${offer.product_name}.`;

    const headline = `Proven Results. Real People.`.substring(0, 40);

    const linkDescription = offer.tagline.substring(0, 30) || "See success stories";

    const hooks = {
        long: `Over 10,000 people have used ${offer.product_name} to ${audience.desired_outcome}. You could be next.`,
        short: `Join the success stories`,
        curiosity: `Why are so many people raving about ${offer.product_name}?`,
    };

    return {
        id: `social-proof-${variationNumber}`,
        variation_number: variationNumber,
        framework: "social_proof",
        primary_text: primaryText.substring(0, 95),
        headline: headline.substring(0, 40),
        link_description: linkDescription.substring(0, 30),
        hooks,
        call_to_action: "LEARN_MORE",
        body_copy: `Thousands of success stories\n${offer.promise}\nReal results from real people\n${audience.desired_outcome} is waiting`,
        selected: false,
    };
}

/**
 * Variation 5: Pattern Interrupt (10% wild experiment)
 * Uses unexpected angle or contrarian position
 */
function generatePatternInterruptAd(
    offer: AdGenerationRequest["offer_data"],
    audience: AdGenerationRequest["audience_data"],
    variationNumber: number,
    brandVoice?: string
): AdVariation {
    const primaryText = `Everything you know about ${audience.target_audience} is wrong. Here's why.`;

    const headline = `The Truth About Success`.substring(0, 40);

    const linkDescription =
        offer.product_name.substring(0, 30) || "Discover the secret";

    const hooks = {
        long: `Most advice about ${audience.desired_outcome} is backwards. ${offer.product_name} reveals the real path.`,
        short: `The unconventional truth`,
        curiosity: `Why the "experts" are wrong about ${audience.desired_outcome}`,
    };

    return {
        id: `pattern-interrupt-${variationNumber}`,
        variation_number: variationNumber,
        framework: "experiment",
        primary_text: primaryText.substring(0, 95),
        headline: headline.substring(0, 40),
        link_description: linkDescription.substring(0, 30),
        hooks,
        call_to_action: "LEARN_MORE",
        body_copy: `Contrarian truth: ${offer.promise}\nWhy traditional methods fail\nThe ${offer.product_name} approach\nResults: ${audience.desired_outcome}`,
        selected: false,
    };
}

/**
 * Refine generated text to match brand voice
 */
function applyBrandVoice(text: string, brandVoice?: string): string {
    if (!brandVoice) return text;

    // Brand voice adjustments would typically use AI/LLM
    // For now, return as-is (can be enhanced with OpenAI calls)
    return text;
}

/**
 * Validate ad copy against Meta's character limits
 */
export function validateAdCopy(variation: AdVariation): {
    valid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    if (variation.primary_text.length > 95) {
        errors.push(`Primary text too long (${variation.primary_text.length}/95)`);
    }

    if (variation.headline.length > 40) {
        errors.push(`Headline too long (${variation.headline.length}/40)`);
    }

    if (variation.link_description.length > 30) {
        errors.push(
            `Link description too long (${variation.link_description.length}/30)`
        );
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Generate variations with AI enhancement (OpenAI integration)
 */
export async function generateAdVariationsWithAI(
    request: AdGenerationRequest,
    openAIKey?: string
): Promise<AdVariation[]> {
    // If OpenAI key available, enhance with GPT-4
    if (openAIKey) {
        try {
            // Could integrate OpenAI API here for more sophisticated generation
            logger.info({}, "AI-enhanced ad generation not yet implemented");
        } catch (error) {
            logger.error({ error }, "Error in AI-enhanced generation, falling back");
        }
    }

    // Fall back to template-based generation
    return generateAdVariations(request);
}
