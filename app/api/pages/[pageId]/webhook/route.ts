/**
 * Page Webhook Settings API
 * Manage webhook configuration for individual pages
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
    getWebhookConfig,
    sendWebhookDirect,
    buildRegistrationPayload,
} from "@/lib/webhook-service";
import type { PageType } from "@/types/pages";
import { ValidationError, AuthenticationError, NotFoundError } from "@/lib/errors";

/**
 * GET /api/pages/[pageId]/webhook
 * Get webhook configuration for a page (includes effective config with inheritance)
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ pageId: string }> }
) {
    const params = await context.params;
    const requestLogger = logger.child({
        handler: "get-page-webhook",
        pageId: params.pageId,
    });

    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new AuthenticationError("Not authenticated");
        }

        const { searchParams } = new URL(request.url);
        const pageType = searchParams.get("pageType") as PageType | null;

        if (!pageType || !["registration", "enrollment", "watch"].includes(pageType)) {
            throw new ValidationError("Invalid or missing pageType parameter");
        }

        // Get the page to verify ownership
        const tableName =
            pageType === "registration"
                ? "registration_pages"
                : pageType === "enrollment"
                  ? "enrollment_pages"
                  : "watch_pages";

        const { data: page, error: pageError } = await supabase
            .from(tableName)
            .select(
                "id, user_id, webhook_enabled, webhook_url, webhook_secret, webhook_inherit_global"
            )
            .eq("id", params.pageId)
            .single();

        if (pageError || !page) {
            throw new NotFoundError("Page");
        }

        if (page.user_id !== user.id) {
            throw new AuthenticationError("Not authorized to access this page");
        }

        // Get effective webhook configuration
        const effectiveConfig = await getWebhookConfig(
            user.id,
            params.pageId,
            pageType
        );

        requestLogger.info("Page webhook config retrieved");

        return NextResponse.json({
            pageConfig: {
                webhook_enabled: page.webhook_enabled,
                webhook_url: page.webhook_url,
                webhook_secret: page.webhook_secret,
                webhook_inherit_global: page.webhook_inherit_global,
            },
            effectiveConfig,
        });
    } catch (error) {
        requestLogger.error({ error }, "Failed to get page webhook config");

        if (
            error instanceof ValidationError ||
            error instanceof AuthenticationError ||
            error instanceof NotFoundError
        ) {
            return NextResponse.json(
                { error: error.message },
                { status: error.statusCode }
            );
        }

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "GET /api/pages/[pageId]/webhook",
            },
            extra: { pageId: params.pageId },
        });

        return NextResponse.json(
            { error: "Failed to retrieve webhook configuration" },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/pages/[pageId]/webhook
 * Update webhook configuration for a page
 */
export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ pageId: string }> }
) {
    const params = await context.params;
    const requestLogger = logger.child({
        handler: "update-page-webhook",
        pageId: params.pageId,
    });

    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new AuthenticationError("Not authenticated");
        }

        const body = await request.json();
        const {
            pageType,
            webhook_enabled,
            webhook_url,
            webhook_secret,
            webhook_inherit_global,
        } = body;

        if (!pageType || !["registration", "enrollment", "watch"].includes(pageType)) {
            throw new ValidationError("Invalid or missing pageType");
        }

        // Validate webhook URL format if provided
        if (webhook_url && !webhook_inherit_global) {
            try {
                new URL(webhook_url);
            } catch {
                throw new ValidationError("Invalid webhook URL format");
            }
        }

        // Get the page to verify ownership
        const tableName =
            pageType === "registration"
                ? "registration_pages"
                : pageType === "enrollment"
                  ? "enrollment_pages"
                  : "watch_pages";

        const { data: page, error: pageError } = await supabase
            .from(tableName)
            .select("id, user_id")
            .eq("id", params.pageId)
            .single();

        if (pageError || !page) {
            throw new NotFoundError("Page");
        }

        if (page.user_id !== user.id) {
            throw new AuthenticationError("Not authorized to modify this page");
        }

        // Update webhook configuration
        const updateData: {
            webhook_enabled: boolean | null;
            webhook_url: string | null;
            webhook_secret: string | null;
            webhook_inherit_global: boolean;
        } = {
            webhook_enabled: webhook_inherit_global ? null : (webhook_enabled ?? false),
            webhook_url: webhook_inherit_global ? null : webhook_url || null,
            webhook_secret: webhook_inherit_global ? null : webhook_secret || null,
            webhook_inherit_global: webhook_inherit_global ?? true,
        };

        const { error: updateError } = await supabase
            .from(tableName)
            .update(updateData)
            .eq("id", params.pageId);

        if (updateError) {
            throw new Error(`Failed to update webhook config: ${updateError.message}`);
        }

        // Get updated effective configuration
        const effectiveConfig = await getWebhookConfig(
            user.id,
            params.pageId,
            pageType as PageType
        );

        requestLogger.info("Page webhook config updated");

        return NextResponse.json({
            success: true,
            pageConfig: updateData,
            effectiveConfig,
        });
    } catch (error) {
        requestLogger.error({ error }, "Failed to update page webhook config");

        if (
            error instanceof ValidationError ||
            error instanceof AuthenticationError ||
            error instanceof NotFoundError
        ) {
            return NextResponse.json(
                { error: error.message },
                { status: error.statusCode }
            );
        }

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "PUT /api/pages/[pageId]/webhook",
            },
            extra: { pageId: params.pageId },
        });

        return NextResponse.json(
            { error: "Failed to update webhook configuration" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/pages/[pageId]/webhook
 * Test webhook for a specific page
 */
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ pageId: string }> }
) {
    const params = await context.params;
    const requestLogger = logger.child({
        handler: "test-page-webhook",
        pageId: params.pageId,
    });

    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new AuthenticationError("Not authenticated");
        }

        const body = await request.json();
        const { pageType } = body;

        if (!pageType || !["registration", "enrollment", "watch"].includes(pageType)) {
            throw new ValidationError("Invalid or missing pageType");
        }

        // Get the page to verify ownership
        const tableName =
            pageType === "registration"
                ? "registration_pages"
                : pageType === "enrollment"
                  ? "enrollment_pages"
                  : "watch_pages";

        const { data: page, error: pageError } = await supabase
            .from(tableName)
            .select("id, user_id, headline")
            .eq("id", params.pageId)
            .single();

        if (pageError || !page) {
            throw new NotFoundError("Page");
        }

        if (page.user_id !== user.id) {
            throw new AuthenticationError("Not authorized to test this page");
        }

        // Get effective webhook configuration
        const config = await getWebhookConfig(
            user.id,
            params.pageId,
            pageType as PageType
        );

        if (!config.enabled || !config.url) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Webhook is not configured for this page",
                    notConfigured: true,
                },
                { status: 400 }
            );
        }

        // Build test payload
        const testPayload = buildRegistrationPayload({
            email: "test@example.com",
            name: "Test User",
            funnelProjectId: "test-project-id",
            funnelProjectName: "Test Funnel",
            pageId: params.pageId,
            pageUrl: `https://example.com/test-page`,
            visitorId: "test-visitor-id",
            userAgent: "Test User Agent",
            referrer: "https://example.com",
            utmParams: {
                source: "test",
                medium: "api",
                campaign: "webhook-test",
            },
        });

        // Send test webhook
        const result = await sendWebhookDirect(
            config.url,
            config.secret,
            testPayload,
            user.id
        );

        requestLogger.info({ result }, "Test webhook sent");

        return NextResponse.json({
            success: result.success,
            statusCode: result.statusCode,
            error: result.error,
            isInherited: config.isInherited,
        });
    } catch (error) {
        requestLogger.error({ error }, "Failed to test page webhook");

        if (
            error instanceof ValidationError ||
            error instanceof AuthenticationError ||
            error instanceof NotFoundError
        ) {
            return NextResponse.json(
                { error: error.message },
                { status: error.statusCode }
            );
        }

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "POST /api/pages/[pageId]/webhook",
            },
            extra: { pageId: params.pageId },
        });

        return NextResponse.json({ error: "Failed to test webhook" }, { status: 500 });
    }
}
