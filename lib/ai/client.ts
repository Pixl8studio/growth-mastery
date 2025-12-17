/**
 * AI Client
 * Wrapper around Anthropic API for funnel content generation
 * Uses DALL-E (OpenAI) for image generation only
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
 * Used only for DALL-E image generation
 */
function getOpenAIClient(): OpenAI {
    if (!openaiInstance) {
        if (!env.OPENAI_API_KEY) {
            throw new Error(
                "OPENAI_API_KEY is not configured. Please add it to your environment variables for image generation."
            );
        }
        openaiInstance = new OpenAI({
            apiKey: env.OPENAI_API_KEY,
        });
    }
    return openaiInstance;
}

// Message type for Anthropic
interface Message {
    role: "user" | "assistant";
    content: string;
}

// Content part type for structured message content (e.g., OpenAI's ChatCompletionContentPartText)
interface ContentPart {
    type?: string;
    text?: string;
}

// Input message type - supports both simple string content and structured content arrays
type MessageContent =
    | string
    | null
    | undefined
    | ContentPart[]
    | Array<string | ContentPart>;

type InputMessage = {
    role: string;
    content?: MessageContent;
};

/**
 * Extract string content from various message content formats
 */
function extractStringContent(content: unknown): string {
    if (typeof content === "string") {
        return content;
    }
    if (content === null || content === undefined) {
        return "";
    }
    if (Array.isArray(content)) {
        // Handle OpenAI's ChatCompletionContentPartText[] format
        return content
            .map((part) => {
                if (typeof part === "string") return part;
                if (part && typeof part === "object" && "text" in part) {
                    return String(part.text);
                }
                return "";
            })
            .join("");
    }
    return String(content);
}

/**
 * Convert OpenAI-style messages to Anthropic format
 * Extracts system message and converts chat messages
 */
function convertToAnthropicFormat(messages: InputMessage[]): {
    system: string | undefined;
    messages: Message[];
} {
    let system: string | undefined;
    const anthropicMessages: Message[] = [];

    for (const msg of messages) {
        const content = extractStringContent(msg.content);
        if (msg.role === "system") {
            system = content || undefined;
        } else if (msg.role === "user" || msg.role === "assistant") {
            anthropicMessages.push({
                role: msg.role,
                content: content || "",
            });
        }
    }

    return { system, messages: anthropicMessages };
}

/**
 * Generate content with Anthropic Claude and parse JSON response
 * Includes retry logic and token tracking
 */
export async function generateWithAI<T>(
    messages: InputMessage[],
    options?: AIGenerationOptions
): Promise<T> {
    const model = options?.model || AI_CONFIG.models.default;
    const temperature = options?.temperature ?? AI_CONFIG.defaultTemperature;
    const maxTokens = options?.maxTokens || AI_CONFIG.defaultMaxTokens;

    const requestLogger = logger.child({ model, temperature, maxTokens });
    requestLogger.info("Generating content with Anthropic Claude");

    try {
        const result = await Sentry.startSpan(
            { op: "ai.anthropic.chat.completions", name: `Anthropic Chat: ${model}` },
            async (span) => {
                span.setAttribute("model", model);
                span.setAttribute("temperature", temperature);
                span.setAttribute("max_tokens", maxTokens);

                const { system, messages: anthropicMessages } =
                    convertToAnthropicFormat(messages);

                // Add JSON instruction to system prompt if not already present
                const jsonSystemPrompt = system
                    ? `${system}\n\nIMPORTANT: You must respond with valid JSON only. No markdown, no code blocks, just raw JSON.`
                    : "You must respond with valid JSON only. No markdown, no code blocks, just raw JSON.";

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

                        const textBlock = response.content.find(
                            (block) => block.type === "text"
                        );
                        const content =
                            textBlock?.type === "text" ? textBlock.text : null;

                        if (!content) {
                            throw new Error("No content returned from Anthropic");
                        }

                        requestLogger.info(
                            {
                                tokensUsed:
                                    response.usage.input_tokens +
                                    response.usage.output_tokens,
                                promptTokens: response.usage.input_tokens,
                                completionTokens: response.usage.output_tokens,
                            },
                            "Anthropic generation successful"
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
        requestLogger.error(
            { error, model },
            "Failed to generate content with Anthropic"
        );

        Sentry.captureException(error, {
            tags: {
                service: "anthropic",
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
    messages: InputMessage[],
    options?: AIGenerationOptions
): Promise<string> {
    const model = options?.model || AI_CONFIG.models.default;
    const temperature = options?.temperature ?? AI_CONFIG.defaultTemperature;
    const maxTokens = options?.maxTokens || AI_CONFIG.defaultMaxTokens;

    const requestLogger = logger.child({ model, temperature, maxTokens });
    requestLogger.info("Generating text with Anthropic Claude");

    try {
        const result = await Sentry.startSpan(
            { op: "ai.anthropic.text.completions", name: `Anthropic Text: ${model}` },
            async (span) => {
                span.setAttribute("model", model);
                span.setAttribute("temperature", temperature);
                span.setAttribute("max_tokens", maxTokens);

                const { system, messages: anthropicMessages } =
                    convertToAnthropicFormat(messages);

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

                        const textBlock = response.content.find(
                            (block) => block.type === "text"
                        );
                        const content =
                            textBlock?.type === "text" ? textBlock.text : null;

                        if (!content) {
                            throw new Error("No content returned from Anthropic");
                        }

                        requestLogger.info(
                            {
                                tokensUsed:
                                    response.usage.input_tokens +
                                    response.usage.output_tokens,
                                promptTokens: response.usage.input_tokens,
                                completionTokens: response.usage.output_tokens,
                            },
                            "Anthropic text generation successful"
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
        requestLogger.error({ error, model }, "Failed to generate text with Anthropic");

        Sentry.captureException(error, {
            tags: {
                service: "anthropic",
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
 * Generate image with DALL-E (OpenAI)
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
