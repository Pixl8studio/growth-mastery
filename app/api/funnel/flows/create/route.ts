/**
 * API Route: Create Funnel Flow
 * Automatically creates a funnel flow when all required pages are published
 */

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // Get current user
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { projectId, registrationPageId, watchPageId, enrollmentPageId } = body;

        if (!projectId || !registrationPageId || !watchPageId || !enrollmentPageId) {
            return NextResponse.json(
                { error: "Missing required page IDs" },
                { status: 400 }
            );
        }

        // Verify all pages exist and are published
        const [regPage, watchPage, enrollPage] = await Promise.all([
            supabase
                .from("registration_pages")
                .select("id, is_published")
                .eq("id", registrationPageId)
                .single(),
            supabase
                .from("watch_pages")
                .select("id, is_published")
                .eq("id", watchPageId)
                .single(),
            supabase
                .from("enrollment_pages")
                .select("id, is_published")
                .eq("id", enrollmentPageId)
                .single(),
        ]);

        if (!regPage.data || !watchPage.data || !enrollPage.data) {
            return NextResponse.json(
                { error: "One or more pages not found" },
                { status: 404 }
            );
        }

        if (
            !regPage.data.is_published ||
            !watchPage.data.is_published ||
            !enrollPage.data.is_published
        ) {
            return NextResponse.json(
                { error: "All pages must be published to create a flow" },
                { status: 400 }
            );
        }

        // Check if flow already exists for this project
        const { data: existingFlow } = await supabase
            .from("funnel_flows")
            .select("id")
            .eq("funnel_project_id", projectId)
            .single();

        if (existingFlow) {
            return NextResponse.json(
                { error: "Flow already exists for this project" },
                { status: 409 }
            );
        }

        // Get project name for flow name
        const { data: project } = await supabase
            .from("funnel_projects")
            .select("name")
            .eq("id", projectId)
            .single();

        // Create the flow
        const { data: newFlow, error: flowError } = await supabase
            .from("funnel_flows")
            .insert({
                funnel_project_id: projectId,
                user_id: user.id,
                flow_name: project?.name || "Main Flow",
                registration_page_id: registrationPageId,
                watch_page_id: watchPageId,
                enrollment_page_id: enrollmentPageId,
                status: "connected",
                is_active: true,
            })
            .select()
            .single();

        if (flowError) throw flowError;

        logger.info(
            {
                flowId: newFlow.id,
                projectId,
                userId: user.id,
            },
            "Funnel flow created successfully"
        );

        return NextResponse.json({ flow: newFlow }, { status: 201 });
    } catch (error) {
        logger.error({ error }, "Failed to create funnel flow");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "create-funnel-flow",
                endpoint: "POST /api/funnel/flows/create",
            },
        });

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
