/**
 * Funnel Map Node Regeneration API
 * POST /api/funnel-map/regenerate
 *
 * Regenerate AI draft for a single node.
 * Issue #407 - Priority 3: Per-node draft regeneration
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import type { FunnelNodeType, PathwayType } from "@/types/funnel-map";
import { getNodeDefinition } from "@/types/funnel-map";
import { AI_DRAFT_MAX_TOKENS, AI_DRAFT_TEMPERATURE } from "@/lib/config/funnel-map";

const regenerateRequestSchema = z.object({
    projectId: z.string().uuid(),
    nodeType: z.string() as z.ZodType<FunnelNodeType>,
});

export async function POST(request: NextRequest) {
    const requestId = crypto.randomUUID();
    const requestLogger = logger.child({
        requestId,
        route: "funnel-map/regenerate",
    });

    try {
        // Rate limiting - more restrictive since this is expensive
        const rateLimitResult = await rateLimit(request, {
            identifier: "funnel-map-regenerate",
            limit: 30,
            window: 60 * 60, // 30 per hour
        });

        if (!rateLimitResult.success) {
            return NextResponse.json(
                { error: "Rate limit exceeded. Please try again later." },
                { status: 429 }
            );
        }

        // Parse request
        const body = await request.json();
        const parseResult = regenerateRequestSchema.safeParse(body);

        if (!parseResult.success) {
            return NextResponse.json(
                { error: "Invalid request", details: parseResult.error.errors },
                { status: 400 }
            );
        }

        const { projectId, nodeType } = parseResult.data;

        // Create Supabase client
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options);
                        });
                    },
                },
            }
        );

        // Verify authentication
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            );
        }

        requestLogger.info(
            { userId: user.id, projectId, nodeType },
            "Regenerating node draft"
        );

        // Get node definition
        const nodeDef = getNodeDefinition(nodeType);
        if (!nodeDef) {
            return NextResponse.json(
                { error: "Invalid node type" },
                { status: 400 }
            );
        }

        // Fetch business profile for context
        const { data: businessProfile } = await supabase
            .from("business_profiles")
            .select("*")
            .eq("funnel_project_id", projectId)
            .single();

        if (!businessProfile) {
            return NextResponse.json(
                { error: "Business profile not found. Complete Step 1 first." },
                { status: 400 }
            );
        }

        // Fetch funnel config for pathway type
        const { data: funnelConfig } = await supabase
            .from("funnel_map_config")
            .select("pathway_type")
            .eq("funnel_project_id", projectId)
            .single();

        const pathwayType: PathwayType =
            funnelConfig?.pathway_type || "direct_purchase";

        // Build the prompt for regeneration
        const systemPrompt = buildRegeneratePrompt(
            nodeDef,
            businessProfile,
            pathwayType
        );

        // Generate new draft
        const { text: responseText } = await generateText({
            model: openai("gpt-4o"),
            maxTokens: AI_DRAFT_MAX_TOKENS,
            temperature: AI_DRAFT_TEMPERATURE,
            system: systemPrompt,
            prompt: `Generate fresh content for the "${nodeDef.title}" step of this funnel. Be creative and provide high-quality, conversion-optimized copy based on the business context provided. Return ONLY valid JSON.`,
        });

        // Parse the response
        let newDraftContent: Record<string, unknown>;
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("No JSON found in response");
            }
            newDraftContent = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
            requestLogger.error({ parseError, responseText }, "Failed to parse AI response");
            return NextResponse.json(
                { error: "Failed to generate valid content. Please try again." },
                { status: 500 }
            );
        }

        // Update the node with new draft
        const { error: updateError } = await supabase
            .from("funnel_node_data")
            .update({
                draft_content: newDraftContent,
                refined_content: {}, // Reset refined content
                status: "draft",
                is_approved: false,
                approved_at: null,
                approved_content: {},
            })
            .eq("funnel_project_id", projectId)
            .eq("node_type", nodeType)
            .eq("user_id", user.id);

        if (updateError) {
            requestLogger.error({ error: updateError }, "Failed to save regenerated draft");
            Sentry.captureException(updateError, {
                tags: { action: "regenerate_node" },
                extra: { projectId, nodeType },
            });
            return NextResponse.json(
                { error: "Failed to save regenerated draft" },
                { status: 500 }
            );
        }

        requestLogger.info({ projectId, nodeType }, "Node regenerated successfully");

        return NextResponse.json({
            success: true,
            nodeType,
            draftContent: newDraftContent,
        });
    } catch (error) {
        requestLogger.error({ error }, "Unexpected error in regeneration");
        Sentry.captureException(error, {
            tags: { route: "funnel-map/regenerate" },
        });
        return NextResponse.json(
            { error: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}

function buildRegeneratePrompt(
    nodeDef: ReturnType<typeof getNodeDefinition>,
    businessProfile: Record<string, unknown>,
    pathwayType: PathwayType
): string {
    if (!nodeDef) return "";

    const fieldDescriptions = nodeDef.fields
        .map((f) => `- ${f.key}: ${f.label}${f.required ? " (REQUIRED)" : ""}`)
        .join("\n");

    return `You are an expert marketing strategist and copywriter helping create content for a high-converting webinar funnel.

## Your Task
Generate compelling content for the "${nodeDef.title}" step.
${nodeDef.framework ? `\nUse the ${nodeDef.framework} methodology.` : ""}

## Funnel Pathway
${pathwayType === "book_call" ? "High-ticket (Book a Call) - Offer is $2,000+" : "Direct Purchase - Offer is under $2,000"}

## Fields to Generate
${fieldDescriptions}

## Business Context
<business_context>
- Business Name: ${businessProfile.business_name || "Not specified"}
- Ideal Customer: ${businessProfile.ideal_customer || "Not specified"}
- Transformation Promise: ${businessProfile.transformation || "Not specified"}
- Offer Name: ${businessProfile.offer_name || "Not specified"}
- Signature Method: ${businessProfile.signature_method || "Not specified"}
- Perceived Problem: ${businessProfile.perceived_problem || "Not specified"}
- Desired Outcome: ${businessProfile.desired_outcome || "Not specified"}
- Vehicle Belief Shift: ${businessProfile.vehicle_belief_shift || "Not specified"}
- Internal Belief Shift: ${businessProfile.internal_belief_shift || "Not specified"}
- External Belief Shift: ${businessProfile.external_belief_shift || "Not specified"}
- Poll Questions: ${JSON.stringify(businessProfile.poll_questions || [])}
</business_context>

## Guidelines
1. Write conversion-optimized copy that speaks directly to the ideal customer
2. Use the business context to personalize every element
3. Be specific and concrete, not generic
4. Create urgency and emotional connection
5. Focus on transformation and outcomes

## Response Format
Return ONLY a valid JSON object with the fields listed above. Example:
{
    "field_key_1": "Content for field 1",
    "field_key_2": ["Item 1", "Item 2", "Item 3"]
}

Do not include any text outside the JSON object.`;
}
