/**
 * Business Profile Generator Integration
 * Provides Business Profile context to downstream generators
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { BusinessProfile } from "@/types/business-profile";

export interface GeneratorContext {
    // Core business info
    businessName?: string;
    industry?: string;
    niche?: string;

    // Target audience
    idealCustomer?: string;
    transformation?: string;
    painPoints?: string;
    desires?: string;

    // Offer details
    offerName?: string;
    offerType?: string;
    deliverables?: string;
    promise?: string;
    pricing?: { regular: number | null; webinar: number | null };
    guarantee?: string;
    bonuses?: string;

    // Story elements
    founderStory?: string;
    breakthroughMoment?: string;
    signatureMethod?: string;
    credibility?: string;

    // Teaching content
    vehicleBeliefShift?: {
        oldModel?: string;
        newModel?: string;
        keyInsights?: string[];
    };
    internalBeliefShift?: {
        limitingBelief?: string;
        reframes?: string[];
    };
    externalBeliefShift?: {
        obstacles?: string;
        solutions?: string;
    };

    // CTA and objections
    callToAction?: string;
    incentive?: string;
    objections?: Array<{ objection: string; response: string }>;

    // Raw profile for advanced use
    rawProfile?: BusinessProfile;
}

/**
 * Load generator context from Business Profile
 */
export async function loadGeneratorContext(
    projectId: string
): Promise<{ success: boolean; context?: GeneratorContext; error?: string }> {
    try {
        const supabase = await createClient();

        // Get business profile
        const { data: profile, error: profileError } = await supabase
            .from("business_profiles")
            .select("*")
            .eq("funnel_project_id", projectId)
            .single();

        if (profileError) {
            if (profileError.code === "PGRST116") {
                // No profile found - return empty context
                logger.info(
                    { projectId },
                    "No business profile found, returning empty context"
                );
                return { success: true, context: {} };
            }
            throw profileError;
        }

        // Transform profile into generator context
        const context = transformProfileToContext(profile as BusinessProfile);

        logger.info(
            { projectId, profileId: profile.id },
            "Loaded generator context from business profile"
        );

        return { success: true, context };
    } catch (error) {
        logger.error({ error, projectId }, "Failed to load generator context");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Transform Business Profile into Generator Context
 */
function transformProfileToContext(profile: BusinessProfile): GeneratorContext {
    return {
        // Core business info
        businessName: profile.offer_name || undefined,
        niche: profile.ideal_customer || undefined,

        // Target audience
        idealCustomer: profile.ideal_customer || undefined,
        transformation: profile.transformation || undefined,
        painPoints: profile.daily_pain_points || undefined,
        desires: profile.secret_desires || undefined,

        // Offer details
        offerName: profile.offer_name || undefined,
        offerType: profile.offer_type || undefined,
        deliverables: profile.deliverables || undefined,
        promise: profile.promise_outcome || undefined,
        pricing: profile.pricing || undefined,
        guarantee: profile.guarantee || undefined,
        bonuses: profile.bonuses || undefined,

        // Story elements
        founderStory: profile.struggle_story || undefined,
        breakthroughMoment: profile.breakthrough_moment || undefined,
        signatureMethod: profile.signature_method || undefined,
        credibility: profile.credibility_experience || undefined,

        // Teaching content
        vehicleBeliefShift: profile.vehicle_belief_shift
            ? {
                  oldModel: profile.vehicle_belief_shift.outdated_model || undefined,
                  newModel: profile.vehicle_belief_shift.new_model || undefined,
                  keyInsights: profile.vehicle_belief_shift.key_insights || [],
              }
            : undefined,
        internalBeliefShift: profile.internal_belief_shift
            ? {
                  limitingBelief:
                      profile.internal_belief_shift.limiting_belief || undefined,
                  reframes: profile.internal_belief_shift.mindset_reframes || [],
              }
            : undefined,
        externalBeliefShift: profile.external_belief_shift
            ? {
                  obstacles:
                      profile.external_belief_shift.external_obstacles || undefined,
                  solutions: profile.external_belief_shift.tools_shortcuts || undefined,
              }
            : undefined,

        // CTA and objections
        callToAction: profile.call_to_action || undefined,
        incentive: profile.incentive || undefined,
        objections: profile.top_objections || [],

        // Raw profile
        rawProfile: profile,
    };
}

/**
 * Build prompt context string from generator context
 * This can be appended to AI prompts for richer context
 */
export function buildPromptContext(context: GeneratorContext): string {
    const sections: string[] = [];

    // Target audience section
    if (context.idealCustomer || context.transformation || context.painPoints) {
        sections.push(`## Target Audience
${context.idealCustomer ? `- **Ideal Customer**: ${context.idealCustomer}` : ""}
${context.transformation ? `- **Transformation**: ${context.transformation}` : ""}
${context.painPoints ? `- **Pain Points**: ${context.painPoints}` : ""}
${context.desires ? `- **Desires**: ${context.desires}` : ""}`);
    }

    // Offer section
    if (context.offerName || context.promise || context.deliverables) {
        const priceStr = context.pricing
            ? `Regular: $${context.pricing.regular || "TBD"}, Webinar: $${context.pricing.webinar || "TBD"}`
            : "";
        sections.push(`## Offer Details
${context.offerName ? `- **Offer Name**: ${context.offerName}` : ""}
${context.offerType ? `- **Type**: ${context.offerType}` : ""}
${context.promise ? `- **Promise**: ${context.promise}` : ""}
${context.deliverables ? `- **Deliverables**: ${context.deliverables}` : ""}
${priceStr ? `- **Pricing**: ${priceStr}` : ""}
${context.guarantee ? `- **Guarantee**: ${context.guarantee}` : ""}`);
    }

    // Story section
    if (context.founderStory || context.signatureMethod) {
        sections.push(`## Founder Story
${context.founderStory ? `- **Struggle Story**: ${context.founderStory}` : ""}
${context.breakthroughMoment ? `- **Breakthrough**: ${context.breakthroughMoment}` : ""}
${context.signatureMethod ? `- **Signature Method**: ${context.signatureMethod}` : ""}
${context.credibility ? `- **Credibility**: ${context.credibility}` : ""}`);
    }

    // Belief shifts section
    if (
        context.vehicleBeliefShift ||
        context.internalBeliefShift ||
        context.externalBeliefShift
    ) {
        let beliefContent = "## Belief Shifts\n";
        if (context.vehicleBeliefShift?.newModel) {
            beliefContent += `- **Vehicle**: Old model "${context.vehicleBeliefShift.oldModel}" → New model "${context.vehicleBeliefShift.newModel}"\n`;
        }
        if (context.internalBeliefShift?.limitingBelief) {
            beliefContent += `- **Internal**: Overcome "${context.internalBeliefShift.limitingBelief}"\n`;
        }
        if (context.externalBeliefShift?.obstacles) {
            beliefContent += `- **External**: Address "${context.externalBeliefShift.obstacles}"\n`;
        }
        sections.push(beliefContent);
    }

    // Objections section
    if (context.objections && context.objections.length > 0) {
        const objectionsList = context.objections
            .slice(0, 3)
            .map((o) => `  - "${o.objection}"`)
            .join("\n");
        sections.push(`## Common Objections
${objectionsList}`);
    }

    return sections.join("\n\n");
}

/**
 * Merge Business Profile context with intake transcript for comprehensive context
 */
export async function getMergedGenerationContext(
    projectId: string,
    intakeTranscript?: string
): Promise<{
    success: boolean;
    promptContext: string;
    generatorContext?: GeneratorContext;
    error?: string;
}> {
    const contextResult = await loadGeneratorContext(projectId);

    if (!contextResult.success) {
        // Fall back to just transcript
        return {
            success: true,
            promptContext: intakeTranscript
                ? `## Intake Transcript\n${intakeTranscript}`
                : "",
        };
    }

    const profileContext = buildPromptContext(contextResult.context || {});

    let fullContext = "";
    if (profileContext) {
        fullContext += `# Business Profile Context\n${profileContext}\n\n`;
    }
    if (intakeTranscript) {
        fullContext += `# Intake Transcript\n${intakeTranscript}`;
    }

    return {
        success: true,
        promptContext: fullContext,
        generatorContext: contextResult.context,
    };
}
