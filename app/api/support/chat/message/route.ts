/**
 * Support Chat Message API
 * Sends messages to Anthropic Claude and returns responses
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { sendMessageAndGetResponse } from "@/lib/claude/support-chat-client";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
    const requestLogger = logger.child({ handler: "send-support-message" });

    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { threadId, message, contextPage, pageContext, businessContext } =
            await request.json();

        // Build comprehensive system prompt for Claude
        let systemPrompt = `You are Genie AI, a helpful assistant for the Genie funnel builder platform.

User is currently on: ${contextPage}`;

        // Add page context if provided
        if (pageContext) {
            systemPrompt += `\n\n=== PAGE CONTEXT ===\n${pageContext}`;
        }

        // Add business context if provided
        if (businessContext) {
            systemPrompt += `\n\n${businessContext}`;
        }

        systemPrompt += `

=== CAPABILITIES ===
1. Answer questions about the current page and process
2. Help users fill in forms by asking for information conversationally
3. Provide guidance on funnel building steps
4. Access user's business data to provide personalized help
5. Suggest actions and next steps

=== FORM FILLING ===
When helping users fill in forms, ask for information naturally in conversation.
As they provide information, suggest which fields to fill.
Use this format to indicate field fills: [FILL:formId:fieldId:value]

=== ACTIONS ===
You can trigger actions using: [ACTION:actionId:param1:param2]
Available actions are listed in the page context above.

Be conversational, helpful, and proactive. If you see the user is on a form page,
offer to help them fill it in by asking relevant questions about their business.`;

        // Send message and get Claude's response
        const responseText = await sendMessageAndGetResponse(
            threadId,
            message,
            systemPrompt
        );

        requestLogger.info(
            { userId: user.id, threadId },
            "Support message processed successfully"
        );

        return NextResponse.json({
            response: responseText,
        });
    } catch (error) {
        requestLogger.error({ error }, "Failed to send message");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "POST /api/support/chat/message",
            },
        });

        return NextResponse.json({ error: "Failed to get response" }, { status: 500 });
    }
}
