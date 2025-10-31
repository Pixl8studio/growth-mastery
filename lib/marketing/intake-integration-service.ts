/**
 * Marketing Profile Intake Integration
 * Initializes marketing profiles with context from intake data
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { initializeProfile } from "./brand-voice-service";

interface IntakeData {
    id: string;
    transcript_text: string;
    metadata?: {
        businessName?: string;
        industry?: string;
        targetAudience?: string;
        mainProblem?: string;
        desiredOutcome?: string;
        [key: string]: unknown;
    };
}

/**
 * Extract marketing-relevant context from intake data
 */
function extractMarketingContext(intakeData: IntakeData): {
    businessName?: string;
    industry?: string;
    targetAudience?: string;
    brandVoice?: string;
    keywords?: string[];
} {
    const metadata = intakeData.metadata || {};
    const transcript = intakeData.transcript_text || "";

    // Extract from metadata first
    const businessName = metadata.businessName as string | undefined;
    const industry = metadata.industry as string | undefined;
    const targetAudience = metadata.targetAudience as string | undefined;

    // Analyze transcript for tone/voice
    let brandVoice = "professional";
    if (
        transcript.toLowerCase().includes("casual") ||
        transcript.includes("friendly")
    ) {
        brandVoice = "conversational";
    } else if (
        transcript.toLowerCase().includes("expert") ||
        transcript.includes("authority")
    ) {
        brandVoice = "authoritative";
    } else if (
        transcript.toLowerCase().includes("inspire") ||
        transcript.includes("motivate")
    ) {
        brandVoice = "inspirational";
    }

    // Extract potential keywords
    const keywords: string[] = [];
    if (metadata.mainProblem) {
        keywords.push(metadata.mainProblem as string);
    }
    if (metadata.desiredOutcome) {
        keywords.push(metadata.desiredOutcome as string);
    }

    return {
        businessName,
        industry,
        targetAudience,
        brandVoice,
        keywords: keywords.slice(0, 5),
    };
}

/**
 * Initialize marketing profile from intake data
 */
export async function initializeFromIntake(
    userId: string,
    funnelProjectId: string,
    intakeId: string
): Promise<{
    success: boolean;
    profileId?: string;
    error?: string;
}> {
    const requestLogger = logger.child({
        handler: "initialize-marketing-from-intake",
        userId,
        funnelProjectId,
        intakeId,
    });

    try {
        requestLogger.info("🎨 Initializing marketing profile from intake");

        const supabase = await createClient();

        // Fetch intake data
        const { data: intakeData, error: intakeError } = await supabase
            .from("vapi_transcripts")
            .select("*")
            .eq("id", intakeId)
            .eq("user_id", userId)
            .single();

        if (intakeError || !intakeData) {
            requestLogger.error({ error: intakeError }, "Failed to fetch intake data");
            return {
                success: false,
                error: "Failed to fetch intake data",
            };
        }

        // Extract marketing context
        const context = extractMarketingContext(intakeData as IntakeData);

        // Create marketing profile with intake context
        const profileName =
            context.businessName || `${context.industry || "Business"} Profile`;

        const result = await initializeProfile(userId, funnelProjectId, profileName);

        if (!result.success || !result.profile) {
            requestLogger.error(
                { error: result.error },
                "Failed to initialize profile"
            );
            return {
                success: false,
                error: result.error || "Failed to initialize profile",
            };
        }

        // Update profile with intake context
        const { error: updateError } = await supabase
            .from("marketing_profiles")
            .update({
                brand_voice: context.brandVoice || "professional",
                target_audience: context.targetAudience || null,
                industry: context.industry || null,
                key_themes: context.keywords || [],
                sample_content: {
                    extracted_from_intake: true,
                    business_name: context.businessName,
                    intake_id: intakeId,
                },
            })
            .eq("id", result.profile.id);

        if (updateError) {
            requestLogger.error(
                { error: updateError },
                "Failed to update profile context"
            );
            // Don't fail - profile was created successfully
        }

        requestLogger.info(
            { profileId: result.profile.id },
            "✅ Marketing profile initialized from intake"
        );

        return {
            success: true,
            profileId: result.profile.id,
        };
    } catch (error) {
        requestLogger.error({ error }, "Failed to initialize marketing from intake");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Generate initial marketing brief from intake
 */
export async function generateInitialBriefFromIntake(
    userId: string,
    profileId: string,
    intakeId: string
): Promise<{
    success: boolean;
    briefId?: string;
    error?: string;
}> {
    const requestLogger = logger.child({
        handler: "generate-initial-brief-from-intake",
        userId,
        profileId,
        intakeId,
    });

    try {
        requestLogger.info("📝 Generating initial marketing brief from intake");

        const supabase = await createClient();

        // Fetch intake data
        const { data: intakeData, error: intakeError } = await supabase
            .from("vapi_transcripts")
            .select("*")
            .eq("id", intakeId)
            .eq("user_id", userId)
            .single();

        if (intakeError || !intakeData) {
            return {
                success: false,
                error: "Failed to fetch intake data",
            };
        }

        const context = extractMarketingContext(intakeData as IntakeData);
        const metadata = (intakeData as IntakeData).metadata || {};

        // Create initial brief
        const { data: brief, error: briefError } = await supabase
            .from("marketing_content_briefs")
            .insert({
                user_id: userId,
                profile_id: profileId,
                brief_type: "awareness",
                topic: metadata.mainProblem
                    ? `Solving ${metadata.mainProblem}`
                    : "Business Growth Strategy",
                target_audience: context.targetAudience || "Business owners",
                key_points: context.keywords || [],
                cta: "Learn more about our solution",
                status: "draft",
            })
            .select()
            .single();

        if (briefError || !brief) {
            requestLogger.error({ error: briefError }, "Failed to create brief");
            return {
                success: false,
                error: "Failed to create brief",
            };
        }

        requestLogger.info({ briefId: brief.id }, "✅ Initial brief created");

        return {
            success: true,
            briefId: brief.id,
        };
    } catch (error) {
        requestLogger.error({ error }, "Failed to generate initial brief");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
