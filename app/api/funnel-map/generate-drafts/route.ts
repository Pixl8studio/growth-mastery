/**
 * Funnel Map Draft Generation API
 * Generates AI drafts for all funnel nodes based on Step 1 business profile
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateWithAI, type AIMessage } from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import type { BusinessProfile } from "@/types/business-profile";
import {
    FUNNEL_NODE_DEFINITIONS,
    getNodesForPathway,
    determinePathwayFromPrice,
    type PathwayType,
    type FunnelNodeType,
} from "@/types/funnel-map";

// ============================================
// REQUEST VALIDATION SCHEMA
// ============================================

const PathwayTypeSchema = z.enum(["direct_purchase", "book_call"]);

const GenerateDraftsRequestSchema = z.object({
    projectId: z.string().uuid("Invalid project ID format"),
    pathwayType: PathwayTypeSchema.optional(),
});

interface NodeDraft {
    nodeType: FunnelNodeType;
    content: Record<string, unknown>;
}

interface GenerateDraftsResponse {
    success: boolean;
    drafts: NodeDraft[];
    pathwayType: PathwayType;
    error?: string;
}

export async function POST(request: NextRequest) {
    const requestLogger = logger.child({ route: "funnel-map-generate-drafts" });

    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Validate request body with Zod
        const parseResult = GenerateDraftsRequestSchema.safeParse(await request.json());
        if (!parseResult.success) {
            return NextResponse.json(
                {
                    error: "Invalid request",
                    details: parseResult.error.issues.map((issue) => ({
                        field: issue.path.join("."),
                        message: issue.message,
                    })),
                },
                { status: 400 }
            );
        }

        const { projectId, pathwayType: requestedPathway } = parseResult.data;

        // Verify project ownership
        const { data: project, error: projectError } = await supabase
            .from("funnel_projects")
            .select("user_id")
            .eq("id", projectId)
            .single();

        if (projectError || !project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        if (project.user_id !== user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        requestLogger.info({ projectId }, "Starting funnel draft generation");

        // Load business profile for context
        const { data: businessProfile, error: profileError } = await supabase
            .from("business_profiles")
            .select("*")
            .eq("funnel_project_id", projectId)
            .single();

        if (profileError || !businessProfile) {
            return NextResponse.json(
                { error: "Business profile not found. Complete Step 1 first." },
                { status: 400 }
            );
        }

        // Determine pathway based on pricing
        const pricing = businessProfile.pricing as { webinar?: number; regular?: number } | null;
        const price = pricing?.webinar || pricing?.regular || null;
        const pathwayType = requestedPathway || determinePathwayFromPrice(price);

        requestLogger.info(
            { projectId, pathwayType, price },
            "Determined pathway type"
        );

        // Get nodes for this pathway
        const pathwayNodes = getNodesForPathway(pathwayType);

        // Generate drafts for all nodes in parallel for better performance
        // This reduces total time from ~18s (sequential) to ~2-3s (parallel)
        const draftPromises = pathwayNodes.map(async (nodeDef) => {
            try {
                const draft = await generateNodeDraft(
                    nodeDef.id,
                    businessProfile as BusinessProfile,
                    pathwayType
                );
                requestLogger.info(
                    { projectId, nodeType: nodeDef.id },
                    "Generated draft for node"
                );
                return { nodeType: nodeDef.id, content: draft };
            } catch (error) {
                requestLogger.error(
                    { error, nodeType: nodeDef.id },
                    "Failed to generate draft for node"
                );
                // Return empty content on failure so other nodes still work
                return { nodeType: nodeDef.id, content: {} };
            }
        });

        const drafts = await Promise.all(draftPromises);

        // Save all drafts to database
        await saveDraftsToDatabase(
            supabase,
            user.id,
            projectId,
            drafts,
            pathwayType
        );

        // Create/update funnel map config
        await supabase.from("funnel_map_config").upsert(
            {
                funnel_project_id: projectId,
                user_id: user.id,
                pathway_type: pathwayType,
                drafts_generated: true,
                drafts_generated_at: new Date().toISOString(),
            },
            { onConflict: "funnel_project_id" }
        );

        requestLogger.info(
            { projectId, draftsCount: drafts.length },
            "Funnel drafts generated successfully"
        );

        return NextResponse.json({
            success: true,
            drafts,
            pathwayType,
        } as GenerateDraftsResponse);
    } catch (error) {
        requestLogger.error({ error }, "Funnel draft generation failed");

        Sentry.captureException(error, {
            tags: { route: "funnel-map-generate-drafts" },
            extra: {
                errorType: error instanceof z.ZodError ? "validation" : "runtime",
            },
        });

        // Handle Zod validation errors specifically
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: "Invalid request",
                    details: error.issues.map((issue) => ({
                        field: issue.path.join("."),
                        message: issue.message,
                    })),
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: "Failed to generate funnel drafts" },
            { status: 500 }
        );
    }
}

async function generateNodeDraft(
    nodeType: FunnelNodeType,
    profile: BusinessProfile,
    pathwayType: PathwayType
): Promise<Record<string, unknown>> {
    const nodeDef = FUNNEL_NODE_DEFINITIONS.find((n) => n.id === nodeType);
    if (!nodeDef) return {};

    const systemPrompt = buildDraftSystemPrompt(nodeDef, profile, pathwayType);
    const userPrompt = buildDraftUserPrompt(nodeDef, profile);

    const messages: AIMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
    ];

    const result = await generateWithAI<Record<string, unknown>>(messages, {
        temperature: 0.7,
        maxTokens: 2000,
    });

    return result;
}

function buildDraftSystemPrompt(
    nodeDef: (typeof FUNNEL_NODE_DEFINITIONS)[number],
    profile: BusinessProfile,
    pathwayType: PathwayType
): string {
    const fieldDescriptions = nodeDef.fields
        .map((f) => `- "${f.key}": ${f.label} (type: ${f.type})`)
        .join("\n");

    return `You are an expert marketing strategist and conversion copywriter creating initial drafts for a webinar funnel.

## Your Task
Generate compelling, conversion-focused content for the "${nodeDef.title}" of a webinar funnel.

## Node Description
${nodeDef.description}
${nodeDef.framework ? `Framework: ${nodeDef.framework}` : ""}

## Funnel Pathway
This is a "${pathwayType === "book_call" ? "Book a Call" : "Direct Purchase"}" funnel.
${pathwayType === "book_call" ? "Optimize for high-ticket sales calls." : "Optimize for immediate purchase conversion."}

## Fields to Generate
${fieldDescriptions}

## Response Format
Respond with a JSON object containing ONLY the fields listed above. Example:
{
  "field_key_1": "content for this field",
  "field_key_2": ["item 1", "item 2"] // for list fields
}

## Guidelines
1. Use the business context provided to create personalized content
2. Write conversion-focused, emotionally compelling copy
3. Include specific details from the business profile
4. For list fields, provide 3-5 items
5. Keep text fields concise but impactful
6. Match the brand voice and ideal customer language`;
}

function buildDraftUserPrompt(
    nodeDef: (typeof FUNNEL_NODE_DEFINITIONS)[number],
    profile: BusinessProfile
): string {
    // Build comprehensive context from business profile
    const context = `
## Business Context

### Ideal Customer
${profile.ideal_customer || "Not specified"}

### Transformation Promise
${profile.transformation || "Not specified"}

### Core Problem
Perceived: ${profile.perceived_problem || "Not specified"}
Root Cause: ${profile.root_cause || "Not specified"}

### Story & Credibility
Struggle Story: ${profile.struggle_story || "Not specified"}
Breakthrough: ${profile.breakthrough_moment || "Not specified"}
Credibility: ${profile.credibility_experience || "Not specified"}

### Signature Method
${profile.signature_method || "Not specified"}

### Offer Details
Name: ${profile.offer_name || "Not specified"}
Type: ${profile.offer_type || "Not specified"}
Deliverables: ${profile.deliverables || "Not specified"}
Promise/Outcome: ${profile.promise_outcome || "Not specified"}
Guarantee: ${profile.guarantee || "Not specified"}

### Pricing
${profile.pricing ? `Regular: $${profile.pricing.regular || "TBD"}, Webinar: $${profile.pricing.webinar || "TBD"}` : "Not specified"}

### Key Belief Shifts
Vehicle (Old → New Model): ${profile.vehicle_belief_shift ? JSON.stringify(profile.vehicle_belief_shift) : "Not specified"}
Internal (Self-doubt → Confidence): ${profile.internal_belief_shift ? JSON.stringify(profile.internal_belief_shift) : "Not specified"}
External (Resources → Resourcefulness): ${profile.external_belief_shift ? JSON.stringify(profile.external_belief_shift) : "Not specified"}

### Objections
${profile.top_objections ? profile.top_objections.map((o) => `- ${o.objection}: ${o.response}`).join("\n") : "Not specified"}

---

Generate the "${nodeDef.title}" content based on this business context. Return ONLY valid JSON.`;

    return context;
}

async function saveDraftsToDatabase(
    supabase: Awaited<ReturnType<typeof createClient>>,
    userId: string,
    projectId: string,
    drafts: NodeDraft[],
    pathwayType: PathwayType
) {
    // Prepare upsert data
    const insertData = drafts.map((draft) => ({
        funnel_project_id: projectId,
        user_id: userId,
        node_type: draft.nodeType,
        draft_content: draft.content,
        refined_content: {},
        conversation_history: [],
        status: "draft" as const,
        is_active: true,
        pathway_type: pathwayType,
    }));

    // Upsert all nodes
    const { error } = await supabase
        .from("funnel_node_data")
        .upsert(insertData, {
            onConflict: "funnel_project_id,node_type",
            ignoreDuplicates: false,
        });

    if (error) {
        logger.error({ error, projectId }, "Failed to save drafts to database");
        throw error;
    }
}
