/**
 * AI Client
 * Wrapper around Anthropic Claude API for funnel content generation
 * Migrated from OpenAI to Claude for unified AI token management
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import * as Sentry from "@sentry/nextjs";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { retry } from "@/lib/utils";
import { AI_CONFIG } from "@/lib/config";
import { recoverJSON } from "@/lib/ai/json-recovery";
import type {
    AIGenerationOptions,
    ImageGenerationOptions,
    GeneratedImage,
} from "./types";

let anthropicInstance: Anthropic | null = null;
let openaiInstance: OpenAI | null = null;

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

/**
 * Get OpenAI client instance (lazy initialization)
 * Only used for DALL-E image generation - Claude does not have image generation
 */
function getOpenAIClient(): OpenAI {
    if (!openaiInstance) {
        if (!env.OPENAI_API_KEY) {
            throw new Error(
                "OPENAI_API_KEY is not configured. Please add it to your environment variables. " +
                    "Note: OpenAI is only used for DALL-E image generation."
            );
        }
        openaiInstance = new OpenAI({
            apiKey: env.OPENAI_API_KEY,
        });
    }
    return openaiInstance;
}

/**
 * Message type compatible with both OpenAI and Anthropic formats
 * Accepts OpenAI's ChatCompletionMessageParam for backward compatibility
 */
export type AIMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

/**
 * Extract string content from OpenAI message content
 * Handles both string and ContentPart array formats
 */
function extractContent(
    content: OpenAI.Chat.Completions.ChatCompletionMessageParam["content"]
): string {
    if (typeof content === "string") {
        return content;
    }
    if (Array.isArray(content)) {
        return content
            .filter(
                (part): part is OpenAI.Chat.Completions.ChatCompletionContentPartText =>
                    "type" in part && part.type === "text"
            )
            .map((part) => part.text)
            .join("\n");
    }
    return "";
}

/**
 * Convert messages array to Anthropic format
 * Extracts system messages and converts to Anthropic message format
 * Handles OpenAI's various message types including 'developer' role
 */
function convertToAnthropicFormat(messages: AIMessage[]): {
    system: string | undefined;
    messages: Anthropic.MessageParam[];
} {
    const systemMessages: string[] = [];
    const anthropicMessages: Anthropic.MessageParam[] = [];

    for (const msg of messages) {
        const content = extractContent(msg.content);

        // Handle system and developer messages as system context
        if (msg.role === "system" || msg.role === "developer") {
            if (content) {
                systemMessages.push(content);
            }
        } else if (msg.role === "user" || msg.role === "assistant") {
            if (content) {
                anthropicMessages.push({
                    role: msg.role,
                    content,
                });
            }
        }
        // Ignore other roles like 'tool', 'function' that aren't supported
    }

    return {
        system: systemMessages.length > 0 ? systemMessages.join("\n\n") : undefined,
        messages: anthropicMessages,
    };
}

/**
 * Generate content with Claude and parse JSON response
 * Includes retry logic and token tracking
 *
 * @param messages - Array of messages in OpenAI-compatible format for backward compatibility
 * @param options - Generation options (model, temperature, maxTokens)
 */
export async function generateWithAI<T>(
    messages: AIMessage[],
    options?: AIGenerationOptions
): Promise<T> {
    const model = options?.model || AI_CONFIG.models.default;
    const temperature = options?.temperature ?? AI_CONFIG.defaultTemperature;
    const maxTokens = options?.maxTokens || AI_CONFIG.defaultMaxTokens;

    const requestLogger = logger.child({ model, temperature, maxTokens });
    requestLogger.info("Generating content with Claude");

    // Convert messages to Anthropic format
    const { system, messages: anthropicMessages } = convertToAnthropicFormat(messages);

    // Enhance system prompt to ensure JSON output
    const jsonSystemPrompt = system
        ? `${system}\n\nIMPORTANT: You MUST respond with valid JSON only. No markdown code blocks, no explanations, just the raw JSON object.`
        : "You MUST respond with valid JSON only. No markdown code blocks, no explanations, just the raw JSON object.";

    try {
        const result = await Sentry.startSpan(
            { op: "ai.claude.messages", name: `Claude: ${model}` },
            async (span) => {
                span.setAttribute("model", model);
                span.setAttribute("temperature", temperature);
                span.setAttribute("max_tokens", maxTokens);

                const completion = await retry(
                    async () => {
                        const anthropic = getAnthropicClient();
                        const response = await anthropic.messages.create({
                            model,
                            max_tokens: maxTokens,
                            temperature,
                            system: jsonSystemPrompt,
                            messages: anthropicMessages,
                        });

                        const contentBlock = response.content[0];
                        if (contentBlock.type !== "text") {
                            throw new Error("Unexpected response type from Claude");
                        }

                        const content = contentBlock.text;

                        if (!content) {
                            throw new Error("No content returned from Claude");
                        }

                        requestLogger.info(
                            {
                                tokensUsed:
                                    response.usage.input_tokens +
                                    response.usage.output_tokens,
                                promptTokens: response.usage.input_tokens,
                                completionTokens: response.usage.output_tokens,
                            },
                            "Claude generation successful"
                        );

                        span.setAttribute(
                            "tokens_used",
                            response.usage.input_tokens + response.usage.output_tokens
                        );
                        span.setAttribute("prompt_tokens", response.usage.input_tokens);
                        span.setAttribute(
                            "completion_tokens",
                            response.usage.output_tokens
                        );

                        // Try direct JSON parse first, fall back to recovery system
                        try {
                            return JSON.parse(content) as T;
                        } catch (parseError) {
                            requestLogger.warn(
                                { parseError, contentPreview: content.slice(0, 200) },
                                "Direct JSON parse failed, attempting recovery"
                            );

                            const recovered = recoverJSON<T>(content);
                            if (recovered.success && recovered.data !== undefined) {
                                requestLogger.info(
                                    { strategy: recovered.strategy },
                                    "JSON recovered successfully"
                                );
                                span.setAttribute(
                                    "json_recovery_strategy",
                                    recovered.strategy || "unknown"
                                );
                                return recovered.data;
                            }

                            // Recovery failed, throw original error
                            throw new Error(
                                `Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : "Unknown parse error"}`
                            );
                        }
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
        requestLogger.error({ error, model }, "Failed to generate content with Claude");

        Sentry.captureException(error, {
            tags: {
                service: "claude",
                operation: "messages",
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
    messages: AIMessage[],
    options?: AIGenerationOptions
): Promise<string> {
    const model = options?.model || AI_CONFIG.models.default;
    const temperature = options?.temperature ?? AI_CONFIG.defaultTemperature;
    const maxTokens = options?.maxTokens || AI_CONFIG.defaultMaxTokens;

    const requestLogger = logger.child({ model, temperature, maxTokens });
    requestLogger.info("Generating text with Claude");

    // Convert messages to Anthropic format
    const { system, messages: anthropicMessages } = convertToAnthropicFormat(messages);

    try {
        const result = await Sentry.startSpan(
            { op: "ai.claude.text", name: `Claude Text: ${model}` },
            async (span) => {
                span.setAttribute("model", model);
                span.setAttribute("temperature", temperature);
                span.setAttribute("max_tokens", maxTokens);

                const completion = await retry(
                    async () => {
                        const anthropic = getAnthropicClient();
                        const response = await anthropic.messages.create({
                            model,
                            max_tokens: maxTokens,
                            temperature,
                            system,
                            messages: anthropicMessages,
                        });

                        const contentBlock = response.content[0];
                        if (contentBlock.type !== "text") {
                            throw new Error("Unexpected response type from Claude");
                        }

                        const content = contentBlock.text;

                        if (!content) {
                            throw new Error("No content returned from Claude");
                        }

                        requestLogger.info(
                            {
                                tokensUsed:
                                    response.usage.input_tokens +
                                    response.usage.output_tokens,
                                promptTokens: response.usage.input_tokens,
                                completionTokens: response.usage.output_tokens,
                            },
                            "Claude text generation successful"
                        );

                        span.setAttribute(
                            "tokens_used",
                            response.usage.input_tokens + response.usage.output_tokens
                        );
                        span.setAttribute("prompt_tokens", response.usage.input_tokens);
                        span.setAttribute(
                            "completion_tokens",
                            response.usage.output_tokens
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
        requestLogger.error({ error, model }, "Failed to generate text with Claude");

        Sentry.captureException(error, {
            tags: {
                service: "claude",
                operation: "text",
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
 *
 * NOTE: This function still uses OpenAI as Claude does not have image generation capabilities.
 * This is the only remaining OpenAI integration in the project.
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
        "Generating image with DALL-E (OpenAI)"
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
                        const openai = getOpenAIClient();
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
                                revisedPrompt: imageData.revised_prompt?.substring(
                                    0,
                                    100
                                ),
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
