/**
 * Gmail Email Provider
 *
 * Sends emails through user's Gmail account via OAuth.
 * Uses Gmail API to send emails with full Gmail deliverability.
 */

import { logger } from "@/lib/logger";
import type {
    EmailMessage,
    EmailProvider,
    EmailSendResult,
    EmailWebhookEvent,
} from "./email-provider";
import { getValidGmailToken } from "../gmail-oauth-service";

export class GmailEmailProvider implements EmailProvider {
    name = "gmail";
    private agentConfigId: string;

    constructor(agentConfigId: string) {
        this.agentConfigId = agentConfigId;
    }

    async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
        logger.info(
            {
                to: message.to,
                from: message.from,
                subject: message.subject,
                agentConfigId: this.agentConfigId,
            },
            "📧 [Gmail] Sending email"
        );

        try {
            // Get valid access token (refreshes if needed)
            const { access_token, user_email } = await getValidGmailToken(
                this.agentConfigId
            );

            // Create email in RFC 2822 format
            const emailContent = this.createEmailContent(message, user_email);

            // Encode email in base64url format (required by Gmail API)
            const encodedEmail = Buffer.from(emailContent)
                .toString("base64")
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
                .replace(/=+$/, "");

            // Send via Gmail API
            const response = await fetch(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${access_token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        raw: encodedEmail,
                    }),
                }
            );

            if (!response.ok) {
                const error = await response.text();
                logger.error(
                    { error, status: response.status, to: message.to },
                    "❌ [Gmail] Email send failed"
                );
                return { success: false, error: `Gmail error: ${error}` };
            }

            const result = await response.json();

            logger.info(
                { messageId: result.id, to: message.to },
                "✅ [Gmail] Email sent successfully"
            );

            return {
                success: true,
                provider_message_id: result.id,
            };
        } catch (error) {
            logger.error({ error, to: message.to }, "❌ [Gmail] Email send error");
            return { success: false, error: String(error) };
        }
    }

    /**
     * Create RFC 2822 formatted email content
     */
    private createEmailContent(message: EmailMessage, fromEmail: string): string {
        const from = message.from || fromEmail;
        const lines = [
            `From: ${from}`,
            `To: ${message.to}`,
            `Subject: ${message.subject}`,
            "MIME-Version: 1.0",
            'Content-Type: multipart/alternative; boundary="boundary"',
        ];

        if (message.reply_to) {
            lines.push(`Reply-To: ${message.reply_to}`);
        }

        // Add custom headers for tracking metadata
        if (message.metadata) {
            for (const [key, value] of Object.entries(message.metadata)) {
                lines.push(`X-Metadata-${key}: ${String(value)}`);
            }
        }

        lines.push(""); // Empty line between headers and body

        // Add multipart body (text and HTML versions)
        lines.push("--boundary");
        lines.push("Content-Type: text/plain; charset=UTF-8");
        lines.push("");
        lines.push(message.text_body || this.htmlToText(message.html_body));
        lines.push("");
        lines.push("--boundary");
        lines.push("Content-Type: text/html; charset=UTF-8");
        lines.push("");
        lines.push(message.html_body);
        lines.push("");
        lines.push("--boundary--");

        return lines.join("\r\n");
    }

    /**
     * Simple HTML to text conversion
     */
    private htmlToText(html: string): string {
        return html
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<\/p>/gi, "\n\n")
            .replace(/<[^>]+>/g, "")
            .trim();
    }

    verifyWebhook(): boolean {
        // Gmail doesn't provide webhooks for sent email tracking
        // Would need to use Gmail push notifications API if needed
        return true;
    }

    processWebhookEvent(): EmailWebhookEvent | null {
        // Gmail doesn't provide webhooks for sent email tracking
        // Would need to use Gmail push notifications API if needed
        return null;
    }
}
