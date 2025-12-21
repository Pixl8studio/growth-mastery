/**
 * Funnel Step Completion Tracking
 * Checks which steps have actual content generated and saved
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type {
    StepCompletion,
    MasterStepCompletion,
    MasterStepProgress,
} from "./completion-types";
import {
    MASTER_STEPS,
    calculateMasterStepCompletion,
    calculateOverallCompletion,
} from "./master-steps-config";

/**
 * Check if intake has been completed for a project
 * Returns true if at least one intake session (vapi transcript) exists
 * OR if a business profile with meaningful completion exists
 */
export async function hasCompletedIntake(projectId: string): Promise<boolean> {
    const requestLogger = logger.child({
        handler: "has-completed-intake",
        projectId,
    });

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return false;
        }

        // Check for vapi transcripts and business profiles in parallel
        const [transcriptsResult, profileResult] = await Promise.all([
            supabase
                .from("vapi_transcripts")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id),
            supabase
                .from("business_profiles")
                .select("id, completion_status")
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id)
                .maybeSingle(),
        ]);

        const hasTranscripts = (transcriptsResult.count ?? 0) > 0;
        const hasBusinessProfile = Boolean(
            profileResult.data &&
                (profileResult.data.completion_status as any)?.overall > 0
        );

        const hasIntake = hasTranscripts || hasBusinessProfile;
        requestLogger.info(
            { hasIntake, hasTranscripts, hasBusinessProfile },
            "Intake completion checked"
        );

        return hasIntake;
    } catch (error) {
        requestLogger.error({ error }, "Failed to check intake completion");
        return false;
    }
}

/**
 * Check completion status for all 15 steps
 * Returns which steps have actual generated content
 */
export async function getStepCompletionStatus(
    projectId: string
): Promise<StepCompletion[]> {
    const requestLogger = logger.child({
        handler: "get-step-completion",
        projectId,
    });

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return Array.from({ length: 13 }, (_, i) => ({
                step: i + 1,
                isCompleted: false,
                hasContent: false,
            }));
        }

        requestLogger.info({ userId: user.id }, "Checking step completion status");

        // Check all steps in parallel
        const [
            transcripts,
            businessProfiles,
            offers,
            brandDesigns,
            deckStructures,
            gammaDecks,
            videos,
            enrollmentPages,
            watchPages,
            registrationPages,
            flows,
            followupConfigs,
            marketingBriefs,
            adCampaigns,
        ] = await Promise.all([
            // Step 1: VAPI Transcripts
            supabase
                .from("vapi_transcripts")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id),

            // Step 1 (Alternative): Business Profiles with completion
            supabase
                .from("business_profiles")
                .select("id, completion_status")
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id)
                .maybeSingle(),

            // Step 2: Offers
            supabase
                .from("offers")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id),

            // Step 3: Brand Designs
            supabase
                .from("brand_designs")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id),

            // Step 4: Deck Structures
            supabase
                .from("deck_structures")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id),

            // Step 5: Gamma Decks
            supabase
                .from("gamma_decks")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id),

            // Step 6: Videos
            supabase
                .from("pitch_videos")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id),

            // Step 7: Enrollment Pages
            supabase
                .from("enrollment_pages")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id),

            // Step 8: Watch Pages
            supabase
                .from("watch_pages")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id),

            // Step 9: Registration Pages
            supabase
                .from("registration_pages")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id),

            // Step 10: Funnel Flows
            supabase
                .from("funnel_flows")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id),

            // Step 11: AI Follow-up Configs
            supabase
                .from("followup_agent_configs")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id),

            // Step 12: Marketing Content Briefs
            supabase
                .from("marketing_content_briefs")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id)
                .eq("campaign_type", "organic"),

            // Step 13: Ad Campaigns
            supabase
                .from("marketing_content_briefs")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id)
                .eq("campaign_type", "paid_ad"),
        ]);

        // Step 1 is completed if we have transcripts OR a business profile with completion > 0
        const hasTranscripts = (transcripts.count ?? 0) > 0;
        const hasBusinessProfile = Boolean(
            businessProfiles.data &&
                (businessProfiles.data.completion_status as any)?.overall > 0
        );
        const step1Completed = hasTranscripts || hasBusinessProfile;

        const completionStatus: StepCompletion[] = [
            {
                step: 1,
                isCompleted: step1Completed,
                hasContent: step1Completed,
            },
            {
                step: 2,
                isCompleted: (offers.count ?? 0) > 0,
                hasContent: (offers.count ?? 0) > 0,
            },
            {
                step: 3,
                isCompleted: (brandDesigns.count ?? 0) > 0,
                hasContent: (brandDesigns.count ?? 0) > 0,
            },
            {
                step: 4,
                isCompleted: (deckStructures.count ?? 0) > 0,
                hasContent: (deckStructures.count ?? 0) > 0,
            },
            {
                step: 5,
                isCompleted: (gammaDecks.count ?? 0) > 0,
                hasContent: (gammaDecks.count ?? 0) > 0,
            },
            {
                step: 6,
                isCompleted: (videos.count ?? 0) > 0,
                hasContent: (videos.count ?? 0) > 0,
            },
            {
                step: 7,
                isCompleted: (enrollmentPages.count ?? 0) > 0,
                hasContent: (enrollmentPages.count ?? 0) > 0,
            },
            {
                step: 8,
                isCompleted: (watchPages.count ?? 0) > 0,
                hasContent: (watchPages.count ?? 0) > 0,
            },
            {
                step: 9,
                isCompleted: (registrationPages.count ?? 0) > 0,
                hasContent: (registrationPages.count ?? 0) > 0,
            },
            {
                step: 10,
                isCompleted: (flows.count ?? 0) > 0,
                hasContent: (flows.count ?? 0) > 0,
            },
            {
                step: 11,
                isCompleted: (followupConfigs.count ?? 0) > 0,
                hasContent: (followupConfigs.count ?? 0) > 0,
            },
            {
                step: 12,
                isCompleted: (marketingBriefs.count ?? 0) > 0,
                hasContent: (marketingBriefs.count ?? 0) > 0,
            },
            {
                step: 13,
                isCompleted: (adCampaigns.count ?? 0) > 0,
                hasContent: (adCampaigns.count ?? 0) > 0,
            },
        ];

        const completedCount = completionStatus.filter((s) => s.isCompleted).length;
        requestLogger.info(
            { completedSteps: completedCount, totalSteps: 13 },
            "Step completion status retrieved"
        );

        return completionStatus;
    } catch (error) {
        requestLogger.error({ error }, "Failed to check step completion");
        // Return empty completion status on error
        return Array.from({ length: 13 }, (_, i) => ({
            step: i + 1,
            isCompleted: false,
            hasContent: false,
        }));
    }
}

/**
 * Get master step completion status
 * Returns completion data for all 5 master steps
 */
export async function getMasterStepCompletionStatus(
    projectId: string
): Promise<MasterStepProgress> {
    const requestLogger = logger.child({
        handler: "get-master-step-completion",
        projectId,
    });

    try {
        // Get individual step completion status
        const stepCompletions = await getStepCompletionStatus(projectId);
        const completedSteps = stepCompletions
            .filter((s) => s.isCompleted)
            .map((s) => s.step);

        // Calculate master step completions
        const masterStepCompletions: MasterStepCompletion[] = MASTER_STEPS.map(
            (masterStep) => {
                const completion = calculateMasterStepCompletion(
                    masterStep,
                    completedSteps
                );
                return {
                    masterStepId: masterStep.id,
                    ...completion,
                };
            }
        );

        // Calculate overall progress
        const overall = calculateOverallCompletion(completedSteps);

        requestLogger.info(
            {
                completedMasterSteps: overall.completedMasterSteps,
                totalMasterSteps: overall.totalMasterSteps,
                percentage: overall.percentage,
            },
            "Master step completion calculated"
        );

        return {
            ...overall,
            masterStepCompletions,
        };
    } catch (error) {
        requestLogger.error({ error }, "Failed to get master step completion");
        // Return empty status on error
        return {
            completedMasterSteps: 0,
            totalMasterSteps: 5,
            percentage: 0,
            masterStepCompletions: MASTER_STEPS.map((master) => ({
                masterStepId: master.id,
                isFullyComplete: false,
                isPartiallyComplete: false,
                completedCount: 0,
                totalCount: master.subSteps.length,
                percentage: 0,
            })),
        };
    }
}
