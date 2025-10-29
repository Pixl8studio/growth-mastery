/**
 * Support Chat Message API
 * Sends messages to OpenAI Assistant and returns responses
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
    sendMessage,
    runAssistant,
    getRunStatus,
    getMessages,
} from "@/lib/openai/assistants-client";
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

        // Send user message
        await sendMessage(threadId, message);

        // Build comprehensive context for assistant
        let contextInstructions = `User is currently on: ${contextPage}`;

        // Add page context if provided
        if (pageContext) {
            contextInstructions += `\n\n=== PAGE CONTEXT ===\n${pageContext}`;
        }

        // Add business context if provided
        if (businessContext) {
            contextInstructions += `\n\n${businessContext}`;
        }

        contextInstructions += `\n\n=== INSTRUCTIONS ===
You are Genie AI, a helpful assistant for the Genie funnel builder platform.

CAPABILITIES:
1. Answer questions about the current page and process
2. Help users fill in forms by asking for information conversationally
3. Provide guidance on funnel building steps
4. Access user's business data to provide personalized help
5. Suggest actions and next steps

FORM FILLING:
When helping users fill in forms, ask for information naturally in conversation.
As they provide information, suggest which fields to fill.
Use this format to indicate field fills: [FILL:formId:fieldId:value]

ACTIONS:
You can trigger actions using: [ACTION:actionId:param1:param2]
Available actions are listed in the page context above.

Be conversational, helpful, and proactive. If you see the user is on a form page,
offer to help them fill it in by asking relevant questions about their business.`;

        // Run assistant with enhanced context
        const runId = await runAssistant(threadId, contextInstructions);

        // Poll for completion (with timeout)
        let attempts = 0;
        while (attempts < 30) {
            const run = await getRunStatus(threadId, runId);

            if (run.status === "completed") {
                const messages = await getMessages(threadId);
                const lastMessage = messages[0];

                const responseText =
                    lastMessage.content[0].type === "text"
                        ? lastMessage.content[0].text.value
                        : "";

                return NextResponse.json({
                    response: responseText,
                });
            }

            if (run.status === "failed") {
                throw new Error("Assistant run failed");
            }

            await new Promise((resolve) => setTimeout(resolve, 1000));
            attempts++;
        }

        throw new Error("Assistant response timeout");
    } catch (error) {
        requestLogger.error({ error }, "Failed to send message");
        return NextResponse.json({ error: "Failed to get response" }, { status: 500 });
    }
}
