/**
 * Offer Routing Service
 *
 * Handles multi-offer routing and price-aware personalization.
 * Routes prospects to appropriate sequences based on offer and price band.
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { determinePriceBand } from "./content-selector-service";

export interface OfferContext {
    offer_id: string;
    offer_name: string;
    price: number;
    price_band: "low" | "mid" | "high";
    offer_type: string;
    business_niche?: string;
}

/**
 * Get offer context for personalization.
 *
 * Fetches offer details and calculates price band.
 */
export async function getOfferContext(
    offerId: string
): Promise<{ success: boolean; context?: OfferContext; error?: string }> {
    const supabase = await createClient();

    logger.info({ offerId }, "🎯 Getting offer context");

    const { data, error } = await supabase
        .from("offers")
        .select("id, name, price, offer_type")
        .eq("id", offerId)
        .single();

    if (error) {
        logger.error({ error, offerId }, "❌ Failed to fetch offer");
        return { success: false, error: error.message };
    }

    const priceBand = determinePriceBand(Number(data.price));

    const context: OfferContext = {
        offer_id: data.id,
        offer_name: data.name,
        price: Number(data.price),
        price_band: priceBand,
        offer_type: data.offer_type || "main",
    };

    logger.info(
        {
            offerId,
            offerName: data.name,
            priceBand,
        },
        "✅ Offer context retrieved"
    );

    return { success: true, context };
}

/**
 * Route prospect to appropriate sequence based on offer and segment.
 *
 * Different offers may use different sequences with different messaging strategies.
 */
export async function routeProspectToSequence(
    prospectId: string,
    offerId?: string
): Promise<{
    success: boolean;
    sequence_id?: string;
    reason?: string;
    error?: string;
}> {
    const supabase = await createClient();

    logger.info(
        {
            prospectId,
            offerId,
        },
        "🧭 Routing prospect to sequence"
    );

    // Get prospect details
    const { data: prospect, error: prospectError } = await supabase
        .from("followup_prospects")
        .select("*")
        .eq("id", prospectId)
        .single();

    if (prospectError || !prospect) {
        logger.error(
            { error: prospectError, prospectId },
            "❌ Failed to fetch prospect"
        );
        return { success: false, error: "Prospect not found" };
    }

    // Get agent config (offer-specific or default)
    let agentConfigId = prospect.agent_config_id;

    if (!agentConfigId) {
        // Find appropriate agent config
        if (offerId) {
            const { data: offerConfig } = await supabase
                .from("followup_agent_configs")
                .select("id")
                .eq("offer_id", offerId)
                .eq("is_active", true)
                .single();

            agentConfigId = offerConfig?.id;
        }

        // Fall back to default funnel config
        if (!agentConfigId) {
            const { data: defaultConfig } = await supabase
                .from("followup_agent_configs")
                .select("id")
                .eq("funnel_project_id", prospect.funnel_project_id)
                .is("offer_id", null)
                .eq("is_active", true)
                .single();

            agentConfigId = defaultConfig?.id;
        }
    }

    if (!agentConfigId) {
        logger.warn({ prospectId, offerId }, "⚠️  No agent config found for prospect");
        return { success: false, error: "No agent configuration available" };
    }

    // Find active automated sequence for this config and segment
    const { data: sequence, error: sequenceError } = await supabase
        .from("followup_sequences")
        .select("id, name, target_segments")
        .eq("agent_config_id", agentConfigId)
        .eq("is_active", true)
        .eq("is_automated", true)
        .contains("target_segments", [prospect.segment])
        .single();

    if (sequenceError || !sequence) {
        logger.warn(
            {
                prospectId,
                segment: prospect.segment,
                agentConfigId,
            },
            "⚠️  No matching sequence found"
        );
        return {
            success: false,
            error: `No automated sequence for segment ${prospect.segment}`,
        };
    }

    logger.info(
        {
            prospectId,
            sequenceId: sequence.id,
            sequenceName: sequence.name,
            segment: prospect.segment,
        },
        "✅ Prospect routed to sequence"
    );

    return {
        success: true,
        sequence_id: sequence.id,
        reason: `Matched ${prospect.segment} segment to ${sequence.name}`,
    };
}

/**
 * Get price-aware messaging configuration.
 *
 * Returns messaging guidelines based on offer price band.
 * Higher prices need more proof, lower prices can be more casual.
 */
export function getPriceAwareMessagingRules(priceBand: "low" | "mid" | "high"): {
    tone: string;
    proof_emphasis: string;
    urgency_level: string;
    touch_count_recommendation: number;
} {
    const rules = {
        low: {
            tone: "casual",
            proof_emphasis: "moderate",
            urgency_level: "gentle",
            touch_count_recommendation: 3,
        },
        mid: {
            tone: "professional",
            proof_emphasis: "strong",
            urgency_level: "moderate",
            touch_count_recommendation: 5,
        },
        high: {
            tone: "consultative",
            proof_emphasis: "comprehensive",
            urgency_level: "subtle",
            touch_count_recommendation: 7,
        },
    };

    logger.info(
        {
            priceBand,
            tone: rules[priceBand].tone,
            touchCount: rules[priceBand].touch_count_recommendation,
        },
        "📋 Retrieved price-aware messaging rules"
    );

    return rules[priceBand];
}

/**
 * Adapt message for offer type.
 *
 * Main offers, upsells, and downsells need different messaging approaches.
 */
export function getOfferTypeMessagingRules(offerType: string): {
    emphasis: string;
    cta_style: string;
    proof_type: string;
} {
    const rules: Record<
        string,
        {
            emphasis: string;
            cta_style: string;
            proof_type: string;
        }
    > = {
        main: {
            emphasis: "transformation",
            cta_style: "direct",
            proof_type: "case_study",
        },
        upsell: {
            emphasis: "enhancement",
            cta_style: "complementary",
            proof_type: "proof_element",
        },
        downsell: {
            emphasis: "accessibility",
            cta_style: "gentle",
            proof_type: "testimonial",
        },
    };

    return rules[offerType] || rules.main;
}

/**
 * Link prospect to specific offer.
 *
 * Associates prospect with an offer and its corresponding agent config.
 * Used when prospect clicks on specific offer or shows interest.
 */
export async function linkProspectToOffer(
    prospectId: string,
    offerId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    logger.info({ prospectId, offerId }, "🔗 Linking prospect to offer");

    // Get offer's agent config
    const { data: agentConfig } = await supabase
        .from("followup_agent_configs")
        .select("id")
        .eq("offer_id", offerId)
        .eq("is_active", true)
        .single();

    // Update prospect with agent config
    const { error } = await supabase
        .from("followup_prospects")
        .update({
            agent_config_id: agentConfig?.id || null,
        })
        .eq("id", prospectId);

    if (error) {
        logger.error(
            { error, prospectId, offerId },
            "❌ Failed to link prospect to offer"
        );
        return { success: false, error: error.message };
    }

    logger.info(
        {
            prospectId,
            offerId,
            agentConfigId: agentConfig?.id,
        },
        "✅ Prospect linked to offer"
    );

    return { success: true };
}
