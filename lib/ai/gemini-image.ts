/**
 * Gemini Image Generation Client
 * Uses Google's Gemini 2.5 Flash Image (Nano Banana) and Gemini 3 Pro Image (Nano Banana Pro)
 * for AI image generation with fallback to OpenAI DALL-E 3
 */

import { GoogleGenAI } from "@google/genai";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";
import { retry } from "@/lib/utils";
import type { ImageSize, GeneratedImage } from "./types";

// Gemini model identifiers
export const GEMINI_MODELS = {
    // Gemini 2.5 Flash Image - fast, efficient, for most use cases
    FLASH: "gemini-2.5-flash-preview-image-generation",
    // Gemini 3 Pro Image - higher fidelity, for premium use cases (Facebook ads)
    PRO: "gemini-3-pro-image-preview",
} as const;

export type GeminiImageModel = (typeof GEMINI_MODELS)[keyof typeof GEMINI_MODELS];

// Map our existing size format to Gemini aspect ratios
const SIZE_TO_ASPECT_RATIO: Record<ImageSize, string> = {
    "1024x1024": "1:1", // Square
    "1792x1024": "16:9", // Wide/landscape
    "1024x1792": "9:16", // Tall/portrait
};

// Lazy Gemini client initialization
let geminiInstance: GoogleGenAI | null = null;

/**
 * Get Gemini client instance (lazy initialization)
 */
function getGeminiClient(): GoogleGenAI {
    if (!geminiInstance) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error(
                "GEMINI_API_KEY is not configured. Please add it to your environment variables."
            );
        }
        geminiInstance = new GoogleGenAI({ apiKey });
    }
    return geminiInstance;
}

export interface GeminiImageOptions {
    size?: ImageSize;
    model?: GeminiImageModel;
}

/**
 * Generate an image using Gemini's image generation models
 *
 * @param prompt - The text prompt describing the image to generate
 * @param options - Generation options (size, model)
 * @returns Generated image as base64 data URL
 */
export async function generateImageWithGemini(
    prompt: string,
    options?: GeminiImageOptions
): Promise<GeneratedImage> {
    const size = options?.size || "1024x1024";
    const model = options?.model || GEMINI_MODELS.FLASH;
    const aspectRatio = SIZE_TO_ASPECT_RATIO[size];

    const requestLogger = logger.child({ model, size, aspectRatio });
    requestLogger.info(
        { prompt: prompt.substring(0, 100) },
        "Generating image with Gemini"
    );

    try {
        const result = await Sentry.startSpan(
            { op: "ai.gemini.image.generate", name: `Gemini Image: ${model}` },
            async (span) => {
                span.setAttribute("model", model);
                span.setAttribute("size", size);
                span.setAttribute("aspect_ratio", aspectRatio);

                const image = await retry(
                    async () => {
                        const gemini = getGeminiClient();

                        const response = await gemini.models.generateContent({
                            model,
                            contents: prompt,
                            config: {
                                responseModalities: ["TEXT", "IMAGE"],
                                imageConfig: {
                                    aspectRatio,
                                },
                            },
                        });

                        // Extract image from response
                        const candidates = response.candidates;
                        if (!candidates || candidates.length === 0) {
                            throw new Error("No candidates returned from Gemini");
                        }

                        const content = candidates[0]?.content;
                        if (!content || !content.parts) {
                            throw new Error("No content parts in Gemini response");
                        }

                        // Find the image part in the response
                        let imageData: string | null = null;
                        let mimeType = "image/png";

                        for (const part of content.parts) {
                            if (part.inlineData && part.inlineData.data) {
                                imageData = part.inlineData.data;
                                mimeType = part.inlineData.mimeType || "image/png";
                                break;
                            }
                        }

                        if (!imageData) {
                            throw new Error("No image data in Gemini response");
                        }

                        // Return as data URL for compatibility with existing flow
                        // The API routes will convert this to a blob for storage
                        const dataUrl = `data:${mimeType};base64,${imageData}`;

                        requestLogger.info(
                            { model, mimeType },
                            "Gemini image generation successful"
                        );

                        return {
                            url: dataUrl,
                            revisedPrompt: prompt, // Gemini doesn't revise prompts like DALL-E
                            isBase64: true, // Flag to indicate this is base64, not a URL
                        };
                    },
                    {
                        maxAttempts: 2,
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
            { error, prompt: prompt.substring(0, 100), model },
            "Failed to generate image with Gemini"
        );

        Sentry.captureException(error, {
            tags: {
                service: "gemini",
                operation: "image_generate",
                model,
            },
            extra: {
                size,
                aspectRatio,
                promptLength: prompt.length,
            },
        });

        throw new Error(
            `Gemini image generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

/**
 * Check if Gemini API is available and configured
 */
export function isGeminiAvailable(): boolean {
    return !!process.env.GEMINI_API_KEY;
}

/**
 * Reset the Gemini client instance (for testing)
 */
export function resetGeminiClient(): void {
    geminiInstance = null;
}
