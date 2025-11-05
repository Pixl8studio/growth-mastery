/**
 * Server actions for page management
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import type { PageType } from "@/types/pages";

export async function togglePagePublish(
    pageType: PageType,
    pageId: string,
    isPublished: boolean
) {
    const requestLogger = logger.child({
        handler: "toggle-page-publish",
        pageType,
        pageId,
    });

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new Error("Not authenticated");
        }

        const tableName = `${pageType}_pages`;

        const { error } = await supabase
            .from(tableName)
            .update({ is_published: isPublished })
            .eq("id", pageId)
            .eq("user_id", user.id);

        if (error) {
            throw error;
        }

        requestLogger.info({ isPublished }, "Page publish status updated");

        revalidatePath("/pages");

        return { success: true };
    } catch (error) {
        requestLogger.error({ error }, "Failed to update publish status");
        throw error;
    }
}

export async function updatePageSlug(pageType: PageType, pageId: string, slug: string) {
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
            throw new Error("Not authenticated");
        }

        requestLogger.info({ userId: user.id, slug }, "Updating page slug");

        const tableName = `${pageType}_pages`;

        // Check if slug is already taken by this user (excluding current page)
        const { data: existing } = await supabase
            .from(tableName)
            .select("id")
            .eq("user_id", user.id)
            .eq("vanity_slug", slug)
            .neq("id", pageId)
            .single();

        if (existing) {
            throw new Error("Slug already in use");
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

        revalidatePath("/pages");

        return { success: true };
    } catch (error) {
        requestLogger.error({ error }, "Failed to update page slug");
        throw error;
    }
}

export async function deletePage(pageType: PageType, pageId: string) {
    const requestLogger = logger.child({
        handler: "delete-page",
        pageType,
        pageId,
    });

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new Error("Not authenticated");
        }

        const tableName = `${pageType}_pages`;

        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq("id", pageId)
            .eq("user_id", user.id);

        if (error) {
            throw error;
        }

        requestLogger.info("Page deleted successfully");

        revalidatePath("/pages");

        return { success: true };
    } catch (error) {
        requestLogger.error({ error }, "Failed to delete page");
        throw error;
    }
}
