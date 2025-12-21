/**
 * Funnel Builder Server Actions
 * Centralized server actions for all funnel operations
 */

"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { ValidationError } from "@/lib/errors";
import { generateSlug } from "@/lib/utils";

/**
 * Trash retention period in days before funnels are eligible for permanent deletion.
 * TODO: Implement automated cleanup via cron job or Supabase scheduled function
 */
export const TRASH_RETENTION_DAYS = 30;

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

/**
 * Rename a funnel project
 * Updates both name and slug (with warning that URLs will change)
 */
export async function renameFunnel(projectId: string, newName: string) {
    const requestLogger = logger.child({
        handler: "rename-funnel",
        projectId,
    });

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new ValidationError("Not authenticated");
        }

        const trimmedName = newName.trim();

        if (!trimmedName) {
            throw new ValidationError("Funnel name cannot be empty");
        }

        requestLogger.info({ userId: user.id, newName: trimmedName }, "Renaming funnel");

        // Check for duplicate name (same user, different project, not deleted)
        // Using maybeSingle() to avoid throwing on multiple matches (race condition safety)
        const { data: existing } = await supabase
            .from("funnel_projects")
            .select("id")
            .eq("user_id", user.id)
            .eq("name", trimmedName)
            .is("deleted_at", null)
            .neq("id", projectId)
            .maybeSingle();

        if (existing) {
            throw new ValidationError(
                `You already have a funnel named "${trimmedName}"`
            );
        }

        // Generate new slug from name
        const newSlug = generateSlug(trimmedName);

        // Update funnel name and slug
        const { error } = await supabase
            .from("funnel_projects")
            .update({
                name: trimmedName,
                slug: newSlug,
                updated_at: new Date().toISOString(),
            })
            .eq("id", projectId)
            .eq("user_id", user.id);

        if (error) {
            throw error;
        }

        requestLogger.info({ newSlug }, "Funnel renamed successfully");

        revalidatePath("/funnel-builder");
        revalidatePath(`/funnel-builder/${projectId}`);

        return { success: true, newSlug };
    } catch (error) {
        requestLogger.error({ error }, "Failed to rename funnel");
        Sentry.captureException(error, {
            tags: { action: "rename-funnel" },
            extra: { projectId, newName },
        });
        throw error;
    }
}

/**
 * Soft delete a funnel (move to trash)
 * Sets deleted_at timestamp for recovery period (see TRASH_RETENTION_DAYS)
 */
export async function softDeleteFunnel(projectId: string) {
    const requestLogger = logger.child({
        handler: "soft-delete-funnel",
        projectId,
    });

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new ValidationError("Not authenticated");
        }

        requestLogger.info({ userId: user.id }, "Soft deleting funnel");

        // Get current funnel status
        const { data: funnel } = await supabase
            .from("funnel_projects")
            .select("status")
            .eq("id", projectId)
            .eq("user_id", user.id)
            .single();

        if (!funnel) {
            throw new ValidationError("Funnel not found");
        }

        // If funnel is published, unpublish all pages first
        if (funnel.status === "active") {
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
        }

        // Set deleted_at timestamp
        const { error } = await supabase
            .from("funnel_projects")
            .update({
                deleted_at: new Date().toISOString(),
                status: "draft", // Reset to draft
                updated_at: new Date().toISOString(),
            })
            .eq("id", projectId)
            .eq("user_id", user.id);

        if (error) {
            throw error;
        }

        requestLogger.info("Funnel soft deleted successfully");

        revalidatePath("/funnel-builder");
        revalidatePath("/settings/trash");

        return { success: true };
    } catch (error) {
        requestLogger.error({ error }, "Failed to soft delete funnel");
        Sentry.captureException(error, {
            tags: { action: "soft-delete-funnel" },
            extra: { projectId },
        });
        throw error;
    }
}

/**
 * Restore a soft-deleted funnel from trash
 * Checks for slug collision and auto-appends timestamp if needed
 */
export async function restoreFunnel(projectId: string) {
    const requestLogger = logger.child({
        handler: "restore-funnel",
        projectId,
    });

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new ValidationError("Not authenticated");
        }

        requestLogger.info({ userId: user.id }, "Restoring funnel from trash");

        // Get the funnel being restored to check for slug collision
        const { data: funnelToRestore } = await supabase
            .from("funnel_projects")
            .select("name, slug")
            .eq("id", projectId)
            .eq("user_id", user.id)
            .single();

        if (!funnelToRestore) {
            throw new ValidationError("Funnel not found in trash");
        }

        // Check if an active funnel now exists with the same slug
        const { data: existingFunnel } = await supabase
            .from("funnel_projects")
            .select("id")
            .eq("user_id", user.id)
            .eq("slug", funnelToRestore.slug)
            .is("deleted_at", null)
            .neq("id", projectId)
            .maybeSingle();

        // If slug collision, append timestamp to make unique
        let finalSlug = funnelToRestore.slug;
        if (existingFunnel) {
            const timestamp = Date.now();
            finalSlug = `${funnelToRestore.slug}-${timestamp}`;
            requestLogger.info(
                { originalSlug: funnelToRestore.slug, newSlug: finalSlug },
                "Slug collision detected, appending timestamp"
            );
        }

        // Clear deleted_at to restore (with potentially updated slug)
        const { error } = await supabase
            .from("funnel_projects")
            .update({
                deleted_at: null,
                slug: finalSlug,
                updated_at: new Date().toISOString(),
            })
            .eq("id", projectId)
            .eq("user_id", user.id);

        if (error) {
            throw error;
        }

        requestLogger.info("Funnel restored successfully");

        revalidatePath("/funnel-builder");
        revalidatePath("/settings/trash");

        return { success: true, slugChanged: finalSlug !== funnelToRestore.slug };
    } catch (error) {
        requestLogger.error({ error }, "Failed to restore funnel");
        Sentry.captureException(error, {
            tags: { action: "restore-funnel" },
            extra: { projectId },
        });
        throw error;
    }
}

/**
 * Permanently delete a funnel
 * Only works for funnels that are already in trash (deleted_at is set)
 */
export async function permanentlyDeleteFunnel(projectId: string) {
    const requestLogger = logger.child({
        handler: "permanently-delete-funnel",
        projectId,
    });

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new ValidationError("Not authenticated");
        }

        requestLogger.info({ userId: user.id }, "Permanently deleting funnel");

        // Verify funnel is in trash (deleted_at is set)
        const { data: funnel } = await supabase
            .from("funnel_projects")
            .select("deleted_at")
            .eq("id", projectId)
            .eq("user_id", user.id)
            .single();

        if (!funnel) {
            throw new ValidationError("Funnel not found");
        }

        if (!funnel.deleted_at) {
            throw new ValidationError(
                "Funnel must be in trash before permanent deletion"
            );
        }

        // Hard delete - cascade will handle related data
        const { error } = await supabase
            .from("funnel_projects")
            .delete()
            .eq("id", projectId)
            .eq("user_id", user.id);

        if (error) {
            throw error;
        }

        requestLogger.info("Funnel permanently deleted");

        revalidatePath("/settings/trash");

        return { success: true };
    } catch (error) {
        requestLogger.error({ error }, "Failed to permanently delete funnel");
        Sentry.captureException(error, {
            tags: { action: "permanently-delete-funnel" },
            extra: { projectId },
        });
        throw error;
    }
}

/**
 * Get soft-deleted funnels (trash)
 */
export async function getDeletedFunnels() {
    const requestLogger = logger.child({ handler: "get-deleted-funnels" });

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new ValidationError("Not authenticated");
        }

        requestLogger.info({ userId: user.id }, "Fetching deleted funnels");

        const { data: funnels, error } = await supabase
            .from("funnel_projects")
            .select("id, name, deleted_at, updated_at")
            .eq("user_id", user.id)
            .not("deleted_at", "is", null)
            .order("deleted_at", { ascending: false });

        if (error) {
            throw error;
        }

        requestLogger.info({ count: funnels?.length }, "Deleted funnels fetched");

        return { success: true, funnels: funnels || [] };
    } catch (error) {
        requestLogger.error({ error }, "Failed to fetch deleted funnels");
        Sentry.captureException(error, {
            tags: { action: "get-deleted-funnels" },
        });
        throw error;
    }
}

/**
 * Get funnel details for editing
 */
export async function getFunnelDetails(projectId: string) {
    const requestLogger = logger.child({
        handler: "get-funnel-details",
        projectId,
    });

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new ValidationError("Not authenticated");
        }

        const { data: funnel, error } = await supabase
            .from("funnel_projects")
            .select("id, name, slug, description, status, deleted_at")
            .eq("id", projectId)
            .eq("user_id", user.id)
            .single();

        if (error) {
            throw error;
        }

        if (!funnel) {
            throw new ValidationError("Funnel not found");
        }

        return { success: true, funnel };
    } catch (error) {
        requestLogger.error({ error }, "Failed to fetch funnel details");
        Sentry.captureException(error, {
            tags: { action: "get-funnel-details" },
            extra: { projectId },
        });
        throw error;
    }
}
