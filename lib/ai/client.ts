/**
 * OpenAI Client
 * Wrapper around OpenAI API for funnel content generation
 */

import OpenAI from "openai";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { retry } from "@/lib/utils";
import { AI_CONFIG } from "@/lib/config";
import type { AIGenerationOptions } from "./types";

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

// Export as 'openai' for backward compatibility
export const openai = new Proxy({} as OpenAI, {
    get(_target, prop) {
        return (getOpenAIClient() as any)[prop];
    },
});

/**
 * Generate content with OpenAI and parse JSON response
 * Includes retry logic and token tracking
 */
export async function generateWithAI<T>(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    options?: AIGenerationOptions
): Promise<T> {
    const model = options?.model || AI_CONFIG.models.default;
    const temperature = options?.temperature ?? AI_CONFIG.defaultTemperature;
    const maxTokens = options?.maxTokens || AI_CONFIG.defaultMaxTokens;

    const requestLogger = logger.child({ model, temperature, maxTokens });
    requestLogger.info("Generating content with OpenAI");

    try {
        const result = await retry(
            async () => {
                const completion = await openai.chat.completions.create({
                    model,
                    messages,
                    temperature,
                    max_tokens: maxTokens,
                    response_format: { type: "json_object" },
                });

                const content = completion.choices[0]?.message?.content;

                if (!content) {
                    throw new Error("No content returned from OpenAI");
                }

                requestLogger.info(
                    {
                        tokensUsed: completion.usage?.total_tokens,
                        promptTokens: completion.usage?.prompt_tokens,
                        completionTokens: completion.usage?.completion_tokens,
                    },
                    "OpenAI generation successful"
                );

                return JSON.parse(content) as T;
            },
            {
                maxAttempts: 3,
                delayMs: 1000,
                backoffMultiplier: 2,
            }
        );

        return result;
    } catch (error) {
        requestLogger.error({ error, model }, "Failed to generate content with OpenAI");
        throw new Error(
            `AI generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

/**
 * Generate text content without JSON parsing
 * For free-form text generation
 */
export async function generateTextWithAI(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    options?: AIGenerationOptions
): Promise<string> {
    const model = options?.model || AI_CONFIG.models.default;
    const temperature = options?.temperature ?? AI_CONFIG.defaultTemperature;
    const maxTokens = options?.maxTokens || AI_CONFIG.defaultMaxTokens;

    const requestLogger = logger.child({ model, temperature, maxTokens });
    requestLogger.info("Generating text with OpenAI");

    try {
        const result = await retry(
            async () => {
                const completion = await openai.chat.completions.create({
                    model,
                    messages,
                    temperature,
                    max_tokens: maxTokens,
                });

                const content = completion.choices[0]?.message?.content;

                if (!content) {
                    throw new Error("No content returned from OpenAI");
                }

                requestLogger.info(
                    {
                        tokensUsed: completion.usage?.total_tokens,
                        promptTokens: completion.usage?.prompt_tokens,
                        completionTokens: completion.usage?.completion_tokens,
                    },
                    "OpenAI text generation successful"
                );

                return content;
            },
            {
                maxAttempts: 3,
                delayMs: 1000,
                backoffMultiplier: 2,
            }
        );

        return result;
    } catch (error) {
        requestLogger.error({ error, model }, "Failed to generate text with OpenAI");
        throw new Error(
            `AI text generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

/**
 * Estimate token count for a string (rough approximation)
 * More accurate: use tiktoken library
 */
export function estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
}
