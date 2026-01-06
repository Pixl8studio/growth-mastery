/**
 * Funnel Map Data Flow Service
 * Establishes data flows from funnel map nodes to downstream steps
 *
 * Issue #407 - Priority 4: Downstream Integration
 *
 * Feeds data to:
 * - Step 3: Brand Design
 * - Step 4: Presentation Structure (Deck)
 * - Registration Pages
 * - Enrollment Pages
 * - Watch Pages
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import type { FunnelNodeType, FunnelNodeData } from "@/types/funnel-map";

const flowLogger = logger.child({ service: "funnel-map-data-flow" });

interface FunnelMapContext {
    projectId: string;
    userId: string;
    nodeData: Map<FunnelNodeType, FunnelNodeData>;
}

/**
 * Get approved content from a specific node
 */
export function getApprovedContent(
    context: FunnelMapContext,
    nodeType: FunnelNodeType
): Record<string, unknown> | null {
    const node = context.nodeData.get(nodeType);
    if (!node?.is_approved) return null;
    return node.approved_content || node.refined_content || node.draft_content;
}

/**
 * Get content from a node (approved preferred, then refined, then draft)
 */
export function getNodeContent(
    context: FunnelMapContext,
    nodeType: FunnelNodeType
): Record<string, unknown> | null {
    const node = context.nodeData.get(nodeType);
    if (!node) return null;

    if (node.is_approved && Object.keys(node.approved_content || {}).length > 0) {
        return node.approved_content;
    }
    if (Object.keys(node.refined_content || {}).length > 0) {
        return node.refined_content;
    }
    return node.draft_content;
}

/**
 * Extract registration page data from funnel map
 * Used by registration page generator
 */
export function extractRegistrationPageData(context: FunnelMapContext): {
    headline: string | null;
    subheadline: string | null;
    bulletPoints: string[];
    ctaText: string | null;
    accessType: string | null;
    eventDatetime: string | null;
    socialProof: string | null;
} {
    const registrationContent = getNodeContent(context, "registration");

    return {
        headline: (registrationContent?.headline as string) || null,
        subheadline: (registrationContent?.subheadline as string) || null,
        bulletPoints: (registrationContent?.bullet_points as string[]) || [],
        ctaText: (registrationContent?.cta_text as string) || null,
        accessType: (registrationContent?.access_type as string) || null,
        eventDatetime: (registrationContent?.event_datetime as string) || null,
        socialProof: (registrationContent?.social_proof as string) || null,
    };
}

/**
 * Extract masterclass/presentation data from funnel map
 * Used by deck structure generator and watch page generator
 */
export function extractMasterclassData(context: FunnelMapContext): {
    title: string | null;
    promise: string | null;
    hook: string | null;
    originStory: string | null;
    contentPillars: string[];
    pollQuestions: string[];
    beliefShifts: string | null;
    transitionToOffer: string | null;
    offerMessaging: string | null;
} {
    const masterclassContent = getNodeContent(context, "masterclass");

    return {
        title: (masterclassContent?.title as string) || null,
        promise: (masterclassContent?.promise as string) || null,
        hook: (masterclassContent?.hook as string) || null,
        originStory: (masterclassContent?.origin_story as string) || null,
        contentPillars: (masterclassContent?.content_pillars as string[]) || [],
        pollQuestions: (masterclassContent?.poll_questions as string[]) || [],
        beliefShifts: (masterclassContent?.belief_shifts as string) || null,
        transitionToOffer: (masterclassContent?.transition_to_offer as string) || null,
        offerMessaging: (masterclassContent?.offer_messaging as string) || null,
    };
}

/**
 * Extract core offer data (7 Ps Framework) from funnel map
 * Used by enrollment page generator and offer service
 */
export function extractCoreOfferData(context: FunnelMapContext): {
    promise: string | null;
    person: string | null;
    problem: string | null;
    product: string | null;
    process: string | null;
    proof: string | null;
    price: unknown;
    guarantee: string | null;
    urgency: string | null;
    bonuses: string[];
} {
    const coreOfferContent = getNodeContent(context, "core_offer");

    return {
        promise: (coreOfferContent?.promise as string) || null,
        person: (coreOfferContent?.person as string) || null,
        problem: (coreOfferContent?.problem as string) || null,
        product: (coreOfferContent?.product as string) || null,
        process: (coreOfferContent?.process as string) || null,
        proof: (coreOfferContent?.proof as string) || null,
        price: coreOfferContent?.price || null,
        guarantee: (coreOfferContent?.guarantee as string) || null,
        urgency: (coreOfferContent?.urgency as string) || null,
        bonuses: (coreOfferContent?.bonuses as string[]) || [],
    };
}

/**
 * Extract upsell data from funnel map
 */
export function extractUpsellData(
    context: FunnelMapContext,
    upsellNumber: 1 | 2
): {
    headline: string | null;
    promise: string | null;
    person: string | null;
    problem: string | null;
    product: string | null;
    process: string | null;
    proof: string | null;
    price: unknown;
    timeLimit: string | null;
    isDownsell: boolean;
} {
    const nodeType: FunnelNodeType = upsellNumber === 1 ? "upsell_1" : "upsell_2";
    const upsellContent = getNodeContent(context, nodeType);

    return {
        headline: (upsellContent?.headline as string) || null,
        promise: (upsellContent?.promise as string) || null,
        person: (upsellContent?.person as string) || null,
        problem: (upsellContent?.problem as string) || null,
        product: (upsellContent?.product as string) || null,
        process: (upsellContent?.process as string) || null,
        proof: (upsellContent?.proof as string) || null,
        price: upsellContent?.price || null,
        timeLimit: (upsellContent?.time_limit as string) || null,
        isDownsell: upsellContent?.is_downsell === "yes",
    };
}

/**
 * Sync approved funnel map data to the offers table
 */
export async function syncToOffersTable(
    context: FunnelMapContext
): Promise<{ success: boolean; offerId?: string; error?: string }> {
    const supabase = await createClient();

    try {
        const coreOfferData = extractCoreOfferData(context);

        // Check if there's an existing offer for this project
        const { data: existingOffer } = await supabase
            .from("offers")
            .select("id")
            .eq("funnel_project_id", context.projectId)
            .eq("user_id", context.userId)
            .eq("offer_type", "main")
            .single();

        const offerPayload = {
            funnel_project_id: context.projectId,
            user_id: context.userId,
            name: coreOfferData.promise || "Main Offer",
            description: coreOfferData.product,
            price:
                typeof coreOfferData.price === "object" &&
                coreOfferData.price !== null
                    ? (coreOfferData.price as Record<string, number>).webinar ||
                      (coreOfferData.price as Record<string, number>).regular
                    : null,
            guarantee: coreOfferData.guarantee,
            offer_type: "main",
            features: coreOfferData.bonuses.map((b) => ({ title: b })),
            // Store 7 Ps in metadata
            metadata: {
                seven_ps: {
                    promise: coreOfferData.promise,
                    person: coreOfferData.person,
                    problem: coreOfferData.problem,
                    product: coreOfferData.product,
                    process: coreOfferData.process,
                    proof: coreOfferData.proof,
                },
            },
        };

        if (existingOffer) {
            // Update existing offer
            const { error } = await supabase
                .from("offers")
                .update(offerPayload)
                .eq("id", existingOffer.id);

            if (error) throw error;

            flowLogger.info(
                { projectId: context.projectId, offerId: existingOffer.id },
                "Updated offer from funnel map"
            );

            return { success: true, offerId: existingOffer.id };
        } else {
            // Create new offer
            const { data, error } = await supabase
                .from("offers")
                .insert(offerPayload)
                .select("id")
                .single();

            if (error) throw error;

            flowLogger.info(
                { projectId: context.projectId, offerId: data.id },
                "Created offer from funnel map"
            );

            return { success: true, offerId: data.id };
        }
    } catch (error) {
        flowLogger.error({ error, projectId: context.projectId }, "Failed to sync to offers");
        Sentry.captureException(error, {
            tags: { action: "sync_funnel_to_offers" },
            extra: { projectId: context.projectId },
        });
        return { success: false, error: String(error) };
    }
}

/**
 * Load funnel map context from database
 */
export async function loadFunnelMapContext(
    projectId: string,
    userId: string
): Promise<FunnelMapContext | null> {
    const supabase = await createClient();

    const { data: nodes, error } = await supabase
        .from("funnel_node_data")
        .select("*")
        .eq("funnel_project_id", projectId)
        .eq("user_id", userId);

    if (error || !nodes) {
        flowLogger.error({ error, projectId }, "Failed to load funnel map context");
        return null;
    }

    const nodeData = new Map<FunnelNodeType, FunnelNodeData>();
    for (const node of nodes) {
        nodeData.set(node.node_type as FunnelNodeType, node as FunnelNodeData);
    }

    return { projectId, userId, nodeData };
}

/**
 * Check if all required nodes are approved for downstream integration
 */
export function checkDownstreamReadiness(
    context: FunnelMapContext,
    requiredNodes: FunnelNodeType[]
): { ready: boolean; missingApprovals: FunnelNodeType[] } {
    const missingApprovals: FunnelNodeType[] = [];

    for (const nodeType of requiredNodes) {
        const node = context.nodeData.get(nodeType);
        if (!node?.is_approved) {
            missingApprovals.push(nodeType);
        }
    }

    return {
        ready: missingApprovals.length === 0,
        missingApprovals,
    };
}

/**
 * Get required nodes for a specific downstream step
 */
export function getRequiredNodesForStep(
    step: "brand_design" | "deck_structure" | "registration_page" | "enrollment_page" | "watch_page"
): FunnelNodeType[] {
    switch (step) {
        case "brand_design":
            return ["traffic_source", "registration", "masterclass"];
        case "deck_structure":
            return ["masterclass", "core_offer"];
        case "registration_page":
            return ["registration"];
        case "enrollment_page":
            return ["core_offer"];
        case "watch_page":
            return ["masterclass"];
        default:
            return [];
    }
}
