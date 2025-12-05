/**
 * Email Provider Abstraction
 *
 * Unified interface for email providers (SendGrid, Postmark, etc.).
 * Handles actual email sending, tracking, and webhook processing.
 */

import { logger } from "@/lib/logger";

export interface EmailMessage {
    to: string;
    from: string;
    subject: string;
    html_body: string;
    text_body?: string;
    reply_to?: string;
    tracking_enabled?: boolean;
    metadata?: Record<string, unknown>;
}

export interface EmailSendResult {
    success: boolean;
    provider_message_id?: string;
    error?: string;
}

export interface EmailProvider {
    name: string;
    sendEmail(message: EmailMessage): Promise<EmailSendResult>;
    verifyWebhook(body: unknown, signature: string): boolean;
    processWebhookEvent(body: unknown): EmailWebhookEvent | null;
}

export interface EmailWebhookEvent {
    provider_message_id: string;
    event_type:
        | "delivered"
        | "opened"
        | "clicked"
        | "bounced"
        | "complained"
        | "unsubscribed";
    email: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
}

/**
 * Console Email Provider (for testing)
 *
 * Logs emails to console instead of sending.
 * Useful for development and testing.
 */
export class ConsoleEmailProvider implements EmailProvider {
    name = "console";

    async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
        logger.info(
            {
                to: message.to,
                from: message.from,
                subject: message.subject,
                bodyLength: message.html_body.length,
            },
            "📧 [Console] Email would be sent"
        );

        console.log("=".repeat(80));
        console.log(`To: ${message.to}`);
        console.log(`From: ${message.from}`);
        console.log(`Subject: ${message.subject}`);
        console.log("=".repeat(80));
        console.log(message.html_body);
        console.log("=".repeat(80));

        return {
            success: true,
            provider_message_id: `console-${Date.now()}-${Math.random().toString(36).substring(7)}`,
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
 * SendGrid Email Provider
 *
 * Integration with SendGrid API for production email delivery.
 * Requires SENDGRID_API_KEY environment variable.
 */
export class SendGridEmailProvider implements EmailProvider {
    name = "sendgrid";
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
        logger.info(
            {
                to: message.to,
                from: message.from,
                subject: message.subject,
            },
            "📧 [SendGrid] Sending email"
        );

        try {
            const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    personalizations: [
                        {
                            to: [{ email: message.to }],
                            custom_args: message.metadata || {},
                        },
                    ],
                    from: { email: message.from },
                    reply_to: message.reply_to
                        ? { email: message.reply_to }
                        : undefined,
                    subject: message.subject,
                    content: [
                        {
                            type: "text/html",
                            value: message.html_body,
                        },
                        message.text_body
                            ? {
                                  type: "text/plain",
                                  value: message.text_body,
                              }
                            : null,
                    ].filter(Boolean),
                    tracking_settings: {
                        click_tracking: { enable: message.tracking_enabled ?? true },
                        open_tracking: { enable: message.tracking_enabled ?? true },
                    },
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                logger.error(
                    { error, status: response.status, to: message.to },
                    "❌ [SendGrid] Email send failed"
                );
                return { success: false, error: `SendGrid error: ${error}` };
            }

            // SendGrid returns message ID in X-Message-Id header
            const messageId = response.headers.get("X-Message-Id");

            logger.info(
                { messageId, to: message.to },
                "✅ [SendGrid] Email sent successfully"
            );

            return {
                success: true,
                provider_message_id: messageId || undefined,
            };
        } catch (error) {
            logger.error({ error, to: message.to }, "❌ [SendGrid] Email send error");
            return { success: false, error: String(error) };
        }
    }

    verifyWebhook(_body: unknown, _signature: string): boolean {
        // SendGrid webhook verification would go here
        // For now, return true (implement proper verification in production)
        return true;
    }

    processWebhookEvent(body: unknown): EmailWebhookEvent | null {
        const event = body as Record<string, unknown>;

        if (!event || typeof event !== "object") {
            return null;
        }

        const eventType = this.mapSendGridEvent(event.event as string);
        if (!eventType) {
            return null;
        }

        return {
            provider_message_id: event.sg_message_id as string,
            event_type: eventType,
            email: event.email as string,
            timestamp: new Date((event.timestamp as number) * 1000).toISOString(),
            metadata: event as Record<string, unknown>,
        };
    }

    private mapSendGridEvent(
        event: string
    ):
        | "delivered"
        | "opened"
        | "clicked"
        | "bounced"
        | "complained"
        | "unsubscribed"
        | null {
        const mapping: Record<
            string,
            | "delivered"
            | "opened"
            | "clicked"
            | "bounced"
            | "complained"
            | "unsubscribed"
        > = {
            delivered: "delivered",
            open: "opened",
            click: "clicked",
            bounce: "bounced",
            dropped: "bounced",
            spamreport: "complained",
            unsubscribe: "unsubscribed",
        };

        return mapping[event] || null;
    }
}

/**
 * Get configured email provider.
 *
 * Returns appropriate provider based on agent configuration and environment.
 * Priority: Mailgun (if domain configured) > Gmail (if connected) > SendGrid (if API key set) > Console (dev mode)
 */
export async function getEmailProvider(
    agentConfigId?: string,
    funnelProjectId?: string
): Promise<EmailProvider> {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // First, check for Mailgun domain (highest priority)
    const mailgunApiKey = process.env.MAILGUN_API_KEY;
    if (mailgunApiKey) {
        try {
            // Get user ID from agent config or auth
            let userId: string | null = null;

            if (agentConfigId) {
                const { data: config } = await supabase
                    .from("followup_agent_configs")
                    .select("user_id")
                    .eq("id", agentConfigId)
                    .single();
                userId = config?.user_id || null;
            }

            if (!userId) {
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                userId = user?.id || null;
            }

            if (userId) {
                // Check for funnel-specific domain first, then account-wide
                const { data: domains } = await supabase
                    .from("email_domains")
                    .select("*")
                    .eq("user_id", userId)
                    .eq("verification_status", "verified")
                    .eq("is_active", true)
                    .or(
                        funnelProjectId
                            ? `funnel_project_id.eq.${funnelProjectId},funnel_project_id.is.null`
                            : "funnel_project_id.is.null"
                    )
                    .order("funnel_project_id", { ascending: false }) // Funnel-specific first
                    .limit(1);

                if (domains && domains.length > 0) {
                    const domain = domains[0];
                    logger.info(
                        { domain: domain.full_domain, funnelProjectId },
                        "📧 Using Mailgun email provider"
                    );
                    const { MailgunEmailProvider } = await import("./mailgun-provider");
                    const region = (process.env.MAILGUN_REGION || "us") as "us" | "eu";
                    return new MailgunEmailProvider(
                        mailgunApiKey,
                        domain.full_domain,
                        region
                    );
                }
            }
        } catch (error) {
            logger.error(
                { error },
                "❌ Failed to check for Mailgun domain, falling back"
            );
        }
    }

    // If agent config provided, check for Gmail connection
    if (agentConfigId) {
        const { data: config } = await supabase
            .from("followup_agent_configs")
            .select("email_provider_type, gmail_user_email")
            .eq("id", agentConfigId)
            .single();

        if (config?.email_provider_type === "gmail" && config.gmail_user_email) {
            logger.info({ agentConfigId }, "📧 Using Gmail email provider");
            const { GmailEmailProvider } = await import("./gmail-provider");
            return new GmailEmailProvider(agentConfigId);
        }
    }

    // Fall back to SendGrid or Console
    const sendgridKey = process.env.SENDGRID_API_KEY;

    if (sendgridKey) {
        logger.info({}, "📧 Using SendGrid email provider");
        return new SendGridEmailProvider(sendgridKey);
    }

    logger.info({}, "📧 Using Console email provider (development mode)");
    return new ConsoleEmailProvider();
}
