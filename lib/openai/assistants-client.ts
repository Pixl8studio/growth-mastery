/**
 * OpenAI Assistants API Client
 * Manages chat threads for in-app help system
 */

import OpenAI from "openai";
import { env } from "@/lib/env";

export const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
});

/**
 * Create a new conversation thread
 */
export async function createThread() {
    const thread = await openai.beta.threads.create();
    return thread.id;
}

/**
 * Send a user message to a thread
 */
export async function sendMessage(threadId: string, content: string) {
    await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content,
    });
}

/**
 * Run the assistant on a thread with optional context
 */
export async function runAssistant(threadId: string, contextPage?: string) {
    const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: env.OPENAI_ASSISTANT_ID!,
        additional_instructions: contextPage
            ? `User is currently on: ${contextPage}. Provide contextual help for this page.`
            : undefined,
    });
    return run.id;
}

/**
 * Get the status of a run
 */
export async function getRunStatus(threadId: string, runId: string) {
    return await openai.beta.threads.runs.retrieve(threadId, runId);
}

/**
 * Get all messages from a thread
 */
export async function getMessages(threadId: string) {
    const messages = await openai.beta.threads.messages.list(threadId);
    return messages.data;
}
