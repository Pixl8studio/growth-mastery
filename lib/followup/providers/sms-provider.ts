/**
 * SMS Provider Abstraction
 *
 * Unified interface for SMS providers (Twilio, etc.).
 * Handles SMS sending, delivery tracking, and opt-out processing.
 */

import { logger } from "@/lib/logger";

export interface SMSMessage {
    to: string;
    from: string;
    body: string;
    metadata?: Record<string, unknown>;
}

export interface SMSSendResult {
    success: boolean;
    provider_message_id?: string;
    error?: string;
}

export interface SMSProvider {
    name: string;
    sendSMS(message: SMSMessage): Promise<SMSSendResult>;
    verifyWebhook(body: unknown, signature: string): boolean;
    processWebhookEvent(body: unknown): SMSWebhookEvent | null;
}

export interface SMSWebhookEvent {
    provider_message_id: string;
    event_type: "delivered" | "failed" | "unsubscribed";
    phone: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
}

/**
 * Console SMS Provider (for testing)
 *
 * Logs SMS to console instead of sending.
 * Useful for development and testing.
 */
export class ConsoleSMSProvider implements SMSProvider {
    name = "console";

    async sendSMS(message: SMSMessage): Promise<SMSSendResult> {
        logger.info(
            {
                to: message.to,
                from: message.from,
                bodyLength: message.body.length,
            },
            "📱 [Console] SMS would be sent"
        );

        console.log("=".repeat(80));
        console.log(`To: ${message.to}`);
        console.log(`From: ${message.from}`);
        console.log("=".repeat(80));
        console.log(message.body);
        console.log("=".repeat(80));

        return {
            success: true,
            provider_message_id: `console-sms-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        };
    }

    verifyWebhook(): boolean {
        return true;
    }

    processWebhookEvent(): null {
        return null;
    }
}

/**
 * Twilio SMS Provider
 *
 * Integration with Twilio API for production SMS delivery.
 * Requires TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.
 */
export class TwilioSMSProvider implements SMSProvider {
    name = "twilio";
    private accountSid: string;
    private authToken: string;

    constructor(accountSid: string, authToken: string) {
        this.accountSid = accountSid;
        this.authToken = authToken;
    }

    async sendSMS(message: SMSMessage): Promise<SMSSendResult> {
        logger.info(
            {
                to: message.to,
                from: message.from,
            },
            "📱 [Twilio] Sending SMS"
        );

        try {
            const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString(
                "base64"
            );

            const response = await fetch(
                `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Basic ${auth}`,
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: new URLSearchParams({
                        To: message.to,
                        From: message.from,
                        Body: message.body,
                    }),
                }
            );

            if (!response.ok) {
                const error = await response.json();
                logger.error(
                    { error, status: response.status, to: message.to },
                    "❌ [Twilio] SMS send failed"
                );
                return { success: false, error: `Twilio error: ${error.message}` };
            }

            const result = await response.json();

            logger.info(
                { sid: result.sid, to: message.to },
                "✅ [Twilio] SMS sent successfully"
            );

            return {
                success: true,
                provider_message_id: result.sid,
            };
        } catch (error) {
            logger.error({ error, to: message.to }, "❌ [Twilio] SMS send error");
            return { success: false, error: String(error) };
        }
    }

    verifyWebhook(body: unknown, signature: string): boolean {
        // Twilio webhook verification would go here
        // For now, return true (implement proper verification in production)
        return true;
    }

    processWebhookEvent(body: unknown): SMSWebhookEvent | null {
        const event = body as Record<string, unknown>;

        if (!event || typeof event !== "object") {
            return null;
        }

        const status = event.MessageStatus as string;
        const eventType = this.mapTwilioStatus(status);

        if (!eventType) {
            return null;
        }

        return {
            provider_message_id: event.MessageSid as string,
            event_type: eventType,
            phone: event.To as string,
            timestamp: new Date().toISOString(),
            metadata: event,
        };
    }

    private mapTwilioStatus(
        status: string
    ): "delivered" | "failed" | "unsubscribed" | null {
        const mapping: Record<string, "delivered" | "failed" | "unsubscribed"> = {
            delivered: "delivered",
            sent: "delivered",
            failed: "failed",
            undelivered: "failed",
        };

        return mapping[status] || null;
    }
}

/**
 * Get configured SMS provider.
 *
 * Returns appropriate provider based on environment configuration.
 */
export function getSMSProvider(): SMSProvider {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuth = process.env.TWILIO_AUTH_TOKEN;

    if (twilioSid && twilioAuth) {
        logger.info({}, "📱 Using Twilio SMS provider");
        return new TwilioSMSProvider(twilioSid, twilioAuth);
    }

    logger.info({}, "📱 Using Console SMS provider (development mode)");
    return new ConsoleSMSProvider();
}
