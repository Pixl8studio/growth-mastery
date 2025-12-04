/**
 * Mailgun Email Provider
 *
 * Integration with Mailgun API for white-label email delivery.
 * Supports custom domain sending with DNS verification.
 */

import { logger } from "@/lib/logger";
import type {
    EmailProvider,
    EmailMessage,
    EmailSendResult,
    EmailWebhookEvent,
} from "./email-provider";
import type { MailgunDomainResponse } from "@/types/integrations";
import crypto from "crypto";

export class MailgunEmailProvider implements EmailProvider {
    name = "mailgun";
    private apiKey: string;
    private region: string;
    private domain: string;

    constructor(apiKey: string, domain: string, region: string = "us") {
        this.apiKey = apiKey;
        this.domain = domain;
        this.region = region;
    }

    private get baseUrl(): string {
        return this.region === "eu"
            ? "https://api.eu.mailgun.net/v3"
            : "https://api.mailgun.net/v3";
    }

    async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
        logger.info(
            {
                to: message.to,
                from: message.from,
                subject: message.subject,
                domain: this.domain,
            },
            "📧 [Mailgun] Sending email"
        );

        try {
            const formData = new FormData();
            formData.append("from", message.from);
            formData.append("to", message.to);
            formData.append("subject", message.subject);
            formData.append("html", message.html_body);

            if (message.text_body) {
                formData.append("text", message.text_body);
            }

            if (message.reply_to) {
                formData.append("h:Reply-To", message.reply_to);
            }

            // Add tracking
            if (message.tracking_enabled !== false) {
                formData.append("o:tracking", "yes");
                formData.append("o:tracking-clicks", "yes");
                formData.append("o:tracking-opens", "yes");
            }

            // Add metadata as custom variables
            if (message.metadata) {
                for (const [key, value] of Object.entries(message.metadata)) {
                    formData.append(`v:${key}`, String(value));
                }
            }

            const response = await fetch(`${this.baseUrl}/${this.domain}/messages`, {
                method: "POST",
                headers: {
                    Authorization: `Basic ${Buffer.from(`api:${this.apiKey}`).toString("base64")}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const error = await response.text();
                logger.error(
                    { error, status: response.status, to: message.to },
                    "❌ [Mailgun] Email send failed"
                );
                return { success: false, error: `Mailgun error: ${error}` };
            }

            const result = await response.json();

            logger.info(
                { messageId: result.id, to: message.to },
                "✅ [Mailgun] Email sent successfully"
            );

            return {
                success: true,
                provider_message_id: result.id,
            };
        } catch (error) {
            logger.error(
                { error, to: message.to },
                "❌ [Mailgun] Email send exception"
            );
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    verifyWebhook(body: unknown, _signature: string): boolean {
        try {
            const webhookSigningKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
            if (!webhookSigningKey) {
                logger.warn({}, "⚠️  Mailgun webhook signing key not configured");
                return false;
            }

            const payload = body as {
                signature?: {
                    timestamp?: string;
                    token?: string;
                    signature?: string;
                };
            };

            if (!payload.signature) {
                return false;
            }

            const { timestamp, token, signature: sig } = payload.signature;
            if (!timestamp || !token || !sig) {
                return false;
            }

            const encoded = crypto
                .createHmac("sha256", webhookSigningKey)
                .update(`${timestamp}${token}`)
                .digest("hex");

            return encoded === sig;
        } catch (error) {
            logger.error({ error }, "❌ [Mailgun] Webhook verification failed");
            return false;
        }
    }

    processWebhookEvent(body: unknown): EmailWebhookEvent | null {
        try {
            const event = body as {
                "event-data"?: {
                    event?: string;
                    message?: {
                        headers?: {
                            "message-id"?: string;
                        };
                    };
                    recipient?: string;
                    timestamp?: number;
                    "user-variables"?: Record<string, unknown>;
                };
            };

            const eventData = event["event-data"];
            if (!eventData) {
                return null;
            }

            const eventType = this.mapMailgunEvent(eventData.event || "");
            if (!eventType) {
                return null;
            }

            const messageId = eventData.message?.headers?.["message-id"] || "";
            const email = eventData.recipient || "";
            const timestamp = eventData.timestamp
                ? new Date(eventData.timestamp * 1000).toISOString()
                : new Date().toISOString();

            return {
                provider_message_id: messageId,
                event_type: eventType,
                email,
                timestamp,
                metadata: eventData["user-variables"] || {},
            };
        } catch (error) {
            logger.error({ error }, "❌ [Mailgun] Failed to process webhook event");
            return null;
        }
    }

    private mapMailgunEvent(
        event: string
    ):
        | "delivered"
        | "opened"
        | "clicked"
        | "bounced"
        | "complained"
        | "unsubscribed"
        | null {
        const mapping: Record<string, EmailWebhookEvent["event_type"]> = {
            delivered: "delivered",
            opened: "opened",
            clicked: "clicked",
            failed: "bounced",
            bounced: "bounced",
            complained: "complained",
            unsubscribed: "unsubscribed",
        };

        return mapping[event] || null;
    }

    /**
     * Domain Management Methods
     */

    async createDomain(domain: string): Promise<MailgunDomainResponse | null> {
        logger.info({ domain }, "🌐 [Mailgun] Creating domain");

        try {
            const formData = new FormData();
            formData.append("name", domain);
            formData.append("spam_action", "disabled");
            formData.append("wildcard", "false");

            const response = await fetch(`${this.baseUrl}/domains`, {
                method: "POST",
                headers: {
                    Authorization: `Basic ${Buffer.from(`api:${this.apiKey}`).toString("base64")}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const error = await response.text();
                logger.error({ error, domain }, "❌ [Mailgun] Domain creation failed");
                return null;
            }

            const result = await response.json();
            logger.info({ domain }, "✅ [Mailgun] Domain created successfully");

            return result;
        } catch (error) {
            logger.error({ error, domain }, "❌ [Mailgun] Domain creation exception");
            return null;
        }
    }

    async getDomainInfo(domain: string): Promise<MailgunDomainResponse | null> {
        try {
            const response = await fetch(`${this.baseUrl}/domains/${domain}`, {
                method: "GET",
                headers: {
                    Authorization: `Basic ${Buffer.from(`api:${this.apiKey}`).toString("base64")}`,
                },
            });

            if (!response.ok) {
                const error = await response.text();
                logger.error(
                    { error, domain },
                    "❌ [Mailgun] Failed to get domain info"
                );
                return null;
            }

            const result = await response.json();
            return result;
        } catch (error) {
            logger.error({ error, domain }, "❌ [Mailgun] Get domain info exception");
            return null;
        }
    }

    async verifyDomain(domain: string): Promise<{
        verified: boolean;
        dns_records: { record_type: string; valid: boolean }[];
    } | null> {
        logger.info({ domain }, "🔍 [Mailgun] Verifying domain");

        try {
            // Trigger verification
            await fetch(`${this.baseUrl}/domains/${domain}/verify`, {
                method: "PUT",
                headers: {
                    Authorization: `Basic ${Buffer.from(`api:${this.apiKey}`).toString("base64")}`,
                },
            });

            // Get verification status
            const domainInfo = await this.getDomainInfo(domain);
            if (!domainInfo) {
                return null;
            }

            const sendingRecords = domainInfo.sending_dns_records || [];
            const receivingRecords = domainInfo.receiving_dns_records || [];
            const allRecords = [...sendingRecords, ...receivingRecords];

            const verified = allRecords.every(
                (record) => record.valid === "valid" || record.valid === "true"
            );

            logger.info(
                { domain, verified },
                "✅ [Mailgun] Domain verification checked"
            );

            return {
                verified,
                dns_records: allRecords.map((record) => ({
                    record_type: record.record_type,
                    valid: record.valid === "valid" || record.valid === "true",
                })),
            };
        } catch (error) {
            logger.error(
                { error, domain },
                "❌ [Mailgun] Domain verification exception"
            );
            return null;
        }
    }

    async deleteDomain(domain: string): Promise<boolean> {
        logger.info({ domain }, "🗑️  [Mailgun] Deleting domain");

        try {
            const response = await fetch(`${this.baseUrl}/domains/${domain}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Basic ${Buffer.from(`api:${this.apiKey}`).toString("base64")}`,
                },
            });

            if (!response.ok) {
                const error = await response.text();
                logger.error({ error, domain }, "❌ [Mailgun] Domain deletion failed");
                return false;
            }

            logger.info({ domain }, "✅ [Mailgun] Domain deleted successfully");
            return true;
        } catch (error) {
            logger.error({ error, domain }, "❌ [Mailgun] Domain deletion exception");
            return false;
        }
    }
}

/**
 * Get Mailgun email provider for a specific domain
 */
export async function getMailgunProvider(
    domain: string
): Promise<MailgunEmailProvider | null> {
    const apiKey = process.env.MAILGUN_API_KEY;
    const region = (process.env.MAILGUN_REGION || "us") as "us" | "eu";

    if (!apiKey) {
        logger.warn({}, "⚠️  Mailgun API key not configured");
        return null;
    }

    return new MailgunEmailProvider(apiKey, domain, region);
}
