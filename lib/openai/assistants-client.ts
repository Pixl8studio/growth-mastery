/**
 * Support Chat Client
 * Manages chat conversations for in-app help system using Anthropic Claude
 * Conversation history is stored in the database via API routes
 */

import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import { AI_CONFIG } from "@/lib/config";

let anthropicInstance: Anthropic | null = null;

/**
 * Get Anthropic client instance (lazy initialization)
 * Only initializes when actually needed, preventing build-time errors
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

// Message type for conversation history
export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: string;
}

/**
 * Create a new conversation thread
 * Returns a unique thread ID (UUID-like string)
 */
export async function createThread(): Promise<string> {
    // Generate a unique thread ID
    const threadId = `thread_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return threadId;
}

/**
 * Generate a support chat response using Anthropic Claude
 * Takes the full conversation history and returns the assistant's response
 */
export async function generateSupportResponse(
    messages: ChatMessage[],
    systemPrompt: string
): Promise<string> {
    const anthropic = getAnthropicClient();

    // Convert to Anthropic message format
    const anthropicMessages = messages.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
    }));

    const response = await anthropic.messages.create({
        model: AI_CONFIG.models.default,
        max_tokens: AI_CONFIG.defaultMaxTokens,
        temperature: AI_CONFIG.defaultTemperature,
        system: systemPrompt,
        messages: anthropicMessages,
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
        throw new Error("No text response from Anthropic");
    }

    return textBlock.text;
}

// Legacy exports for backward compatibility during migration
// These are no longer used but kept to prevent import errors

/**
 * @deprecated Use generateSupportResponse instead
 */
export async function sendMessage(_threadId: string, _content: string): Promise<void> {
    // No-op: Messages are now handled directly in the API route
}

/**
 * @deprecated Use generateSupportResponse instead
 */
export async function runAssistant(
    _threadId: string,
    _additionalInstructions?: string
): Promise<string> {
    // Returns a dummy run ID for backward compatibility
    return `run_${Date.now()}`;
}

/**
 * @deprecated Use generateSupportResponse instead
 */
export async function getRunStatus(
    _threadId: string,
    _runId: string
): Promise<{ status: string }> {
    // Always return completed since we now use synchronous responses
    return { status: "completed" };
}

/**
 * @deprecated Use generateSupportResponse instead
 */
export async function getMessages(_threadId: string): Promise<ChatMessage[]> {
    // Messages are now stored in the database
    return [];
}
