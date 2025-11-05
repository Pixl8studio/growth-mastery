/**
 * Registration Copy Generation API
 * Generates lead capture page copy
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { generateWithAI } from "@/lib/ai/client";
import { createRegistrationCopyPrompt } from "@/lib/ai/prompts";
import type { RegistrationCopy } from "@/lib/ai/types";
import { ValidationError } from "@/lib/errors";
import { z } from "zod";

// Validation schema
const generateRegistrationCopySchema = z.object({
    projectId: z.string().uuid("Invalid project ID"),
    deckStructureId: z.string().uuid("Invalid deck structure ID").optional(),
});

export async function POST(request: NextRequest) {
    const requestLogger = logger.child({ handler: "generate-registration-copy" });

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();

        // Validate input with Zod
        const validationResult = generateRegistrationCopySchema.safeParse(body);
        if (!validationResult.success) {
            requestLogger.warn(
                { errors: validationResult.error.issues },
                "Invalid input data"
            );
            return NextResponse.json(
                {
                    error: "Invalid input",
                    details: validationResult.error.issues,
                },
                { status: 400 }
            );
        }

        const { projectId, deckStructureId } = validationResult.data;

        requestLogger.info(
            { userId: user.id, projectId },
            "Generating registration copy"
        );

        // Get project
        const { data: project, error: projectError } = await supabase
            .from("funnel_projects")
            .select("*")
            .eq("id", projectId)
            .eq("user_id", user.id)
            .single();

        if (projectError || !project) {
            throw new ValidationError("Project not found");
        }

        // Get deck structure if provided
        let deckSlides = undefined;
        if (deckStructureId) {
            const { data: deckStructure } = await supabase
                .from("deck_structures")
                .select("slides")
                .eq("id", deckStructureId)
                .eq("user_id", user.id)
                .single();

            if (deckStructure) {
                deckSlides = deckStructure.slides;
            }
        }

        // Generate copy with AI
        const copy = await generateWithAI<RegistrationCopy>(
            createRegistrationCopyPrompt(
                {
                    name: project.name,
                    niche: project.business_niche,
                    targetAudience: project.target_audience,
                },
                deckSlides
            )
        );

        requestLogger.info(
            { userId: user.id },
            "Registration copy generated successfully"
        );

        return NextResponse.json({
            success: true,
            copy,
        });
    } catch (error) {
        requestLogger.error({ error }, "Failed to generate registration copy");

        if (error instanceof ValidationError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.statusCode }
            );
        }

        return NextResponse.json(
            { error: "Failed to generate registration copy" },
            { status: 500 }
        );
    }
}
