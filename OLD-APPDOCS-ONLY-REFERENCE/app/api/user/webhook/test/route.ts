/**
 * Webhook Test Endpoint
 * Send a test webhook to verify CRM integration
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { sendWebhookDirect } from "@/lib/webhook-service";

export async function POST(request: NextRequest) {
    const requestLogger = logger.child({ handler: "test-webhook" });

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        requestLogger.info({ userId: user.id }, "Sending test webhook");

        // Parse request body for test configuration
        const body = await request.json().catch(() => ({}));
        const { webhookUrl, webhookSecret } = body;

        // Build test payload
        const testPayload = {
            event: "webhook.test",
            timestamp: new Date().toISOString(),
            data: {
                message: "This is a test webhook from Genie AI",
                userId: user.id,
                test: true,
            },
        };

        // If webhook URL provided in request, use it for testing (even if not saved)
        // Otherwise fall back to saved configuration
        const result = webhookUrl
            ? await sendWebhookDirect(webhookUrl, webhookSecret, testPayload, user.id)
            : await sendWebhookDirect(null, null, testPayload, user.id);

        if (result.success) {
            requestLogger.info({ userId: user.id }, "Test webhook sent successfully");
            return NextResponse.json({
                success: true,
                message: "Test webhook sent successfully",
                statusCode: result.statusCode,
            });
        } else {
            // Configuration error (webhook not enabled or URL not set)
            if (result.notConfigured) {
                requestLogger.info(
                    { userId: user.id },
                    "Test webhook skipped - not configured"
                );
                return NextResponse.json(
                    {
                        success: false,
                        error: result.error || "Webhook not configured",
                    },
                    { status: 400 }
                );
            }

            // Delivery failure (network error, bad response, etc.)
            requestLogger.warn(
                { userId: user.id, error: result.error },
                "Test webhook failed"
            );
            return NextResponse.json(
                {
                    success: false,
                    error:
                        result.error ||
                        "Webhook delivery failed. Check your webhook logs for details.",
                },
                { status: 500 }
            );
        }
    } catch (error) {
        requestLogger.error({ error }, "Failed to send test webhook");
        return NextResponse.json(
            { error: "Failed to send test webhook" },
            { status: 500 }
        );
    }
}
