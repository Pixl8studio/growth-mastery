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

/**
 * Truncate content for retry attempts to reduce complexity for AI parsing.
 * Keeps the most important content (beginning and end) while removing middle.
 */
function truncateForRetry(content: string, attempt: number): string {
    // Calculate how much to keep based on attempt number
    // Attempt 2: keep 85%, Attempt 3: keep 70%
    const keepRatio = 1 - (attempt - 1) * 0.15;
    const maxLength = Math.floor(content.length * keepRatio);

    if (content.length <= maxLength) {
        return content;
    }

    // Keep more from the beginning (where structure is usually defined)
    const headLength = Math.floor(maxLength * 0.7);
    const tailLength = maxLength - headLength;

    const head = content.slice(0, headLength);
    const tail = content.slice(-tailLength);

    return `${head}\n\n[Content truncated for processing...]\n\n${tail}`;
}

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

        // Parse the pasted content with retry logic and timeout protection
        const PARSE_TIMEOUT_MS = 60000; // 60 seconds
        const MAX_ATTEMPTS = 3;
        let result: Awaited<ReturnType<typeof parseGptPasteResponse>> | null =
            null;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                // On retry attempts, truncate content slightly to help AI process
                const contentToUse =
                    attempt > 1
                        ? truncateForRetry(pastedContent, attempt)
                        : pastedContent;

                const parsePromise = parseGptPasteResponse(
                    sectionId as SectionId,
                    contentToUse,
                    profileData
                );

                const timeoutPromise = new Promise<never>((_, reject) => {
                    setTimeout(() => {
                        reject(
                            new Error(
                                "Request timed out. Please try again with shorter content or try a different section."
                            )
                        );
                    }, PARSE_TIMEOUT_MS);
                });

                const parseResult = await Promise.race([
                    parsePromise,
                    timeoutPromise,
                ]);

                if (parseResult.success) {
                    result = parseResult;
                    break;
                }

                // If parsing returned unsuccessfully, store error and retry
                lastError = new Error(
                    parseResult.error || "Failed to parse response"
                );

                if (attempt < MAX_ATTEMPTS) {
                    logger.info(
                        {
                            attempt,
                            error: lastError.message,
                            sectionId,
                            willRetry: true,
                        },
                        "Parse attempt failed, retrying with truncated content"
                    );
                    // Exponential backoff
                    await new Promise((resolve) =>
                        setTimeout(resolve, 1000 * Math.pow(2, attempt - 1))
                    );
                }
            } catch (parseError) {
                lastError =
                    parseError instanceof Error
                        ? parseError
                        : new Error("Unknown error");

                // Don't retry on certain errors
                const errorMessage = lastError.message;
                if (
                    errorMessage.includes("API key") ||
                    errorMessage.includes("authentication") ||
                    errorMessage.includes("configuration")
                ) {
                    break; // No point retrying config errors
                }

                if (attempt < MAX_ATTEMPTS) {
                    logger.info(
                        {
                            attempt,
                            error: errorMessage,
                            sectionId,
                            willRetry: true,
                        },
                        "Parse threw error, retrying"
                    );
                    await new Promise((resolve) =>
                        setTimeout(resolve, 1000 * Math.pow(2, attempt - 1))
                    );
                }
            }
        }

        // Handle final result
        if (!result || !result.success) {
            // Provide user-friendly error message
            const errorMessage =
                lastError?.message || "Failed to parse GPT response";

            if (
                errorMessage.includes("timeout") ||
                errorMessage.includes("timed out")
            ) {
                throw new Error(
                    "The AI is taking too long to process your content. Please try again or paste shorter content."
                );
            }

            if (
                errorMessage.includes("rate limit") ||
                errorMessage.includes("429")
            ) {
                throw new Error(
                    "AI service is temporarily busy. Please wait a moment and try again."
                );
            }

            if (
                errorMessage.includes("API key") ||
                errorMessage.includes("authentication")
            ) {
                throw new Error(
                    "AI service configuration error. Please contact support."
                );
            }

            throw new Error(
                errorMessage.includes("AI generation failed") ||
                    errorMessage.includes("Unable to parse")
                    ? "Unable to process your content. Please ensure your pasted text is formatted clearly and try again."
                    : errorMessage
            );
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
            extra: {},
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
