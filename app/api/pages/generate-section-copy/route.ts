/**
 * Section Copy Generation API
 * Generate AI-powered copy for page sections based on intake data
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { generateSectionCopy } from "@/lib/pages/section-copy-generator";
import type { PageType } from "@/types/pages";

interface GenerateSectionCopyRequest {
    sectionType: string;
    pageId: string;
    projectId: string;
    customPrompt?: string;
}

export async function POST(request: NextRequest) {
    const requestLogger = logger.child({ handler: "generate-section-copy" });

    try {
        const supabase = await createClient();

        // Authenticate user
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body: GenerateSectionCopyRequest = await request.json();
        const { sectionType, pageId, projectId, customPrompt } = body;

        // Validate inputs
        if (!sectionType || !sectionType.trim()) {
            return NextResponse.json(
                { error: "Section type is required" },
                { status: 400 }
            );
        }

        if (!pageId) {
            return NextResponse.json({ error: "Page ID is required" }, { status: 400 });
        }

        if (!projectId) {
            return NextResponse.json(
                { error: "Project ID is required" },
                { status: 400 }
            );
        }

        // Verify user owns the project
        const { data: project, error: projectError } = await supabase
            .from("funnel_projects")
            .select("id, user_id")
            .eq("id", projectId)
            .eq("user_id", user.id)
            .single();

        if (projectError || !project) {
            requestLogger.error(
                { error: projectError, projectId },
                "Project not found"
            );
            return NextResponse.json(
                { error: "Project not found or access denied" },
                { status: 404 }
            );
        }

        // Get page type
        const { data: page, error: pageError } = await supabase
            .from("pages")
            .select("page_type")
            .eq("id", pageId)
            .single();

        if (pageError || !page) {
            requestLogger.error({ error: pageError, pageId }, "Page not found");
            return NextResponse.json({ error: "Page not found" }, { status: 404 });
        }

        requestLogger.info(
            {
                userId: user.id,
                projectId,
                pageId,
                sectionType,
                pageType: page.page_type,
                hasCustomPrompt: !!customPrompt,
            },
            "Generating section copy"
        );

        // Generate section copy
        const generatedCopy = await generateSectionCopy({
            sectionType,
            pageType: page.page_type as PageType,
            projectId,
            customPrompt,
        });

        requestLogger.info(
            {
                userId: user.id,
                projectId,
                pageId,
                sectionType,
            },
            "Section copy generated successfully"
        );

        return NextResponse.json({
            success: true,
            copy: generatedCopy,
        });
    } catch (error) {
        requestLogger.error({ error }, "Section copy generation failed");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "POST /api/pages/generate-section-copy",
            },
        });

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to generate section copy",
            },
            { status: 500 }
        );
    }
}
