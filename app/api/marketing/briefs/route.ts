/**
 * Content Briefs API
 * Create and list content briefs
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import type { CreateBriefInput } from "@/types/marketing";

/**
 * POST /api/marketing/briefs
 * Create a new content brief
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        const body: CreateBriefInput = await request.json();

        if (!body.name) {
            throw new ValidationError("name is required");
        }

        if (!body.goal) {
            throw new ValidationError("goal is required");
        }

        if (!body.topic) {
            throw new ValidationError("topic is required");
        }

        // Verify project ownership if specified
        if (body.funnel_project_id) {
            const { data: project } = await supabase
                .from("funnel_projects")
                .select("user_id")
                .eq("id", body.funnel_project_id)
                .single();

            if (!project || project.user_id !== user.id) {
                throw new AuthenticationError("Access denied to funnel project");
            }
        }

        // Create brief
        const { data: brief, error } = await supabase
            .from("marketing_content_briefs")
            .insert({
                user_id: user.id,
                funnel_project_id: body.funnel_project_id || null,
                marketing_profile_id: body.marketing_profile_id || null,
                name: body.name,
                goal: body.goal,
                topic: body.topic,
                icp_description: body.icp_description || null,
                tone_constraints: body.tone_constraints || null,
                transformation_focus: body.transformation_focus || null,
                target_platforms: body.target_platforms || [
                    "instagram",
                    "facebook",
                    "linkedin",
                    "twitter",
                ],
                preferred_framework: body.preferred_framework || "founder_saga",
                funnel_entry_point: body.funnel_entry_point || "step_1_registration",
                space: body.space || "sandbox",
                status: "draft",
            })
            .select()
            .single();

        if (error || !brief) {
            logger.error({ error }, "Failed to create brief");
            return NextResponse.json(
                { error: "Failed to create brief" },
                { status: 500 }
            );
        }

        logger.info({ briefId: brief.id, userId: user.id }, "Brief created");

        return NextResponse.json({
            success: true,
            brief,
        });
    } catch (error) {
        logger.error({ error }, "Error in POST /api/marketing/briefs");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "POST /api/marketing/briefs",
            },
        });

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
 * GET /api/marketing/briefs?funnel_project_id=X
 * List briefs for user or specific funnel
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        const { searchParams } = new URL(request.url);
        const funnelProjectId = searchParams.get("funnel_project_id");
        const space = searchParams.get("space");

        let query = supabase
            .from("marketing_content_briefs")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (funnelProjectId) {
            query = query.eq("funnel_project_id", funnelProjectId);
        }

        if (space) {
            query = query.eq("space", space);
        }

        const { data: briefs, error } = await query;

        if (error) {
            logger.error({ error }, "Failed to fetch briefs");
            return NextResponse.json(
                { error: "Failed to fetch briefs" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            briefs: briefs || [],
        });
    } catch (error) {
        logger.error({ error }, "Error in GET /api/marketing/briefs");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "GET /api/marketing/briefs",
            },
        });

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
