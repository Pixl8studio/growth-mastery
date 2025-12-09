/**
 * Webhook Service
 * Send data to user-configured CRM webhooks with retry logic
 * Supports both page-level and global webhook configuration
 */

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { retry } from "@/lib/utils";
import { WEBHOOK_CONFIG } from "@/lib/config";
import type { PageType } from "@/types/pages";
import crypto from "crypto";

interface WebhookPayload {
    event: string;
    timestamp: string;
    data: Record<string, unknown>;
}

interface WebhookConfiguration {
    enabled: boolean;
    url: string | null;
    secret: string | null;
    isInherited: boolean;
}

/**
 * Get effective webhook configuration for a page
 * Checks page-level settings first, falls back to global if inherit_global is true
 */
export async function getWebhookConfig(
    userId: string,
    pageId?: string,
    pageType?: PageType
): Promise<WebhookConfiguration> {
    const supabase = await createClient();
    const requestLogger = logger.child({
        handler: "get-webhook-config",
        userId,
        pageId,
        pageType,
    });

    try {
        // Get global webhook settings
        const { data: profile, error: profileError } = await supabase
            .from("user_profiles")
            .select("webhook_enabled, crm_webhook_url, webhook_secret")
            .eq("id", userId)
            .single();

        if (profileError || !profile) {
            requestLogger.warn("User profile not found");
            return {
                enabled: false,
                url: null,
                secret: null,
                isInherited: false,
            };
        }

        // If no page context provided, return global config
        if (!pageId || !pageType) {
            return {
                enabled: profile.webhook_enabled || false,
                url: profile.crm_webhook_url || null,
                secret: profile.webhook_secret || null,
                isInherited: false,
            };
        }

        // Get page-level webhook settings
        const tableName =
            pageType === "registration"
                ? "registration_pages"
                : pageType === "enrollment"
                  ? "enrollment_pages"
                  : "watch_pages";

        const { data: pageData, error: pageError } = await supabase
            .from(tableName)
            .select(
                "webhook_enabled, webhook_url, webhook_secret, webhook_inherit_global"
            )
            .eq("id", pageId)
            .single();

        if (pageError || !pageData) {
            requestLogger.warn(
                { error: pageError },
                "Page not found, using global config"
            );
            return {
                enabled: profile.webhook_enabled || false,
                url: profile.crm_webhook_url || null,
                secret: profile.webhook_secret || null,
                isInherited: true,
            };
        }

        // If page inherits from global or has no explicit config
        if (pageData.webhook_inherit_global || pageData.webhook_enabled === null) {
            return {
                enabled: profile.webhook_enabled || false,
                url: profile.crm_webhook_url || null,
                secret: profile.webhook_secret || null,
                isInherited: true,
            };
        }

        // Use page-specific configuration
        return {
            enabled: pageData.webhook_enabled || false,
            url: pageData.webhook_url || null,
            secret: pageData.webhook_secret || null,
            isInherited: false,
        };
    } catch (error) {
        requestLogger.error({ error }, "Failed to get webhook config");

        Sentry.captureException(error, {
            tags: {
                service: "webhooks",
                operation: "get_webhook_config",
            },
            extra: {
                userId,
                pageId,
                pageType,
            },
        });

        return {
            enabled: false,
            url: null,
            secret: null,
            isInherited: false,
        };
    }
}

/**
 * Send webhook directly with explicit URL/secret or read from database
 * Used for testing with unsaved configuration
 */
export async function sendWebhookDirect(
    webhookUrl: string | null,
    webhookSecret: string | null | undefined,
    payload: WebhookPayload,
    userId: string
): Promise<{
    success: boolean;
    statusCode?: number;
    error?: string;
    notConfigured?: boolean;
}> {
    const requestLogger = logger.child({
        handler: "send-webhook-direct",
        userId,
        event: payload.event,
    });

    try {
        requestLogger.info("Sending webhook");

        // If no URL provided, read from database
        if (!webhookUrl) {
            const supabase = await createClient();

            const { data: profile, error: profileError } = await supabase
                .from("user_profiles")
                .select("webhook_enabled, crm_webhook_url, webhook_secret")
                .eq("id", userId)
                .single();

            if (profileError || !profile) {
                throw new Error("User profile not found");
            }

            if (!profile.webhook_enabled || !profile.crm_webhook_url) {
                const errorMsg = !profile.webhook_enabled
                    ? "Webhook is not enabled. Please enable it in your settings."
                    : "Webhook URL is not configured. Please set your webhook URL in settings.";
                requestLogger.info(errorMsg);
                return { success: false, notConfigured: true, error: errorMsg };
            }

            webhookUrl = profile.crm_webhook_url;
            webhookSecret = profile.webhook_secret;
        }

        // At this point webhookUrl is guaranteed to be set
        if (!webhookUrl) {
            throw new Error("Webhook URL not configured");
        }

        // Generate HMAC signature if secret is configured
        const signature = webhookSecret
            ? generateHmacSignature(JSON.stringify(payload), webhookSecret)
            : undefined;

        // Send webhook with retry logic
        const result = await retry(
            async () => {
                const response = await fetch(webhookUrl!, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(signature ? { "X-Webhook-Signature": signature } : {}),
                        "User-Agent": "GenieAI/1.0",
                    },
                    body: JSON.stringify(payload),
                    signal: AbortSignal.timeout(WEBHOOK_CONFIG.timeoutMs),
                });

                if (!response.ok) {
                    throw new Error(`Webhook failed with status ${response.status}`);
                }

                return {
                    success: true,
                    statusCode: response.status,
                    responseBody: await response.text(),
                };
            },
            {
                maxAttempts: WEBHOOK_CONFIG.maxRetries,
                delayMs: WEBHOOK_CONFIG.retryDelayMs,
                backoffMultiplier: WEBHOOK_CONFIG.retryBackoffMultiplier,
            }
        );

        // Log successful delivery
        await logWebhookDelivery({
            userId,
            eventType: payload.event,
            payload,
            webhookUrl: webhookUrl!,
            statusCode: result.statusCode!,
            success: true,
            attemptNumber: 1,
        });

        requestLogger.info(
            { statusCode: result.statusCode },
            "Webhook sent successfully"
        );

        return { success: true, statusCode: result.statusCode };
    } catch (error) {
        requestLogger.error({ error }, "Failed to send webhook");

        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        Sentry.captureException(error, {
            tags: {
                service: "webhooks",
                operation: "send_webhook_direct",
            },
            extra: {
                userId,
                event: payload.event,
                webhookUrl: webhookUrl || "not_configured",
                hasSecret: !!webhookSecret,
            },
        });

        // Log failed delivery
        await logWebhookDelivery({
            userId,
            eventType: payload.event,
            payload,
            webhookUrl: webhookUrl || "",
            success: false,
            errorMessage,
            attemptNumber: WEBHOOK_CONFIG.maxRetries,
        });

        return { success: false, error: errorMessage };
    }
}

/**
 * Send webhook to user's CRM
 * Supports page-level webhook configuration with global fallback
 */
export async function sendWebhook(
    userId: string,
    payload: WebhookPayload,
    options?: {
        pageId?: string;
        pageType?: PageType;
    }
): Promise<{
    success: boolean;
    statusCode?: number;
    error?: string;
    notConfigured?: boolean;
}> {
    const requestLogger = logger.child({
        handler: "send-webhook",
        userId,
        event: payload.event,
        pageId: options?.pageId,
        pageType: options?.pageType,
    });

    try {
        requestLogger.info("Sending webhook");

        // Get effective webhook configuration (page-level or global)
        const config = await getWebhookConfig(
            userId,
            options?.pageId,
            options?.pageType
        );

        // Check if webhook is enabled and configured
        if (!config.enabled || !config.url) {
            const errorMsg = !config.enabled
                ? "Webhook is not enabled. Please enable it in your settings."
                : "Webhook URL is not configured. Please set your webhook URL in settings.";
            requestLogger.info({ config }, errorMsg);
            return { success: false, notConfigured: true, error: errorMsg };
        }

        const webhookUrl = config.url;
        const webhookSecret = config.secret;

        // Generate HMAC signature if secret is configured
        const signature = webhookSecret
            ? generateHmacSignature(JSON.stringify(payload), webhookSecret)
            : undefined;

        // Send webhook with retry logic
        const result = await retry(
            async () => {
                const response = await fetch(webhookUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(signature ? { "X-Webhook-Signature": signature } : {}),
                        "User-Agent": "GenieAI/1.0",
                    },
                    body: JSON.stringify(payload),
                    signal: AbortSignal.timeout(WEBHOOK_CONFIG.timeoutMs),
                });

                if (!response.ok) {
                    throw new Error(`Webhook failed with status ${response.status}`);
                }

                return {
                    success: true,
                    statusCode: response.status,
                    responseBody: await response.text(),
                };
            },
            {
                maxAttempts: WEBHOOK_CONFIG.maxRetries,
                delayMs: WEBHOOK_CONFIG.retryDelayMs,
                backoffMultiplier: WEBHOOK_CONFIG.retryBackoffMultiplier,
            }
        );

        // Log successful delivery
        await logWebhookDelivery({
            userId,
            eventType: payload.event,
            payload,
            webhookUrl,
            statusCode: result.statusCode!,
            success: true,
            attemptNumber: 1, // TODO: Track actual attempt number
        });

        requestLogger.info(
            { statusCode: result.statusCode },
            "Webhook sent successfully"
        );

        return { success: true, statusCode: result.statusCode };
    } catch (error) {
        requestLogger.error({ error }, "Failed to send webhook");

        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        Sentry.captureException(error, {
            tags: {
                service: "webhooks",
                operation: "send_webhook",
            },
            extra: {
                userId,
                event: payload.event,
                pageId: options?.pageId,
                pageType: options?.pageType,
            },
        });

        // Log failed delivery
        await logWebhookDelivery({
            userId,
            eventType: payload.event,
            payload,
            webhookUrl: "", // Will be filled if available
            success: false,
            errorMessage,
            attemptNumber: WEBHOOK_CONFIG.maxRetries,
        });

        return { success: false, error: errorMessage };
    }
}

/**
 * Generate HMAC signature for webhook payload
 */
function generateHmacSignature(payload: string, secret: string): string {
    return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
): boolean {
    const expectedSignature = generateHmacSignature(payload, secret);
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

/**
 * Log webhook delivery attempt
 */
async function logWebhookDelivery(params: {
    userId: string;
    eventType: string;
    payload: WebhookPayload;
    webhookUrl: string;
    statusCode?: number;
    success: boolean;
    errorMessage?: string;
    attemptNumber: number;
}): Promise<void> {
    try {
        const supabase = await createClient();

        await supabase.from("webhook_logs").insert({
            user_id: params.userId,
            event_type: params.eventType,
            payload: params.payload,
            webhook_url: params.webhookUrl,
            status_code: params.statusCode,
            success: params.success,
            error_message: params.errorMessage,
            attempt_number: params.attemptNumber,
            delivered_at: params.success ? new Date().toISOString() : null,
        });
    } catch (error) {
        logger.error({ error }, "Failed to log webhook delivery");

        Sentry.captureException(error, {
            tags: {
                service: "webhooks",
                operation: "log_webhook_delivery",
            },
            extra: {
                userId: params.userId,
                eventType: params.eventType,
                success: params.success,
            },
        });

        // Don't throw - logging failure shouldn't break the webhook flow
    }
}

/**
 * Build webhook payload for registration event
 */
export function buildRegistrationPayload(params: {
    email: string;
    name: string;
    funnelProjectId: string;
    funnelProjectName: string;
    pageId: string;
    pageUrl: string;
    visitorId: string;
    userAgent?: string;
    referrer?: string;
    utmParams?: {
        source?: string;
        medium?: string;
        campaign?: string;
        term?: string;
        content?: string;
    };
}): WebhookPayload {
    return {
        event: "registration.submitted",
        timestamp: new Date().toISOString(),
        data: {
            email: params.email,
            name: params.name,
            funnel: {
                projectId: params.funnelProjectId,
                projectName: params.funnelProjectName,
                pageId: params.pageId,
                pageUrl: params.pageUrl,
            },
            visitor: {
                id: params.visitorId,
                userAgent: params.userAgent,
                referrer: params.referrer,
            },
            utm: params.utmParams || {},
        },
    };
}

/**
 * Build webhook payload for video watched event
 */
export function buildVideoWatchedPayload(params: {
    contactId: string;
    email: string;
    name: string;
    watchPercentage: number;
    watchDuration: number;
    funnelProjectId: string;
    pageId: string;
}): WebhookPayload {
    return {
        event: "video.watched",
        timestamp: new Date().toISOString(),
        data: {
            contactId: params.contactId,
            email: params.email,
            name: params.name,
            video: {
                watchPercentage: params.watchPercentage,
                watchDuration: params.watchDuration,
                milestone:
                    params.watchPercentage >= 100
                        ? "completed"
                        : `${params.watchPercentage}%`,
            },
            funnel: {
                projectId: params.funnelProjectId,
                pageId: params.pageId,
            },
        },
    };
}

/**
 * Build webhook payload for enrollment viewed event
 */
export function buildEnrollmentViewedPayload(params: {
    contactId: string;
    email: string;
    name: string;
    funnelProjectId: string;
    offerId: string;
    pageId: string;
}): WebhookPayload {
    return {
        event: "enrollment.viewed",
        timestamp: new Date().toISOString(),
        data: {
            contactId: params.contactId,
            email: params.email,
            name: params.name,
            funnel: {
                projectId: params.funnelProjectId,
                offerId: params.offerId,
                pageId: params.pageId,
            },
        },
    };
}
