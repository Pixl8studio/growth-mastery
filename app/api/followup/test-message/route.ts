/**
 * Test Message API Endpoint
 *
 * POST /api/followup/test-message
 * Sends a test email or SMS to verify sender configuration.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import { getEmailProvider } from "@/lib/followup/providers/email-provider";
import { getSMSProvider } from "@/lib/followup/providers/sms-provider";

const SAMPLE_PROSPECT_DATA = {
    first_name: "Sarah",
    watch_pct: "75",
    minutes: "45",
    challenge_notes: "scaling their business",
    goal_notes: "reach 7 figures",
    offer_link: "https://example.com/offer",
    replay_link: "https://example.com/replay",
    booking_link: "https://example.com/book",
    offer_title: "Business Accelerator Program",
};

/**
 * Replace tokens in message content with sample data.
 */
function interpolateTestTokens(content: string, senderName: string): string {
    let interpolated = content;

    const data = {
        ...SAMPLE_PROSPECT_DATA,
        sender_name: senderName,
    };

    Object.entries(data).forEach(([key, value]) => {
        const regex = new RegExp(`\\{${key}\\}`, "g");
        interpolated = interpolated.replace(regex, value);
    });

    return interpolated;
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        const body = await request.json();

        if (!body.agent_config_id) {
            throw new ValidationError("agent_config_id is required");
        }

        if (!body.channel || !["email", "sms"].includes(body.channel)) {
            throw new ValidationError("channel must be 'email' or 'sms'");
        }

        // Verify ownership of agent config
        const { data: config } = await supabase
            .from("followup_agent_configs")
            .select("user_id, sender_name, sender_email, sender_verified")
            .eq("id", body.agent_config_id)
            .single();

        if (!config || config.user_id !== user.id) {
            throw new AuthenticationError("Access denied to agent config");
        }

        logger.info(
            {
                userId: user.id,
                agentConfigId: body.agent_config_id,
                channel: body.channel,
            },
            "📤 Sending test message"
        );

        // Generate test message content
        const senderName = config.sender_name || "Your Follow-Up Team";
        const testSubject = interpolateTestTokens(
            "🧪 Test Message: Your AI Follow-Up Engine is Working!",
            senderName
        );
        const testBody = interpolateTestTokens(
            `Hi {first_name},

This is a test message from your AI Follow-Up Engine to verify everything is configured correctly.

📊 Sample Data Used:
- Watch Percentage: {watch_pct}%
- Watch Time: {minutes} minutes
- Challenge: {challenge_notes}
- Goal: {goal_notes}

🔗 Sample Links:
- Offer Link: {offer_link}
- Replay Link: {replay_link}
- Booking Link: {booking_link}

✅ If you're reading this, your ${body.channel.toUpperCase()} configuration is working perfectly!

Next steps:
1. Review your message templates
2. Set up your sequences
3. Enable automation when ready

Best regards,
{sender_name}

---
This is a test message. Unsubscribe functionality will work in production messages.`,
            senderName
        );

        // Send via appropriate channel
        if (body.channel === "email") {
            // Validate email configuration
            if (!config.sender_verified) {
                throw new ValidationError(
                    "Domain not verified. Please verify your sender domain first."
                );
            }

            const recipientEmail = body.recipient_email || user.email;

            if (!recipientEmail) {
                throw new ValidationError("Recipient email is required");
            }

            const emailProvider = getEmailProvider();
            const fromEmail =
                config.sender_email ||
                process.env.FOLLOWUP_FROM_EMAIL ||
                "test@example.com";

            const result = await emailProvider.sendEmail({
                to: recipientEmail,
                from: fromEmail,
                subject: testSubject,
                html_body: testBody.replace(/\n/g, "<br />"),
                text_body: testBody,
                tracking_enabled: false, // Disable tracking for test messages
                metadata: {
                    test_message: true,
                    agent_config_id: body.agent_config_id,
                },
            });

            if (!result.success) {
                throw new Error(result.error || "Email send failed");
            }

            logger.info(
                { providerId: result.provider_message_id, to: recipientEmail },
                "✅ Test email sent"
            );

            return NextResponse.json({
                success: true,
                channel: "email",
                delivery_id: result.provider_message_id,
                message: "Test email sent successfully",
            });
        } else if (body.channel === "sms") {
            const recipientPhone = body.recipient_phone;

            if (!recipientPhone) {
                throw new ValidationError("Recipient phone is required for SMS");
            }

            const smsProvider = getSMSProvider();
            const fromPhone =
                process.env.TWILIO_PHONE_NUMBER ||
                process.env.FOLLOWUP_FROM_PHONE ||
                "+15555551234";

            // Shorten for SMS
            const smsBody = testBody
                .replace(/<[^>]*>/g, "")
                .substring(0, 320)
                .concat("\n\n[Test Message]");

            const result = await smsProvider.sendSMS({
                to: recipientPhone,
                from: fromPhone,
                body: smsBody,
                metadata: {
                    test_message: true,
                    agent_config_id: body.agent_config_id,
                },
            });

            if (!result.success) {
                throw new Error(result.error || "SMS send failed");
            }

            logger.info(
                { providerId: result.provider_message_id, to: recipientPhone },
                "✅ Test SMS sent"
            );

            return NextResponse.json({
                success: true,
                channel: "sms",
                delivery_id: result.provider_message_id,
                message: "Test SMS sent successfully",
            });
        }

        throw new ValidationError("Invalid channel");
    } catch (error) {
        logger.error({ error }, "❌ Error in POST /api/followup/test-message");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
