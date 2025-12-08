/**
 * Business Profile API
 *
 * GET /api/context/business-profile?projectId=xxx
 * Gets or creates a business profile for a funnel project
 *
 * PATCH /api/context/business-profile
 * Updates a section of the business profile
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import {
    getOrCreateProfile,
    updateSection,
    getProfileByProject,
} from "@/lib/business-profile/service";
import type { SectionId, SectionData } from "@/types/business-profile";
import * as Sentry from "@sentry/nextjs";

/**
 * GET - Get or create business profile for a project
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
        const projectId = searchParams.get("projectId");

        if (!projectId) {
            throw new ValidationError("projectId is required");
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

        // Get or create profile
        const result = await getOrCreateProfile(user.id, projectId);

        if (!result.success) {
            throw new Error(result.error || "Failed to get business profile");
        }

        logger.info(
            { userId: user.id, projectId, profileId: result.profile?.id },
            "Retrieved business profile"
        );

        return NextResponse.json({
            success: true,
            profile: result.profile,
        });
    } catch (error) {
        logger.error({ error }, "Failed to get business profile");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "get_business_profile",
                endpoint: "GET /api/context/business-profile",
            },
            extra: {
                projectId: new URL(request.url).searchParams.get("projectId"),
            },
        });

        return NextResponse.json(
            { error: "Failed to get business profile" },
            { status: 500 }
        );
    }
}

/**
 * PATCH - Update a section of the business profile
 */
export async function PATCH(request: NextRequest) {
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
        const { projectId, sectionId, sectionData, aiGeneratedFields } = body;

        if (!projectId) {
            throw new ValidationError("projectId is required");
        }

        if (!sectionId) {
            throw new ValidationError("sectionId is required");
        }

        if (!sectionData) {
            throw new ValidationError("sectionData is required");
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

        // Get profile for this project
        const profileResult = await getProfileByProject(projectId);

        if (!profileResult.success || !profileResult.profile) {
            throw new ValidationError("Business profile not found for this project");
        }

        // Verify ownership
        if (profileResult.profile.user_id !== user.id) {
            throw new AuthenticationError("Not authorized to update this profile");
        }

        // Update section
        const result = await updateSection(
            profileResult.profile.id,
            sectionId as SectionId,
            sectionData as SectionData,
            aiGeneratedFields
        );

        if (!result.success) {
            throw new Error(result.error || "Failed to update section");
        }

        logger.info(
            {
                userId: user.id,
                projectId,
                sectionId,
                profileId: result.profile?.id,
            },
            "Updated business profile section"
        );

        return NextResponse.json({
            success: true,
            profile: result.profile,
        });
    } catch (error) {
        logger.error({ error }, "Failed to update business profile");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "update_business_profile",
                endpoint: "PATCH /api/context/business-profile",
            },
            extra: {
                projectId: request.body ? "provided" : "missing",
                sectionId: request.body ? "provided" : "missing",
            },
        });

        return NextResponse.json(
            { error: "Failed to update business profile" },
            { status: 500 }
        );
    }
}
