/**
 * AI Editor - Publish Endpoint
 * POST /api/ai-editor/pages/[pageId]/publish
 *
 * Uses atomic PostgreSQL RPC function to ensure data consistency.
 * All publish fields (status, slug, published_url, published_at) are updated
 * in a single transaction to prevent partial updates.
 */

import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
    validateSlugFormat,
    isReservedSlug,
    normalizeSlug,
} from "@/lib/utils/slug-validation";

interface RouteParams {
    params: Promise<{
        pageId: string;
    }>;
}

interface PublishRequest {
    slug?: string;
    action?: "publish" | "unpublish";
}

/**
 * POST - Publish or unpublish an AI editor page
 *
 * Uses atomic RPC functions to ensure all publish fields are updated
 * in a single transaction, preventing data inconsistency.
 */
export async function POST(request: Request, { params }: RouteParams) {
    const startTime = Date.now();

    try {
        const supabase = await createClient();
        const { pageId } = await params;

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parse request body
        const body: PublishRequest = await request.json().catch(() => ({}));
        const action = body.action || "publish";

        logger.info({ pageId, userId: user.id, action }, "Processing publish request");

        // Track publish attempt in Sentry
        Sentry.addBreadcrumb({
            category: "ai-editor.publish",
            message: `${action} request started`,
            level: "info",
            data: { pageId, action },
        });

        if (action === "unpublish") {
            // Use atomic unpublish RPC
            const { data, error } = await supabase.rpc("unpublish_ai_editor_page", {
                p_page_id: pageId,
                p_user_id: user.id,
            });

            if (error) {
                logger.error({ error, pageId }, "RPC unpublish failed");
                Sentry.captureException(error, {
                    tags: {
                        component: "api",
                        action: "unpublish_page",
                        endpoint: "POST /api/ai-editor/pages/[pageId]/publish",
                    },
                });
                return NextResponse.json(
                    { error: "Failed to unpublish page" },
                    { status: 500 }
                );
            }

            const result = data as { success: boolean; error?: string; page?: unknown };

            if (!result.success) {
                const statusCode =
                    result.error === "Page not found"
                        ? 404
                        : result.error?.includes("access")
                          ? 403
                          : 400;
                return NextResponse.json(
                    { error: result.error },
                    { status: statusCode }
                );
            }

            logger.info({ pageId, userId: user.id }, "Page unpublished successfully");

            return NextResponse.json({
                success: true,
                page: result.page,
            });
        }

        // Publish action - determine slug
        let slug: string;

        if (body.slug) {
            // Use provided slug
            slug = body.slug;
        } else {
            // Fetch page to generate slug from title
            const { data: page } = await supabase
                .from("ai_editor_pages")
                .select("title, slug")
                .eq("id", pageId)
                .single();

            if (page?.slug) {
                slug = page.slug;
            } else if (page?.title) {
                slug = normalizeSlug(page.title);
            } else {
                slug = `page-${Date.now()}`;
            }
        }

        // Validate slug format
        const validationError = validateSlugFormat(slug);
        if (validationError) {
            return NextResponse.json(
                { error: validationError, field: "slug" },
                { status: 400 }
            );
        }

        // Check for reserved slugs
        if (isReservedSlug(slug)) {
            return NextResponse.json(
                {
                    error: "This URL is reserved. Please choose a different one.",
                    field: "slug",
                },
                { status: 400 }
            );
        }

        // Use atomic publish RPC
        // This handles slug collision check, ownership validation, and all updates
        // in a single transaction
        const { data, error } = await supabase.rpc("publish_ai_editor_page", {
            p_page_id: pageId,
            p_user_id: user.id,
            p_slug: slug,
        });

        if (error) {
            logger.error({ error, pageId, slug }, "RPC publish failed");
            Sentry.captureException(error, {
                tags: {
                    component: "api",
                    action: "publish_page",
                    endpoint: "POST /api/ai-editor/pages/[pageId]/publish",
                },
                extra: { pageId, slug },
            });
            return NextResponse.json(
                { error: "Failed to publish page" },
                { status: 500 }
            );
        }

        const result = data as {
            success: boolean;
            error?: string;
            error_code?: string;
            page?: {
                id: string;
                title: string;
                slug: string;
                status: string;
                published_url: string;
                published_at: string;
                version: number;
            };
        };

        if (!result.success) {
            const statusCode =
                result.error_code === "PAGE_NOT_FOUND"
                    ? 404
                    : result.error_code === "UNAUTHORIZED"
                      ? 403
                      : result.error_code === "SLUG_COLLISION"
                        ? 409
                        : 400;

            // Track slug collision as a metric
            if (result.error_code === "SLUG_COLLISION") {
                Sentry.addBreadcrumb({
                    category: "ai-editor.publish",
                    message: "Slug collision detected",
                    level: "warning",
                    data: { pageId, slug },
                });
            }

            return NextResponse.json({ error: result.error }, { status: statusCode });
        }

        const processingTime = Date.now() - startTime;

        logger.info(
            {
                pageId,
                userId: user.id,
                slug,
                publishedUrl: result.page?.published_url,
                processingTime,
            },
            "Page published successfully"
        );

        return NextResponse.json({
            success: true,
            page: result.page,
        });
    } catch (error) {
        logger.error({ error }, "Failed to publish AI editor page");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "publish_page",
                endpoint: "POST /api/ai-editor/pages/[pageId]/publish",
            },
        });

        return NextResponse.json({ error: "Failed to publish page" }, { status: 500 });
    }
}
