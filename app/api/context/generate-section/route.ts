/**
 * Generate Section API
 *
 * POST /api/context/generate-section
 * Generates all answers for a section based on user context
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import {
    generateSectionAnswers,
    generateSingleFieldAnswer,
} from "@/lib/business-profile/ai-section-generator";
import { getProfileByProject } from "@/lib/business-profile/service";
import type { SectionId, BusinessProfile } from "@/types/business-profile";

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
        const { projectId, sectionId, context, existingData, fieldToRegenerate } = body;

        if (!projectId) {
            throw new ValidationError("projectId is required");
        }

        if (!sectionId) {
            throw new ValidationError("sectionId is required");
        }

        if (!context || typeof context !== "string" || context.trim().length === 0) {
            throw new ValidationError("context is required and must be non-empty");
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

        // Check if regenerating a single field
        if (fieldToRegenerate) {
            logger.info(
                {
                    userId: user.id,
                    projectId,
                    sectionId,
                    fieldToRegenerate,
                    contextLength: context.length,
                },
                "Regenerating single field"
            );

            const result = await generateSingleFieldAnswer(
                sectionId as SectionId,
                fieldToRegenerate,
                context,
                profileData
            );

            if (!result.success) {
                throw new Error(result.error || "Failed to regenerate field");
            }

            logger.info(
                {
                    userId: user.id,
                    projectId,
                    sectionId,
                    fieldToRegenerate,
                },
                "Field regenerated successfully"
            );

            return NextResponse.json({
                success: true,
                data: result.data,
                generatedFields: result.generatedFields,
            });
        }

        logger.info(
            {
                userId: user.id,
                projectId,
                sectionId,
                contextLength: context.length,
            },
            "Generating section answers"
        );

        // Generate section answers
        const result = await generateSectionAnswers(
            sectionId as SectionId,
            context,
            profileData
        );

        if (!result.success) {
            throw new Error(result.error || "Failed to generate section answers");
        }

        logger.info(
            {
                userId: user.id,
                projectId,
                sectionId,
                generatedFields: result.generatedFields?.length,
            },
            "Section answers generated successfully"
        );

        return NextResponse.json({
            success: true,
            data: result.data,
            generatedFields: result.generatedFields,
        });
    } catch (error) {
        logger.error({ error }, "Failed to generate section answers");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "generate-section",
                endpoint: "POST /api/context/generate-section",
            },
            extra: {
                projectId: (error as any).projectId,
                sectionId: (error as any).sectionId,
                contextLength: (error as any).contextLength,
            },
        });

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to generate section answers",
            },
            { status: 500 }
        );
    }
}
