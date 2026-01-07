/**
 * AI Editor - Page CRUD Endpoint
 * GET /api/ai-editor/pages/[pageId] - Get a page
 * PUT /api/ai-editor/pages/[pageId] - Update a page
 * DELETE /api/ai-editor/pages/[pageId] - Delete a page
 */

import * as Sentry from "@sentry/nextjs";
import crypto from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { checkHtmlSize } from "@/lib/validation/html";

/**
 * Standard error response format
 */
interface ErrorResponse {
    error: string;
    code?: string;
    details?: string;
}

/**
 * Create a standardized error response
 */
function createErrorResponse(
    error: string,
    status: number,
    code?: string,
    details?: string
): NextResponse<ErrorResponse> {
    return NextResponse.json(
        { error, ...(code && { code }), ...(details && { details }) },
        { status }
    );
}

interface RouteParams {
    params: Promise<{
        pageId: string;
    }>;
}

/**
 * Reserved slugs that could conflict with app routes
 */
const RESERVED_SLUGS = [
    "admin",
    "api",
    "auth",
    "app",
    "dashboard",
    "login",
    "logout",
    "signup",
    "register",
    "settings",
    "profile",
    "account",
    "billing",
    "help",
    "support",
    "docs",
    "blog",
    "about",
    "contact",
    "privacy",
    "terms",
    "ai-editor",
    "funnel",
    "funnels",
    "project",
    "projects",
    "page",
    "pages",
    "p",
    "preview",
];

/**
 * Check if a slug is reserved
 */
function isReservedSlug(slug: string): boolean {
    return RESERVED_SLUGS.includes(slug.toLowerCase());
}

/**
 * Generate a cryptographically random slug suffix
 * Returns 8 hex characters (~32 bits of entropy, 4 billion possibilities)
 */
function generateRandomSuffix(): string {
    return crypto.randomBytes(4).toString("hex");
}

/**
 * Generate a URL-safe slug from a title
 * Uses crypto for better entropy when appending random suffixes
 */
function generateSlug(title: string): string {
    let slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 50);

    // Append random suffix if reserved or empty
    if (isReservedSlug(slug) || !slug) {
        const suffix = generateRandomSuffix();
        slug = slug ? `${slug}-${suffix}` : `page-${suffix}`;
    }

    return slug;
}

/**
 * GET - Retrieve a single AI editor page
 */
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const supabase = await createClient();
        const { pageId } = await params;

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return createErrorResponse("Unauthorized", 401, "AUTH_REQUIRED");
        }

        const { data: page, error } = await supabase
            .from("ai_editor_pages")
            .select(
                `
        *,
        funnel_projects!inner(name, user_id),
        ai_editor_conversations(messages, total_edits),
        ai_editor_versions(id, version, change_description, created_at)
      `
            )
            .eq("id", pageId)
            .single();

        if (error || !page) {
            return createErrorResponse("Page not found", 404, "PAGE_NOT_FOUND");
        }

        if (page.funnel_projects.user_id !== user.id) {
            return createErrorResponse(
                "You don't have access to this page",
                403,
                "ACCESS_DENIED"
            );
        }

        return NextResponse.json({ page });
    } catch (error) {
        logger.error({ error }, "Failed to get AI editor page");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "get_page",
                endpoint: "GET /api/ai-editor/pages/[pageId]",
            },
        });

        return createErrorResponse(
            "Failed to get page",
            500,
            "INTERNAL_ERROR",
            error instanceof Error ? error.message : undefined
        );
    }
}

/**
 * PUT - Update an AI editor page
 */
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const supabase = await createClient();
        const { pageId } = await params;

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return createErrorResponse("Unauthorized", 401, "AUTH_REQUIRED");
        }

        // Parse body
        const body = await request.json();
        const { title, html_content, status, version, slug } = body;

        // Validate HTML content size if provided
        if (html_content !== undefined) {
            const htmlSizeCheck = checkHtmlSize(html_content);
            if (!htmlSizeCheck.valid) {
                logger.warn(
                    { size: htmlSizeCheck.size, maxSize: htmlSizeCheck.maxSize },
                    "HTML content too large in page update"
                );
                return createErrorResponse(
                    "HTML content is too large",
                    400,
                    "CONTENT_TOO_LARGE",
                    htmlSizeCheck.error
                );
            }
        }

        // Verify ownership
        const { data: existingPage, error: fetchError } = await supabase
            .from("ai_editor_pages")
            .select("*, funnel_projects!inner(user_id, name)")
            .eq("id", pageId)
            .single();

        if (fetchError || !existingPage) {
            return createErrorResponse("Page not found", 404, "PAGE_NOT_FOUND");
        }

        if (existingPage.funnel_projects.user_id !== user.id) {
            return createErrorResponse(
                "You don't have access to this page",
                403,
                "ACCESS_DENIED"
            );
        }

        // Build update object
        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (title !== undefined) updates.title = title;
        if (html_content !== undefined) updates.html_content = html_content;
        if (status !== undefined) updates.status = status;
        if (version !== undefined) updates.version = version;

        // Handle slug and published URL when publishing
        if (slug !== undefined) {
            // Validate slug format
            if (!/^[a-z0-9-]+$/.test(slug) || slug.length < 3 || slug.length > 50) {
                return createErrorResponse(
                    "Invalid slug format",
                    400,
                    "INVALID_SLUG",
                    "Slug must be 3-50 characters and contain only lowercase letters, numbers, and hyphens"
                );
            }

            // Check if slug is reserved
            if (isReservedSlug(slug)) {
                return createErrorResponse(
                    "This URL is reserved. Please choose a different one.",
                    400,
                    "RESERVED_SLUG"
                );
            }

            // Check if slug is already taken (by another page)
            // Note: Don't use .single() - it throws when no rows found (which is success case)
            const { data: existingSlugs } = await supabase
                .from("ai_editor_pages")
                .select("id")
                .eq("slug", slug)
                .neq("id", pageId);

            if (existingSlugs && existingSlugs.length > 0) {
                return createErrorResponse(
                    "This URL is already taken. Please choose a different one.",
                    409,
                    "SLUG_TAKEN"
                );
            }

            updates.slug = slug;
        }

        // Generate published URL when publishing
        // Store original values for potential rollback
        const originalSlug = existingPage.slug;
        const originalPublishedUrl = existingPage.published_url;
        const originalPublishedAt = existingPage.published_at;

        if (status === "published") {
            try {
                const pageSlug =
                    slug || existingPage.slug || generateSlug(existingPage.title);
                const baseUrl =
                    process.env.NEXT_PUBLIC_APP_URL || "https://app.growthmastery.ai";

                // Validate the generated URL
                if (!pageSlug) {
                    throw new Error("Failed to generate slug");
                }

                updates.slug = pageSlug;
                updates.published_url = `${baseUrl}/p/${pageSlug}`;
                updates.published_at = new Date().toISOString();
            } catch (error) {
                logger.error({ error }, "Failed to generate published URL");
                return createErrorResponse(
                    "Failed to generate published URL",
                    500,
                    "URL_GENERATION_FAILED"
                );
            }
        }

        // Update the page
        const { data: updatedPage, error: updateError } = await supabase
            .from("ai_editor_pages")
            .update(updates)
            .eq("id", pageId)
            .select()
            .single();

        if (updateError) {
            logger.error({ error: updateError }, "Failed to update AI editor page");

            // Attempt rollback if we modified slug/URL and update failed
            // NOTE: This is a best-effort rollback for publish-related fields only
            // (slug, published_url, published_at). Supabase doesn't support true
            // transactions via the JS client for complex multi-field updates.
            // Other fields (title, html_content, status, version) are NOT rolled back.
            // This is acceptable because:
            // 1. Most update failures are network/timeout issues where the update didn't happen
            // 2. The slug/URL fields are the most critical to restore (prevent orphaned URLs)
            // 3. Client-side state will still have the correct data for retry
            if (status === "published" && (originalSlug || originalPublishedUrl)) {
                logger.info(
                    { pageId },
                    "Attempting best-effort rollback of publish fields"
                );
                try {
                    await supabase
                        .from("ai_editor_pages")
                        .update({
                            slug: originalSlug,
                            published_url: originalPublishedUrl,
                            published_at: originalPublishedAt,
                        })
                        .eq("id", pageId);
                } catch (rollbackError) {
                    logger.error({ error: rollbackError, pageId }, "Rollback failed");
                }
            }

            return createErrorResponse(
                "Failed to update page",
                500,
                "UPDATE_FAILED",
                updateError.message
            );
        }

        // Create version record if HTML changed
        if (html_content !== undefined && html_content !== existingPage.html_content) {
            const { error: versionError } = await supabase
                .from("ai_editor_versions")
                .insert({
                    page_id: pageId,
                    version: version || (existingPage.version || 0) + 1,
                    html_content,
                    change_description: "Manual save",
                });

            if (versionError) {
                logger.warn({ error: versionError }, "Failed to create version record");
            }
        }

        logger.info({ pageId, userId: user.id }, "AI editor page updated");

        return NextResponse.json({ page: updatedPage });
    } catch (error) {
        logger.error({ error }, "Failed to update AI editor page");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "update_page",
                endpoint: "PUT /api/ai-editor/pages/[pageId]",
            },
        });

        return createErrorResponse(
            "Failed to update page",
            500,
            "INTERNAL_ERROR",
            error instanceof Error ? error.message : undefined
        );
    }
}

/**
 * DELETE - Delete an AI editor page
 */
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const supabase = await createClient();
        const { pageId } = await params;

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return createErrorResponse("Unauthorized", 401, "AUTH_REQUIRED");
        }

        // Verify ownership
        const { data: existingPage, error: fetchError } = await supabase
            .from("ai_editor_pages")
            .select("*, funnel_projects!inner(user_id)")
            .eq("id", pageId)
            .single();

        if (fetchError || !existingPage) {
            return createErrorResponse("Page not found", 404, "PAGE_NOT_FOUND");
        }

        if (existingPage.funnel_projects.user_id !== user.id) {
            return createErrorResponse(
                "You don't have access to this page",
                403,
                "ACCESS_DENIED"
            );
        }

        // Delete the page (cascades to versions and conversations)
        const { error: deleteError } = await supabase
            .from("ai_editor_pages")
            .delete()
            .eq("id", pageId);

        if (deleteError) {
            logger.error({ error: deleteError }, "Failed to delete AI editor page");
            return createErrorResponse(
                "Failed to delete page",
                500,
                "DELETE_FAILED",
                deleteError.message
            );
        }

        logger.info({ pageId, userId: user.id }, "AI editor page deleted");

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error({ error }, "Failed to delete AI editor page");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "delete_page",
                endpoint: "DELETE /api/ai-editor/pages/[pageId]",
            },
        });

        return createErrorResponse(
            "Failed to delete page",
            500,
            "INTERNAL_ERROR",
            error instanceof Error ? error.message : undefined
        );
    }
}
