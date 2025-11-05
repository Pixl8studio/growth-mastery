/**
 * Funnel Builder Server Actions
 * Centralized server actions for all funnel operations
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { ValidationError } from "@/lib/errors";

/**
 * Update project's current step
 */
export async function updateProjectStep(projectId: string, step: number) {
    const requestLogger = logger.child({
        handler: "update-project-step",
        projectId,
        step,
    });

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new ValidationError("Not authenticated");
        }

        requestLogger.info({ userId: user.id }, "Updating project step");

        const { error } = await supabase
            .from("funnel_projects")
            .update({ current_step: step })
            .eq("id", projectId)
            .eq("user_id", user.id);

        if (error) {
            throw error;
        }

        requestLogger.info("Project step updated");

        revalidatePath(`/funnel-builder/${projectId}`);

        return { success: true };
    } catch (error) {
        requestLogger.error({ error }, "Failed to update project step");
        throw error;
    }
}

/**
 * Publish funnel (make all pages public)
 */
export async function publishFunnel(projectId: string) {
    const requestLogger = logger.child({ handler: "publish-funnel", projectId });

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new ValidationError("Not authenticated");
        }

        requestLogger.info({ userId: user.id }, "Publishing funnel");

        // Update project status
        const { error: projectError } = await supabase
            .from("funnel_projects")
            .update({ status: "active" })
            .eq("id", projectId)
            .eq("user_id", user.id);

        if (projectError) {
            throw projectError;
        }

        // Publish all pages
        await Promise.all([
            supabase
                .from("registration_pages")
                .update({ is_published: true })
                .eq("funnel_project_id", projectId),
            supabase
                .from("watch_pages")
                .update({ is_published: true })
                .eq("funnel_project_id", projectId),
            supabase
                .from("enrollment_pages")
                .update({ is_published: true })
                .eq("funnel_project_id", projectId),
        ]);

        requestLogger.info("Funnel published successfully");

        revalidatePath(`/funnel-builder/${projectId}`);

        return { success: true };
    } catch (error) {
        requestLogger.error({ error }, "Failed to publish funnel");
        throw error;
    }
}

/**
 * Unpublish funnel (hide all pages)
 */
export async function unpublishFunnel(projectId: string) {
    const requestLogger = logger.child({ handler: "unpublish-funnel", projectId });

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new ValidationError("Not authenticated");
        }

        requestLogger.info({ userId: user.id }, "Unpublishing funnel");

        // Update project status
        const { error: projectError } = await supabase
            .from("funnel_projects")
            .update({ status: "draft" })
            .eq("id", projectId)
            .eq("user_id", user.id);

        if (projectError) {
            throw projectError;
        }

        // Unpublish all pages
        await Promise.all([
            supabase
                .from("registration_pages")
                .update({ is_published: false })
                .eq("funnel_project_id", projectId),
            supabase
                .from("watch_pages")
                .update({ is_published: false })
                .eq("funnel_project_id", projectId),
            supabase
                .from("enrollment_pages")
                .update({ is_published: false })
                .eq("funnel_project_id", projectId),
        ]);

        requestLogger.info("Funnel unpublished successfully");

        revalidatePath(`/funnel-builder/${projectId}`);

        return { success: true };
    } catch (error) {
        requestLogger.error({ error }, "Failed to unpublish funnel");
        throw error;
    }
}

/**
 * Update page vanity slug
 */
export async function updatePageSlug(
    pageType: "registration" | "watch" | "enrollment",
    pageId: string,
    slug: string
) {
    const requestLogger = logger.child({
        handler: "update-page-slug",
        pageType,
        pageId,
    });

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new ValidationError("Not authenticated");
        }

        requestLogger.info({ userId: user.id, slug }, "Updating page slug");

        const tableName = `${pageType}_pages`;

        // Check if slug is already taken by this user
        const { data: existing } = await supabase
            .from(tableName)
            .select("id")
            .eq("user_id", user.id)
            .eq("vanity_slug", slug)
            .neq("id", pageId)
            .single();

        if (existing) {
            throw new ValidationError("Slug already in use");
        }

        // Update slug
        const { error } = await supabase
            .from(tableName)
            .update({ vanity_slug: slug })
            .eq("id", pageId)
            .eq("user_id", user.id);

        if (error) {
            throw error;
        }

        requestLogger.info("Page slug updated successfully");

        return { success: true };
    } catch (error) {
        requestLogger.error({ error }, "Failed to update page slug");
        throw error;
    }
}

/**
 * Get funnel analytics
 */
export async function getFunnelAnalytics(projectId: string) {
    const requestLogger = logger.child({ handler: "get-funnel-analytics", projectId });

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new ValidationError("Not authenticated");
        }

        requestLogger.info({ userId: user.id }, "Fetching funnel analytics");

        // Get all contacts for this funnel
        const { data: contacts } = await supabase
            .from("contacts")
            .select("*")
            .eq("funnel_project_id", projectId);

        const totalContacts = contacts?.length || 0;
        const watchedCount =
            contacts?.filter((c) => c.current_stage !== "registered").length || 0;
        const enrolledCount =
            contacts?.filter((c) => ["enrolled", "purchased"].includes(c.current_stage))
                .length || 0;
        const purchasedCount =
            contacts?.filter((c) => c.current_stage === "purchased").length || 0;

        // Calculate video completion rate
        const videoCompletionRate =
            watchedCount > 0
                ? Math.round(
                      (contacts!.filter((c) => (c.video_watch_percentage || 0) >= 75)
                          .length /
                          watchedCount) *
                          100
                  )
                : 0;

        requestLogger.info({ projectId, totalContacts }, "Analytics fetched");

        return {
            success: true,
            analytics: {
                registrations: totalContacts,
                videoViews: watchedCount,
                videoCompletionRate,
                enrollmentViews: enrolledCount,
                conversions: purchasedCount,
                conversionRate:
                    totalContacts > 0 ? (purchasedCount / totalContacts) * 100 : 0,
            },
        };
    } catch (error) {
        requestLogger.error({ error }, "Failed to fetch analytics");
        throw error;
    }
}
