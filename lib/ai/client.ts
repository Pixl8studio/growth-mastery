/**
 * OpenAI Client
 * Wrapper around OpenAI API for funnel content generation
 */

import OpenAI from "openai";
import * as Sentry from "@sentry/nextjs";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { retry } from "@/lib/utils";
import { AI_CONFIG } from "@/lib/config";
import type {
    AIGenerationOptions,
    ImageGenerationOptions,
    GeneratedImage,
} from "./types";

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
        const result = await Sentry.startSpan(
            { op: "ai.openai.chat.completions", name: `OpenAI Chat: ${model}` },
            async (span) => {
                span.setAttribute("model", model);
                span.setAttribute("temperature", temperature);
                span.setAttribute("max_tokens", maxTokens);

                const completion = await retry(
                    async () => {
                        const response = await openai.chat.completions.create({
                            model,
                            messages,
                            temperature,
                            max_tokens: maxTokens,
                            response_format: { type: "json_object" },
                        });

                        const content = response.choices[0]?.message?.content;

                        if (!content) {
                            throw new Error("No content returned from OpenAI");
                        }

                        requestLogger.info(
                            {
                                tokensUsed: response.usage?.total_tokens,
                                promptTokens: response.usage?.prompt_tokens,
                                completionTokens: response.usage?.completion_tokens,
                            },
                            "OpenAI generation successful"
                        );

                        span.setAttribute("tokens_used", response.usage?.total_tokens ?? 0);
                        span.setAttribute(
                            "prompt_tokens",
                            response.usage?.prompt_tokens ?? 0
                        );
                        span.setAttribute(
                            "completion_tokens",
                            response.usage?.completion_tokens ?? 0
                        );

                        return JSON.parse(content) as T;
                    },
                    {
                        maxAttempts: 3,
                        delayMs: 1000,
                        backoffMultiplier: 2,
                    }
                );

                return completion;
            }
        );

        return result;
    } catch (error) {
        requestLogger.error({ error, model }, "Failed to generate content with OpenAI");

        Sentry.captureException(error, {
            tags: {
                service: "openai",
                operation: "chat_completions",
                model,
            },
            extra: {
                temperature,
                maxTokens,
                messageCount: messages.length,
            },
        });

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
        const result = await Sentry.startSpan(
            { op: "ai.openai.text.completions", name: `OpenAI Text: ${model}` },
            async (span) => {
                span.setAttribute("model", model);
                span.setAttribute("temperature", temperature);
                span.setAttribute("max_tokens", maxTokens);

                const completion = await retry(
                    async () => {
                        const response = await openai.chat.completions.create({
                            model,
                            messages,
                            temperature,
                            max_tokens: maxTokens,
                        });

                        const content = response.choices[0]?.message?.content;

                        if (!content) {
                            throw new Error("No content returned from OpenAI");
                        }

                        requestLogger.info(
                            {
                                tokensUsed: response.usage?.total_tokens,
                                promptTokens: response.usage?.prompt_tokens,
                                completionTokens: response.usage?.completion_tokens,
                            },
                            "OpenAI text generation successful"
                        );

                        span.setAttribute("tokens_used", response.usage?.total_tokens ?? 0);
                        span.setAttribute(
                            "prompt_tokens",
                            response.usage?.prompt_tokens ?? 0
                        );
                        span.setAttribute(
                            "completion_tokens",
                            response.usage?.completion_tokens ?? 0
                        );

                        return content;
                    },
                    {
                        maxAttempts: 3,
                        delayMs: 1000,
                        backoffMultiplier: 2,
                    }
                );

                return completion;
            }
        );

        return result;
    } catch (error) {
        requestLogger.error({ error, model }, "Failed to generate text with OpenAI");

        Sentry.captureException(error, {
            tags: {
                service: "openai",
                operation: "text_completions",
                model,
            },
            extra: {
                temperature,
                maxTokens,
                messageCount: messages.length,
            },
        });

        throw new Error(
            `AI text generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

/**
 * Generate image with DALL-E
 * Uses DALL-E 3 for high-quality image generation
 */
export async function generateImageWithAI(
    prompt: string,
    options?: ImageGenerationOptions
): Promise<GeneratedImage> {
    const size = options?.size || "1024x1024";
    const quality = options?.quality || "standard";
    const style = options?.style || "vivid";

    const requestLogger = logger.child({ model: "dall-e-3", size, quality, style });
    requestLogger.info(
        { prompt: prompt.substring(0, 100) },
        "Generating image with DALL-E"
    );

    try {
        const result = await Sentry.startSpan(
            { op: "ai.openai.image.generate", name: "DALL-E Image Generation" },
            async (span) => {
                span.setAttribute("model", "dall-e-3");
                span.setAttribute("size", size);
                span.setAttribute("quality", quality);
                span.setAttribute("style", style);

                const image = await retry(
                    async () => {
                        const response = await openai.images.generate({
                            model: "dall-e-3",
                            prompt,
                            n: 1,
                            size,
                            quality,
                            style,
                        });

                        if (!response.data || response.data.length === 0) {
                            throw new Error("No image returned from DALL-E");
                        }

                        const imageData = response.data[0];
                        if (!imageData.url) {
                            throw new Error("No image URL in DALL-E response");
                        }

                        requestLogger.info(
                            {
                                revisedPrompt: imageData.revised_prompt?.substring(0, 100),
                            },
                            "DALL-E image generation successful"
                        );

                        return {
                            url: imageData.url,
                            revisedPrompt: imageData.revised_prompt,
                        };
                    },
                    {
                        maxAttempts: 2, // DALL-E is slower, reduce retries
                        delayMs: 2000,
                        backoffMultiplier: 2,
                    }
                );

                return image;
            }
        );

        return result;
    } catch (error) {
        requestLogger.error(
            { error, prompt: prompt.substring(0, 100) },
            "Failed to generate image with DALL-E"
        );

        Sentry.captureException(error, {
            tags: {
                service: "openai",
                operation: "image_generate",
                model: "dall-e-3",
            },
            extra: {
                size,
                quality,
                style,
                promptLength: prompt.length,
            },
        });

        throw new Error(
            `Image generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
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
