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
    TOTAL_FUNNEL_STEPS,
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
 * Check completion status for all 17 steps
 * Returns which steps have actual generated content
 *
 * Step mapping:
 * 1-3: Business Profile (Intake, Funnel Map, Brand Design)
 * 4-6: Presentation Materials (Structure, Create, Upload Video)
 * 7-14: Funnel Pages (Registration, Confirmation, Watch, Enrollment, Call Booking, Checkout, Upsell, Thank You)
 * 15-17: Traffic Agents (AI Follow-Up, Content Engine, Ads Manager)
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
            return Array.from({ length: TOTAL_FUNNEL_STEPS }, (_, i) => ({
                step: i + 1,
                isCompleted: false,
                hasContent: false,
            }));
        }

        requestLogger.info({ userId: user.id }, "Checking step completion status");

        // Check all steps in parallel
        const [
            // Steps 1-6: Core setup
            transcripts,
            businessProfiles,
            funnelMapConfig,
            brandDesigns,
            deckStructures,
            gammaDecks,
            videos,
            // Steps 7-14: Funnel Pages (legacy tables)
            registrationPagesLegacy,
            confirmationPagesLegacy,
            watchPagesLegacy,
            enrollmentPagesLegacy,
            callBookingPagesLegacy,
            checkoutPagesLegacy,
            upsellPagesLegacy,
            thankYouPagesLegacy,
            // Steps 7-14: Funnel Pages (AI Editor v2)
            aiEditorPages,
            // Steps 15-17: Traffic Agents
            followupConfigs,
            marketingBriefsOrganic,
            marketingBriefsPaid,
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

            // Step 2: Funnel Map Config (Visual Funnel Co-Creation)
            supabase
                .from("funnel_map_config")
                .select("id, is_step2_complete, drafts_generated")
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id)
                .maybeSingle(),

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

            // Step 7: Registration Pages (legacy)
            supabase
                .from("registration_pages")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id),

            // Step 8: Confirmation Pages (legacy) - may not exist yet
            supabase
                .from("confirmation_pages")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id),

            // Step 9: Watch Pages (legacy)
            supabase
                .from("watch_pages")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id),

            // Step 10: Enrollment Pages (legacy)
            supabase
                .from("enrollment_pages")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id),

            // Step 11: Call Booking Pages (legacy) - may not exist yet
            supabase
                .from("call_booking_pages")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id),

            // Step 12: Checkout Pages (legacy) - may not exist yet
            supabase
                .from("checkout_pages")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id),

            // Step 13: Upsell Pages (legacy) - may not exist yet
            supabase
                .from("upsell_pages")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id),

            // Step 14: Thank You Pages (legacy) - may not exist yet
            supabase
                .from("thank_you_pages")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id),

            // AI Editor v2 pages (all types)
            supabase
                .from("ai_editor_pages")
                .select("id, page_type")
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id),

            // Step 15: AI Follow-up Configs
            supabase
                .from("followup_agent_configs")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id),

            // Step 16: Marketing Content Engine (Organic content)
            supabase
                .from("marketing_content_briefs")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id)
                .eq("campaign_type", "organic"),

            // Step 17: Ads Manager (Paid content)
            supabase
                .from("marketing_content_briefs")
                .select("id", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id)
                .in("campaign_type", ["paid", "ads"]),
        ]);

        // Count AI Editor pages by type
        const aiEditorPageTypes = aiEditorPages.data || [];
        const countAiEditorByType = (type: string) =>
            aiEditorPageTypes.filter((p) => p.page_type === type).length;

        // Step 1 is completed if we have transcripts OR a business profile with completion > 0
        const hasTranscripts = (transcripts.count ?? 0) > 0;
        const hasBusinessProfile = Boolean(
            businessProfiles.data &&
                (businessProfiles.data.completion_status as any)?.overall > 0
        );
        const step1Completed = hasTranscripts || hasBusinessProfile;

        // Step 2 is completed if funnel map drafts have been generated
        const step2Completed = Boolean(
            funnelMapConfig.data?.drafts_generated ||
                funnelMapConfig.data?.is_step2_complete
        );

        // Helper to check if step has content (legacy OR AI Editor)
        const hasPageContent = (legacyCount: number | null, pageType: string) => {
            const legacy = legacyCount ?? 0;
            const aiEditor = countAiEditorByType(pageType);
            return legacy > 0 || aiEditor > 0;
        };

        const completionStatus: StepCompletion[] = [
            // Master Step 1: Business Profile (Steps 1-3)
            {
                step: 1,
                isCompleted: step1Completed,
                hasContent: step1Completed,
            },
            {
                step: 2,
                isCompleted: step2Completed,
                hasContent: step2Completed,
            },
            {
                step: 3,
                isCompleted: (brandDesigns.count ?? 0) > 0,
                hasContent: (brandDesigns.count ?? 0) > 0,
            },
            // Master Step 2: Presentation Materials (Steps 4-6)
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
            // Master Step 3: Funnel Pages (Steps 7-14)
            {
                step: 7,
                isCompleted: hasPageContent(registrationPagesLegacy.count, "registration"),
                hasContent: hasPageContent(registrationPagesLegacy.count, "registration"),
            },
            {
                step: 8,
                isCompleted: hasPageContent(confirmationPagesLegacy.count, "confirmation"),
                hasContent: hasPageContent(confirmationPagesLegacy.count, "confirmation"),
            },
            {
                step: 9,
                isCompleted: hasPageContent(watchPagesLegacy.count, "watch"),
                hasContent: hasPageContent(watchPagesLegacy.count, "watch"),
            },
            {
                step: 10,
                isCompleted: hasPageContent(enrollmentPagesLegacy.count, "enrollment"),
                hasContent: hasPageContent(enrollmentPagesLegacy.count, "enrollment"),
            },
            {
                step: 11,
                isCompleted: hasPageContent(callBookingPagesLegacy.count, "call_booking"),
                hasContent: hasPageContent(callBookingPagesLegacy.count, "call_booking"),
            },
            {
                step: 12,
                isCompleted: hasPageContent(checkoutPagesLegacy.count, "checkout"),
                hasContent: hasPageContent(checkoutPagesLegacy.count, "checkout"),
            },
            {
                step: 13,
                isCompleted: hasPageContent(upsellPagesLegacy.count, "upsell"),
                hasContent: hasPageContent(upsellPagesLegacy.count, "upsell"),
            },
            {
                step: 14,
                isCompleted: hasPageContent(thankYouPagesLegacy.count, "thank_you"),
                hasContent: hasPageContent(thankYouPagesLegacy.count, "thank_you"),
            },
            // Master Step 4: Traffic Agents (Steps 15-17)
            {
                step: 15,
                isCompleted: (followupConfigs.count ?? 0) > 0,
                hasContent: (followupConfigs.count ?? 0) > 0,
            },
            {
                step: 16,
                isCompleted: (marketingBriefsOrganic.count ?? 0) > 0,
                hasContent: (marketingBriefsOrganic.count ?? 0) > 0,
            },
            {
                step: 17,
                isCompleted: (marketingBriefsPaid.count ?? 0) > 0,
                hasContent: (marketingBriefsPaid.count ?? 0) > 0,
            },
        ];

        const completedCount = completionStatus.filter((s) => s.isCompleted).length;
        requestLogger.info(
            { completedSteps: completedCount, totalSteps: TOTAL_FUNNEL_STEPS },
            "Step completion status retrieved"
        );

        return completionStatus;
    } catch (error) {
        requestLogger.error({ error }, "Failed to check step completion");
        // Return empty completion status on error
        return Array.from({ length: TOTAL_FUNNEL_STEPS }, (_, i) => ({
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
