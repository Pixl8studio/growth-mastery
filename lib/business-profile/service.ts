/**
 * Business Profile Service
 * Manages CRUD operations for business profiles
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type {
    BusinessProfile,
    BusinessProfileInsert,
    BusinessProfileUpdate,
    SectionId,
    CompletionStatus,
    SectionData,
} from "@/types/business-profile";
import { SECTION_DEFINITIONS } from "@/types/business-profile";

/**
 * Get or create a business profile for a funnel project
 */
export async function getOrCreateProfile(
    userId: string,
    funnelProjectId: string
): Promise<{ success: boolean; profile?: BusinessProfile; error?: string }> {
    try {
        const supabase = await createClient();

        // Try to get existing profile
        const { data: existingProfile, error: fetchError } = await supabase
            .from("business_profiles")
            .select("*")
            .eq("funnel_project_id", funnelProjectId)
            .single();

        if (existingProfile) {
            logger.info(
                { profileId: existingProfile.id, funnelProjectId },
                "Found existing business profile"
            );
            return { success: true, profile: existingProfile as BusinessProfile };
        }

        // Create new profile if not found
        if (fetchError && fetchError.code === "PGRST116") {
            const { data: newProfile, error: insertError } = await supabase
                .from("business_profiles")
                .insert({
                    user_id: userId,
                    funnel_project_id: funnelProjectId,
                    source: "wizard",
                })
                .select()
                .single();

            if (insertError) {
                logger.error(
                    { error: insertError, funnelProjectId },
                    "Failed to create business profile"
                );
                return { success: false, error: insertError.message };
            }

            logger.info(
                { profileId: newProfile.id, funnelProjectId },
                "Created new business profile"
            );
            return { success: true, profile: newProfile as BusinessProfile };
        }

        if (fetchError) {
            throw fetchError;
        }

        return { success: false, error: "Unexpected state" };
    } catch (error) {
        logger.error({ error, funnelProjectId }, "Error in getOrCreateProfile");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Get a business profile by ID
 */
export async function getProfile(
    profileId: string
): Promise<{ success: boolean; profile?: BusinessProfile; error?: string }> {
    try {
        const supabase = await createClient();

        const { data: profile, error } = await supabase
            .from("business_profiles")
            .select("*")
            .eq("id", profileId)
            .single();

        if (error) {
            logger.error({ error, profileId }, "Failed to get business profile");
            return { success: false, error: error.message };
        }

        return { success: true, profile: profile as BusinessProfile };
    } catch (error) {
        logger.error({ error, profileId }, "Error in getProfile");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Get a business profile by funnel project ID
 */
export async function getProfileByProject(
    funnelProjectId: string
): Promise<{ success: boolean; profile?: BusinessProfile; error?: string }> {
    try {
        const supabase = await createClient();

        const { data: profile, error } = await supabase
            .from("business_profiles")
            .select("*")
            .eq("funnel_project_id", funnelProjectId)
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return { success: true, profile: undefined };
            }
            logger.error(
                { error, funnelProjectId },
                "Failed to get business profile by project"
            );
            return { success: false, error: error.message };
        }

        return { success: true, profile: profile as BusinessProfile };
    } catch (error) {
        logger.error({ error, funnelProjectId }, "Error in getProfileByProject");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Update a business profile
 */
export async function updateProfile(
    profileId: string,
    updates: BusinessProfileUpdate
): Promise<{ success: boolean; profile?: BusinessProfile; error?: string }> {
    try {
        const supabase = await createClient();

        const { data: profile, error } = await supabase
            .from("business_profiles")
            .update(updates)
            .eq("id", profileId)
            .select()
            .single();

        if (error) {
            logger.error({ error, profileId }, "Failed to update business profile");
            return { success: false, error: error.message };
        }

        logger.info({ profileId }, "Updated business profile");
        return { success: true, profile: profile as BusinessProfile };
    } catch (error) {
        logger.error({ error, profileId }, "Error in updateProfile");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Update a specific section of the business profile
 */
export async function updateSection(
    profileId: string,
    sectionId: SectionId,
    sectionData: SectionData,
    aiGeneratedFields?: string[]
): Promise<{ success: boolean; profile?: BusinessProfile; error?: string }> {
    try {
        const supabase = await createClient();

        // Get current profile to merge AI generated fields
        const { data: currentProfile } = await supabase
            .from("business_profiles")
            .select("ai_generated_fields, completion_status")
            .eq("id", profileId)
            .single();

        // Merge AI generated fields
        let updatedAiFields = currentProfile?.ai_generated_fields || [];
        if (aiGeneratedFields && aiGeneratedFields.length > 0) {
            updatedAiFields = [...new Set([...updatedAiFields, ...aiGeneratedFields])];
        }

        // Calculate new completion status
        const newCompletionStatus = calculateSectionCompletion(
            sectionId,
            sectionData,
            currentProfile?.completion_status || {}
        );

        const { data: profile, error } = await supabase
            .from("business_profiles")
            .update({
                ...sectionData,
                ai_generated_fields: updatedAiFields,
                completion_status: newCompletionStatus,
            })
            .eq("id", profileId)
            .select()
            .single();

        if (error) {
            logger.error({ error, profileId, sectionId }, "Failed to update section");
            return { success: false, error: error.message };
        }

        logger.info({ profileId, sectionId }, "Updated business profile section");
        return { success: true, profile: profile as BusinessProfile };
    } catch (error) {
        logger.error({ error, profileId, sectionId }, "Error in updateSection");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Calculate completion percentage for a section
 */
function calculateSectionCompletion(
    sectionId: SectionId,
    sectionData: SectionData,
    currentStatus: Partial<CompletionStatus>
): CompletionStatus {
    const sectionDef = SECTION_DEFINITIONS[sectionId];
    const fields = sectionDef.fields;

    let filledCount = 0;
    let totalCount = 0;

    for (const field of fields) {
        totalCount++;
        const value = (sectionData as Record<string, unknown>)[field.key];

        if (field.type === "belief_shift" || field.type === "objections") {
            // Complex types - check if they have content
            if (value && typeof value === "object") {
                const hasContent = Object.values(value).some(
                    (v) =>
                        v !== null &&
                        v !== undefined &&
                        v !== "" &&
                        (!Array.isArray(v) || v.length > 0)
                );
                if (hasContent) filledCount++;
            }
        } else if (field.type === "array") {
            if (Array.isArray(value) && value.length > 0) filledCount++;
        } else if (field.type === "pricing") {
            if (value && typeof value === "object") {
                const pricing = value as { regular?: number; webinar?: number };
                if (pricing.regular !== null || pricing.webinar !== null) filledCount++;
            }
        } else {
            if (value && typeof value === "string" && value.trim() !== "")
                filledCount++;
        }
    }

    const sectionCompletion =
        totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;

    const newStatus: CompletionStatus = {
        section1: currentStatus.section1 || 0,
        section2: currentStatus.section2 || 0,
        section3: currentStatus.section3 || 0,
        section4: currentStatus.section4 || 0,
        section5: currentStatus.section5 || 0,
        overall: 0,
    };

    // Update the specific section
    newStatus[sectionId] = sectionCompletion;

    // Calculate overall completion
    newStatus.overall = Math.round(
        (newStatus.section1 +
            newStatus.section2 +
            newStatus.section3 +
            newStatus.section4 +
            newStatus.section5) /
            5
    );

    return newStatus;
}

/**
 * Delete a business profile
 */
export async function deleteProfile(
    profileId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from("business_profiles")
            .delete()
            .eq("id", profileId);

        if (error) {
            logger.error({ error, profileId }, "Failed to delete business profile");
            return { success: false, error: error.message };
        }

        logger.info({ profileId }, "Deleted business profile");
        return { success: true };
    } catch (error) {
        logger.error({ error, profileId }, "Error in deleteProfile");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Get all business profiles for a user
 */
export async function getUserProfiles(
    userId: string
): Promise<{ success: boolean; profiles?: BusinessProfile[]; error?: string }> {
    try {
        const supabase = await createClient();

        const { data: profiles, error } = await supabase
            .from("business_profiles")
            .select("*")
            .eq("user_id", userId)
            .order("updated_at", { ascending: false });

        if (error) {
            logger.error({ error, userId }, "Failed to get user profiles");
            return { success: false, error: error.message };
        }

        return { success: true, profiles: profiles as BusinessProfile[] };
    } catch (error) {
        logger.error({ error, userId }, "Error in getUserProfiles");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Populate business profile from intake data (voice call or other methods)
 */
export async function populateFromIntake(
    profileId: string,
    intakeData: {
        transcriptText?: string;
        extractedData?: Record<string, unknown>;
    },
    source: "voice" | "import" = "voice"
): Promise<{ success: boolean; profile?: BusinessProfile; error?: string }> {
    try {
        const supabase = await createClient();

        // Extract relevant fields from intake data
        const extracted = intakeData.extractedData || {};

        const updates: BusinessProfileUpdate = {
            source,
            // Map extracted fields to business profile fields
            ideal_customer: (extracted.targetAudience as string) || null,
            transformation: (extracted.desiredOutcome as string) || null,
            perceived_problem: (extracted.mainProblem as string) || null,
            offer_name: (extracted.offerName as string) || null,
            // Store the full transcript as context for section 1
            section1_context: intakeData.transcriptText || null,
        };

        const { data: profile, error } = await supabase
            .from("business_profiles")
            .update(updates)
            .eq("id", profileId)
            .select()
            .single();

        if (error) {
            logger.error({ error, profileId }, "Failed to populate from intake");
            return { success: false, error: error.message };
        }

        logger.info({ profileId, source }, "Populated business profile from intake");
        return { success: true, profile: profile as BusinessProfile };
    } catch (error) {
        logger.error({ error, profileId }, "Error in populateFromIntake");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
