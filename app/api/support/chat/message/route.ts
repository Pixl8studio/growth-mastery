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

        const { threadId, message, contextPage } = await request.json();

        // Send user message
        await sendMessage(threadId, message);

        // Run assistant
        const runId = await runAssistant(threadId, contextPage);

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
