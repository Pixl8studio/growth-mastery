/**
 * Parse GPT Paste API
 *
 * POST /api/context/parse-gpt-paste
 * Parses a pasted GPT response and extracts section answers
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import { parseGptPasteResponse } from "@/lib/business-profile/ai-section-generator";
import { getProfileByProject } from "@/lib/business-profile/service";
import type { SectionId, BusinessProfile } from "@/types/business-profile";
import * as Sentry from "@sentry/nextjs";

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

        const body = await request.json();
        const { projectId, sectionId, pastedContent, existingData } = body;

        if (!projectId) {
            throw new ValidationError("projectId is required");
        }

        if (!sectionId) {
            throw new ValidationError("sectionId is required");
        }

        if (
            !pastedContent ||
            typeof pastedContent !== "string" ||
            pastedContent.trim().length === 0
        ) {
            throw new ValidationError(
                "pastedContent is required and must be non-empty"
            );
        }

        // Validate sectionId
        const validSections: SectionId[] = [
            "section1",
            "section2",
            "section3",
            "section4",
            "section5",
        ];
        if (!validSections.includes(sectionId as SectionId)) {
            throw new ValidationError("Invalid sectionId");
        }

        // Verify project ownership
        const { data: project, error: projectError } = await supabase
            .from("funnel_projects")
            .select("id, user_id")
            .eq("id", projectId)
            .single();

        if (projectError || !project) {
            throw new ValidationError("Project not found");
        }

        if (project.user_id !== user.id) {
            throw new AuthenticationError("Not authorized to access this project");
        }

        // Get existing profile data for context
        let profileData: Partial<BusinessProfile> = existingData || {};

        if (!existingData) {
            const profileResult = await getProfileByProject(projectId);
            if (profileResult.success && profileResult.profile) {
                profileData = profileResult.profile;
            }
        }

        logger.info(
            {
                userId: user.id,
                projectId,
                sectionId,
                contentLength: pastedContent.length,
            },
            "Parsing GPT paste response"
        );

        // Parse the pasted content
        const result = await parseGptPasteResponse(
            sectionId as SectionId,
            pastedContent,
            profileData
        );

        if (!result.success) {
            throw new Error(result.error || "Failed to parse GPT response");
        }

        logger.info(
            {
                userId: user.id,
                projectId,
                sectionId,
                parsedFields: result.generatedFields?.length,
            },
            "GPT paste response parsed successfully"
        );

        return NextResponse.json({
            success: true,
            data: result.data,
            generatedFields: result.generatedFields,
        });
    } catch (error) {
        logger.error({ error }, "Failed to parse GPT paste response");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "parse_gpt_paste",
                endpoint: "POST /api/context/parse-gpt-paste",
            },
            extra: {
                projectId,
                sectionId,
                contentLength: pastedContent?.length,
                hasExistingData: !!existingData,
            },
        });

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to parse GPT response",
            },
            { status: 500 }
        );
    }
}
