/**
 * Claude Support Chat Client
 * Manages chat threads for in-app help system using Claude API
 * Replaces OpenAI Assistants API with Claude messages API
 */

import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "crypto";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

let anthropicInstance: Anthropic | null = null;

/**
 * Get Anthropic client instance (lazy initialization)
 */
function getAnthropicClient(): Anthropic {
    if (!anthropicInstance) {
        if (!env.ANTHROPIC_API_KEY) {
            throw new Error(
                "ANTHROPIC_API_KEY is not configured. Please add it to your environment variables."
            );
        }
        anthropicInstance = new Anthropic({
            apiKey: env.ANTHROPIC_API_KEY,
        });
    }
    return anthropicInstance;
}

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: string;
}

export interface ThreadData {
    id: string;
    messages: ChatMessage[];
    created_at: string;
}

/**
 * Create a new conversation thread
 * Returns a unique thread ID (UUID)
 */
export async function createThread(): Promise<string> {
    return randomUUID();
}

/**
 * Store a message in the support thread
 * Uses Supabase metadata JSONB column to persist conversation history
 */
async function storeMessage(
    threadId: string,
    role: "user" | "assistant",
    content: string
): Promise<void> {
    const supabase = await createClient();

    // Get existing messages from the thread metadata
    const { data: interaction } = await supabase
        .from("support_interactions")
        .select("metadata")
        .eq("assistant_thread_id", threadId)
        .single();

    const existingMetadata = interaction?.metadata || {};
    const existingMessages: ChatMessage[] = existingMetadata.chat_messages || [];

    // Add new message
    const newMessages = [
        ...existingMessages,
        {
            role,
            content,
            timestamp: new Date().toISOString(),
        },
    ];

    // Update the thread metadata with new messages
    await supabase
        .from("support_interactions")
        .update({
            metadata: { ...existingMetadata, chat_messages: newMessages },
            updated_at: new Date().toISOString(),
        })
        .eq("assistant_thread_id", threadId);
}

/**
 * Get messages from a thread
 */
async function getThreadMessages(threadId: string): Promise<ChatMessage[]> {
    const supabase = await createClient();

    const { data: interaction } = await supabase
        .from("support_interactions")
        .select("metadata")
        .eq("assistant_thread_id", threadId)
        .single();

    return interaction?.metadata?.chat_messages || [];
}

/**
 * Send a user message and get Claude's response
 * This replaces the sendMessage + runAssistant + getMessages flow from OpenAI
 */
export async function sendMessageAndGetResponse(
    threadId: string,
    message: string,
    systemInstructions: string
): Promise<string> {
    const requestLogger = logger.child({ threadId, handler: "claude-support-chat" });

    try {
        // Store the user message
        await storeMessage(threadId, "user", message);

        // Get conversation history
        const messages = await getThreadMessages(threadId);

        // Convert to Anthropic message format
        const anthropicMessages: Anthropic.MessageParam[] = messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
        }));

        // Call Claude
        const anthropic = getAnthropicClient();
        const response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2000,
            system: systemInstructions,
            messages: anthropicMessages,
        });

        // Extract text response
        const contentBlock = response.content[0];
        if (contentBlock.type !== "text") {
            throw new Error("Unexpected response type from Claude");
        }

        const responseText = contentBlock.text;

        // Store assistant response
        await storeMessage(threadId, "assistant", responseText);

        requestLogger.info(
            {
                inputTokens: response.usage.input_tokens,
                outputTokens: response.usage.output_tokens,
            },
            "Claude support chat response generated"
        );

        return responseText;
    } catch (error) {
        requestLogger.error({ error }, "Failed to get Claude response");
        throw error;
    }
}

/**
 * Legacy compatibility - send message only (for gradual migration)
 * Just stores the message without getting a response
 */
export async function sendMessage(threadId: string, content: string): Promise<void> {
    await storeMessage(threadId, "user", content);
}

/**
 * Legacy compatibility - get all messages from thread
 */
export async function getMessages(threadId: string): Promise<ChatMessage[]> {
    return getThreadMessages(threadId);
}
