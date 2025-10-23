/**
 * Webhook Test Endpoint
 * Send a test webhook to verify CRM integration
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { sendWebhook } from "@/lib/webhook-service";

export async function POST(_request: NextRequest) {
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

        // Send webhook
        const result = await sendWebhook(user.id, testPayload);

        if (result.success) {
            requestLogger.info({ userId: user.id }, "Test webhook sent successfully");
            return NextResponse.json({
                success: true,
                message: "Test webhook sent successfully",
                statusCode: result.statusCode,
            });
        } else {
            requestLogger.warn({ userId: user.id }, "Test webhook failed");
            return NextResponse.json(
                {
                    success: false,
                    error: "Webhook delivery failed. Check your webhook logs for details.",
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
