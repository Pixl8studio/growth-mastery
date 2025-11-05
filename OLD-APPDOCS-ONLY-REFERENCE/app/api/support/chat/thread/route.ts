/**
 * Support Chat Thread API
 * Creates new OpenAI Assistant thread for help conversations
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createThread } from "@/lib/openai/assistants-client";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
    const requestLogger = logger.child({ handler: "create-support-thread" });

    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { contextPage } = await request.json();

        // Create OpenAI thread
        const threadId = await createThread();

        // Log support interaction
        await supabase.from("support_interactions").insert({
            user_id: user.id,
            interaction_type: "chat",
            context_page: contextPage,
            assistant_thread_id: threadId,
        });

        requestLogger.info(
            { userId: user.id, threadId, contextPage },
            "Created help chat thread"
        );

        return NextResponse.json({ threadId });
    } catch (error) {
        requestLogger.error({ error }, "Failed to create chat thread");
        return NextResponse.json({ error: "Failed to create chat" }, { status: 500 });
    }
}
