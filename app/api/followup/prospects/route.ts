/**
 * Prospects API Endpoint
 *
 * Manages AI follow-up prospects: creation, retrieval, and listing.
 * Supports POST (create) and GET (list) operations.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import { createProspect, listProspects } from "@/lib/followup/prospect-service";
import type { CreateProspectInput } from "@/types/followup";

/**
 * POST /api/followup/prospects
 *
 * Create a new follow-up prospect.
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Get authenticated user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        // Parse request body
        const body = await request.json();

        // Validate required fields
        if (!body.email) {
            throw new ValidationError("Email is required");
        }

        if (!body.funnel_project_id) {
            throw new ValidationError("Funnel project ID is required");
        }

        // Create prospect input
        const prospectInput: CreateProspectInput = {
            funnel_project_id: body.funnel_project_id,
            contact_id: body.contact_id,
            agent_config_id: body.agent_config_id,
            email: body.email,
            first_name: body.first_name,
            phone: body.phone,
            timezone: body.timezone,
            locale: body.locale,
            metadata: body.metadata,
        };

        // Create the prospect
        const result = await createProspect(user.id, prospectInput);

        if (!result.success) {
            logger.error(
                { error: result.error, userId: user.id },
                "❌ Prospect creation failed"
            );
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        logger.info(
            {
                prospectId: result.prospect?.id,
                userId: user.id,
                email: body.email,
            },
            "✅ Prospect created via API"
        );

        return NextResponse.json({
            success: true,
            prospect: result.prospect,
        });
    } catch (error) {
        logger.error({ error }, "❌ Error in POST /api/followup/prospects");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * GET /api/followup/prospects
 *
 * List prospects for a funnel project with optional filtering.
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Get authenticated user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        // Get query parameters
        const { searchParams } = new URL(request.url);
        const funnelProjectId = searchParams.get("funnel_project_id");
        const segment = searchParams.get("segment");
        const minIntentScore = searchParams.get("min_intent_score");
        const converted = searchParams.get("converted");

        if (!funnelProjectId) {
            throw new ValidationError("funnel_project_id query parameter is required");
        }

        // Build filters
        const filters: {
            segment?: string;
            min_intent_score?: number;
            converted?: boolean;
        } = {};

        if (segment) {
            filters.segment = segment;
        }

        if (minIntentScore) {
            filters.min_intent_score = parseInt(minIntentScore, 10);
        }

        if (converted !== null) {
            filters.converted = converted === "true";
        }

        // List prospects
        const result = await listProspects(user.id, funnelProjectId, filters);

        if (!result.success) {
            logger.error(
                { error: result.error, userId: user.id },
                "❌ Failed to list prospects"
            );
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            prospects: result.prospects || [],
            count: result.prospects?.length || 0,
        });
    } catch (error) {
        logger.error({ error }, "❌ Error in GET /api/followup/prospects");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
