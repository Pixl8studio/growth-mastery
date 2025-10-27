/**
 * Webhook Service
 * Send data to user-configured CRM webhooks with retry logic
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { retry } from "@/lib/utils";
import { WEBHOOK_CONFIG } from "@/lib/config";
import crypto from "crypto";

interface WebhookPayload {
    event: string;
    timestamp: string;
    data: Record<string, unknown>;
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
 */
export async function sendWebhook(
    userId: string,
    payload: WebhookPayload
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
    });

    try {
        requestLogger.info("Sending webhook");

        // Get user's webhook configuration
        const supabase = await createClient();

        const { data: profile, error: profileError } = await supabase
            .from("user_profiles")
            .select("webhook_enabled, crm_webhook_url, webhook_secret")
            .eq("id", userId)
            .single();

        if (profileError || !profile) {
            throw new Error("User profile not found");
        }

        // Check if webhook is enabled
        if (!profile.webhook_enabled || !profile.crm_webhook_url) {
            const errorMsg = !profile.webhook_enabled
                ? "Webhook is not enabled. Please enable it in your settings."
                : "Webhook URL is not configured. Please set your webhook URL in settings.";
            requestLogger.info(errorMsg);
            return { success: false, notConfigured: true, error: errorMsg };
        }

        const webhookUrl = profile.crm_webhook_url;
        const webhookSecret = profile.webhook_secret;

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
