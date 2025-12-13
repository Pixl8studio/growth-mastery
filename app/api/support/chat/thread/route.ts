/**
 * Support Chat Thread API
 * Creates new Claude chat thread for help conversations
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { createThread } from "@/lib/claude/support-chat-client";
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

        // Create Claude thread (local UUID)
        const threadId = await createThread();

        // Log support interaction with empty chat_messages in metadata for Claude
        await supabase.from("support_interactions").insert({
            user_id: user.id,
            interaction_type: "chat",
            context_page: contextPage,
            assistant_thread_id: threadId,
            metadata: { chat_messages: [] }, // Store messages in metadata JSONB
        });

        requestLogger.info(
            { userId: user.id, threadId, contextPage },
            "Created help chat thread"
        );

        return NextResponse.json({ threadId });
    } catch (error) {
        requestLogger.error({ error }, "Failed to create chat thread");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "POST /api/support/chat/thread",
            },
        });

        return NextResponse.json({ error: "Failed to create chat" }, { status: 500 });
    }
}
