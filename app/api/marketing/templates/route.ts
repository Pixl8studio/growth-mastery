/**
 * Marketing Templates API
 * Manage content brief templates
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const funnelProjectId = searchParams.get("funnel_project_id");

        logger.info({ userId: user.id, funnelProjectId }, "Templates requested");

        // Mock templates
        const mockTemplates = [
            {
                id: "1",
                name: "Lead Generation Post",
                description: "Standard lead gen template for webinar promotion",
                config: {},
                is_default: true,
                is_favorite: false,
                created_at: new Date().toISOString(),
            },
            {
                id: "2",
                name: "Authority Building",
                description: "Thought leadership content template",
                config: {},
                is_default: true,
                is_favorite: false,
                created_at: new Date().toISOString(),
            },
        ];

        return NextResponse.json({
            success: true,
            templates: mockTemplates,
        });
    } catch (error) {
        logger.error({ error }, "Failed to retrieve templates");

        return NextResponse.json(
            {
                success: false,
                error: "Failed to retrieve templates",
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();

        logger.info({ userId: user.id, templateName: body.name }, "Template creation requested");

        const mockTemplate = {
            id: `tmpl_${Date.now()}`,
            user_id: user.id,
            ...body,
            is_default: false,
            is_favorite: false,
            created_at: new Date().toISOString(),
        };

        return NextResponse.json({
            success: true,
            template: mockTemplate,
        });
    } catch (error) {
        logger.error({ error }, "Template creation failed");

        return NextResponse.json(
            {
                success: false,
                error: "Failed to create template",
            },
            { status: 500 }
        );
    }
}

