/**
 * OpenAI Assistants API Client
 * Manages chat threads for in-app help system
 */

import OpenAI from "openai";
import { env } from "@/lib/env";

let openaiInstance: OpenAI | null = null;

/**
 * Get OpenAI client instance (lazy initialization)
 * Only initializes when actually needed, preventing build-time errors
 */
function getOpenAIClient(): OpenAI {
    if (!openaiInstance) {
        if (!env.OPENAI_API_KEY) {
            throw new Error(
                "OPENAI_API_KEY is not configured. Please add it to your environment variables."
            );
        }
        openaiInstance = new OpenAI({
            apiKey: env.OPENAI_API_KEY,
        });
    }
    return openaiInstance;
}

/**
 * Create a new conversation thread
 */
export async function createThread() {
    const openai = getOpenAIClient();
    const thread = await openai.beta.threads.create();
    return thread.id;
}

/**
 * Send a user message to a thread
 */
export async function sendMessage(threadId: string, content: string) {
    const openai = getOpenAIClient();
    await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content,
    });
}

/**
 * Run the assistant on a thread with optional context
 */
export async function runAssistant(threadId: string, additionalInstructions?: string) {
    const openai = getOpenAIClient();
    if (!env.OPENAI_ASSISTANT_ID) {
        throw new Error(
            "OPENAI_ASSISTANT_ID is not configured. Please add it to your environment variables."
        );
    }
    const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: env.OPENAI_ASSISTANT_ID,
        additional_instructions: additionalInstructions,
    });
    return run.id;
}

/**
 * Get the status of a run
 */
export async function getRunStatus(threadId: string, runId: string) {
    const openai = getOpenAIClient();
    return await openai.beta.threads.runs.retrieve(runId, { thread_id: threadId });
}

/**
 * Get all messages from a thread
 */
export async function getMessages(threadId: string) {
    const openai = getOpenAIClient();
    const messages = await openai.beta.threads.messages.list(threadId);
    return messages.data;
}
