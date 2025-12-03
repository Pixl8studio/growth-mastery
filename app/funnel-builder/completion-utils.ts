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
 * Returns true if at least one intake session exists
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

        const { count } = await supabase
            .from("vapi_transcripts")
            .select("id", { count: "exact", head: true })
            .eq("funnel_project_id", projectId)
            .eq("user_id", user.id);

        const hasIntake = (count ?? 0) > 0;
        requestLogger.info({ hasIntake }, "Intake completion checked");

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
            return Array.from({ length: 14 }, (_, i) => ({
                step: i + 1,
                isCompleted: false,
                hasContent: false,
            }));
        }

        requestLogger.info({ userId: user.id }, "Checking step completion status");

        // Check all steps in parallel
        const [
            transcripts,
            offers,
            brandDesigns,
            deckStructures,
            gammaDecks,
            enrollmentPages,
            talkTracks,
            videos,
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

            // Step 6: Enrollment Pages
            supabase
                .from("enrollment_pages")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id),

            // Step 7: Talk Tracks
            supabase
                .from("talk_tracks")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id),

            // Step 8: Videos
            supabase
                .from("pitch_videos")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id),

            // Step 9: Watch Pages
            supabase
                .from("watch_pages")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id),

            // Step 10: Registration Pages
            supabase
                .from("registration_pages")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id),

            // Step 11: Funnel Flows
            supabase
                .from("funnel_flows")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id),

            // Step 12: AI Follow-up Configs
            supabase
                .from("followup_agent_configs")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id),

            // Step 13: Marketing Content Briefs
            supabase
                .from("marketing_content_briefs")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id)
                .eq("campaign_type", "organic"),

            // Step 14: Ad Campaigns
            supabase
                .from("marketing_content_briefs")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id)
                .eq("campaign_type", "paid_ad"),
        ]);

        const completionStatus: StepCompletion[] = [
            {
                step: 1,
                isCompleted: (transcripts.count ?? 0) > 0,
                hasContent: (transcripts.count ?? 0) > 0,
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
                isCompleted: (enrollmentPages.count ?? 0) > 0,
                hasContent: (enrollmentPages.count ?? 0) > 0,
            },
            {
                step: 7,
                isCompleted: (talkTracks.count ?? 0) > 0,
                hasContent: (talkTracks.count ?? 0) > 0,
            },
            {
                step: 8,
                isCompleted: (videos.count ?? 0) > 0,
                hasContent: (videos.count ?? 0) > 0,
            },
            {
                step: 9,
                isCompleted: (watchPages.count ?? 0) > 0,
                hasContent: (watchPages.count ?? 0) > 0,
            },
            {
                step: 10,
                isCompleted: (registrationPages.count ?? 0) > 0,
                hasContent: (registrationPages.count ?? 0) > 0,
            },
            {
                step: 11,
                isCompleted: (flows.count ?? 0) > 0,
                hasContent: (flows.count ?? 0) > 0,
            },
            {
                step: 12,
                isCompleted: (followupConfigs.count ?? 0) > 0,
                hasContent: (followupConfigs.count ?? 0) > 0,
            },
            {
                step: 13,
                isCompleted: (marketingBriefs.count ?? 0) > 0,
                hasContent: (marketingBriefs.count ?? 0) > 0,
            },
            {
                step: 14,
                isCompleted: (adCampaigns.count ?? 0) > 0,
                hasContent: (adCampaigns.count ?? 0) > 0,
            },
        ];

        const completedCount = completionStatus.filter((s) => s.isCompleted).length;
        requestLogger.info(
            { completedSteps: completedCount, totalSteps: 14 },
            "Step completion status retrieved"
        );

        return completionStatus;
    } catch (error) {
        requestLogger.error({ error }, "Failed to check step completion");
        // Return empty completion status on error
        return Array.from({ length: 14 }, (_, i) => ({
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
