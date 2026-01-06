/**
 * Tests for Gemini Image Generation Client
 * Tests the Gemini 2.5 Flash Image (Nano Banana) and Gemini 3 Pro Image integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    generateImageWithGemini,
    isGeminiAvailable,
    resetGeminiClient,
    GEMINI_MODELS,
} from "@/lib/ai/gemini-image";

// Mock the @google/genai module
vi.mock("@google/genai", () => ({
    GoogleGenAI: vi.fn().mockImplementation(() => ({
        models: {
            generateContent: vi.fn(),
        },
    })),
}));

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
    startSpan: vi.fn((_, callback) => callback({ setAttribute: vi.fn() })),
    captureException: vi.fn(),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        child: vi.fn(() => ({
            info: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
        })),
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock retry utility
vi.mock("@/lib/utils", () => ({
    retry: vi.fn((fn) => fn()),
}));

describe("Gemini Image Generation", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        resetGeminiClient();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe("isGeminiAvailable", () => {
        it("returns true when GEMINI_API_KEY is set", () => {
            process.env.GEMINI_API_KEY = "test-api-key";
            expect(isGeminiAvailable()).toBe(true);
        });

        it("returns false when GEMINI_API_KEY is not set", () => {
            delete process.env.GEMINI_API_KEY;
            expect(isGeminiAvailable()).toBe(false);
        });

        it("returns false when GEMINI_API_KEY is empty string", () => {
            process.env.GEMINI_API_KEY = "";
            expect(isGeminiAvailable()).toBe(false);
        });
    });

    describe("GEMINI_MODELS", () => {
        it("exports FLASH model identifier", () => {
            expect(GEMINI_MODELS.FLASH).toBe(
                "gemini-2.5-flash-preview-image-generation"
            );
        });

        it("exports PRO model identifier", () => {
            expect(GEMINI_MODELS.PRO).toBe("gemini-3-pro-image-preview");
        });
    });

    describe("generateImageWithGemini", () => {
        it("throws error when GEMINI_API_KEY is not configured", async () => {
            delete process.env.GEMINI_API_KEY;

            await expect(generateImageWithGemini("test prompt")).rejects.toThrow(
                "GEMINI_API_KEY is not configured"
            );
        });

        it("generates image with default options", async () => {
            process.env.GEMINI_API_KEY = "test-api-key";

            const mockBase64 =
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
            const { GoogleGenAI } = await import("@google/genai");
            const mockGenerateContent = vi.fn().mockResolvedValue({
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    inlineData: {
                                        data: mockBase64,
                                        mimeType: "image/png",
                                    },
                                },
                            ],
                        },
                    },
                ],
            });

            vi.mocked(GoogleGenAI).mockImplementation(
                () =>
                    ({
                        models: {
                            generateContent: mockGenerateContent,
                        },
                    }) as unknown as InstanceType<typeof GoogleGenAI>
            );

            const result = await generateImageWithGemini("A beautiful sunset");

            expect(result.url).toContain("data:image/png;base64,");
            expect(result.isBase64).toBe(true);
            expect(result.revisedPrompt).toBe("A beautiful sunset");
        });

        it("uses correct aspect ratio for square images", async () => {
            process.env.GEMINI_API_KEY = "test-api-key";

            const mockBase64 = "test-base64-data";
            const { GoogleGenAI } = await import("@google/genai");
            const mockGenerateContent = vi.fn().mockResolvedValue({
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    inlineData: {
                                        data: mockBase64,
                                        mimeType: "image/png",
                                    },
                                },
                            ],
                        },
                    },
                ],
            });

            vi.mocked(GoogleGenAI).mockImplementation(
                () =>
                    ({
                        models: {
                            generateContent: mockGenerateContent,
                        },
                    }) as unknown as InstanceType<typeof GoogleGenAI>
            );

            await generateImageWithGemini("test", { size: "1024x1024" });

            expect(mockGenerateContent).toHaveBeenCalledWith(
                expect.objectContaining({
                    config: expect.objectContaining({
                        imageConfig: expect.objectContaining({
                            aspectRatio: "1:1",
                        }),
                    }),
                })
            );
        });

        it("uses correct aspect ratio for wide images", async () => {
            process.env.GEMINI_API_KEY = "test-api-key";

            const mockBase64 = "test-base64-data";
            const { GoogleGenAI } = await import("@google/genai");
            const mockGenerateContent = vi.fn().mockResolvedValue({
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    inlineData: {
                                        data: mockBase64,
                                        mimeType: "image/png",
                                    },
                                },
                            ],
                        },
                    },
                ],
            });

            vi.mocked(GoogleGenAI).mockImplementation(
                () =>
                    ({
                        models: {
                            generateContent: mockGenerateContent,
                        },
                    }) as unknown as InstanceType<typeof GoogleGenAI>
            );

            await generateImageWithGemini("test", { size: "1792x1024" });

            expect(mockGenerateContent).toHaveBeenCalledWith(
                expect.objectContaining({
                    config: expect.objectContaining({
                        imageConfig: expect.objectContaining({
                            aspectRatio: "16:9",
                        }),
                    }),
                })
            );
        });

        it("uses correct aspect ratio for tall images", async () => {
            process.env.GEMINI_API_KEY = "test-api-key";

            const mockBase64 = "test-base64-data";
            const { GoogleGenAI } = await import("@google/genai");
            const mockGenerateContent = vi.fn().mockResolvedValue({
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    inlineData: {
                                        data: mockBase64,
                                        mimeType: "image/png",
                                    },
                                },
                            ],
                        },
                    },
                ],
            });

            vi.mocked(GoogleGenAI).mockImplementation(
                () =>
                    ({
                        models: {
                            generateContent: mockGenerateContent,
                        },
                    }) as unknown as InstanceType<typeof GoogleGenAI>
            );

            await generateImageWithGemini("test", { size: "1024x1792" });

            expect(mockGenerateContent).toHaveBeenCalledWith(
                expect.objectContaining({
                    config: expect.objectContaining({
                        imageConfig: expect.objectContaining({
                            aspectRatio: "9:16",
                        }),
                    }),
                })
            );
        });

        it("uses FLASH model by default", async () => {
            process.env.GEMINI_API_KEY = "test-api-key";

            const mockBase64 = "test-base64-data";
            const { GoogleGenAI } = await import("@google/genai");
            const mockGenerateContent = vi.fn().mockResolvedValue({
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    inlineData: {
                                        data: mockBase64,
                                        mimeType: "image/png",
                                    },
                                },
                            ],
                        },
                    },
                ],
            });

            vi.mocked(GoogleGenAI).mockImplementation(
                () =>
                    ({
                        models: {
                            generateContent: mockGenerateContent,
                        },
                    }) as unknown as InstanceType<typeof GoogleGenAI>
            );

            await generateImageWithGemini("test");

            expect(mockGenerateContent).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: GEMINI_MODELS.FLASH,
                })
            );
        });

        it("uses PRO model when specified", async () => {
            process.env.GEMINI_API_KEY = "test-api-key";

            const mockBase64 = "test-base64-data";
            const { GoogleGenAI } = await import("@google/genai");
            const mockGenerateContent = vi.fn().mockResolvedValue({
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    inlineData: {
                                        data: mockBase64,
                                        mimeType: "image/png",
                                    },
                                },
                            ],
                        },
                    },
                ],
            });

            vi.mocked(GoogleGenAI).mockImplementation(
                () =>
                    ({
                        models: {
                            generateContent: mockGenerateContent,
                        },
                    }) as unknown as InstanceType<typeof GoogleGenAI>
            );

            await generateImageWithGemini("test", { model: GEMINI_MODELS.PRO });

            expect(mockGenerateContent).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: GEMINI_MODELS.PRO,
                })
            );
        });

        it("throws error when no candidates returned", async () => {
            process.env.GEMINI_API_KEY = "test-api-key";

            const { GoogleGenAI } = await import("@google/genai");
            const mockGenerateContent = vi.fn().mockResolvedValue({
                candidates: [],
            });

            vi.mocked(GoogleGenAI).mockImplementation(
                () =>
                    ({
                        models: {
                            generateContent: mockGenerateContent,
                        },
                    }) as unknown as InstanceType<typeof GoogleGenAI>
            );

            await expect(generateImageWithGemini("test")).rejects.toThrow(
                "Gemini image generation failed"
            );
        });

        it("throws error when no image data in response", async () => {
            process.env.GEMINI_API_KEY = "test-api-key";

            const { GoogleGenAI } = await import("@google/genai");
            const mockGenerateContent = vi.fn().mockResolvedValue({
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    text: "Some text response",
                                },
                            ],
                        },
                    },
                ],
            });

            vi.mocked(GoogleGenAI).mockImplementation(
                () =>
                    ({
                        models: {
                            generateContent: mockGenerateContent,
                        },
                    }) as unknown as InstanceType<typeof GoogleGenAI>
            );

            await expect(generateImageWithGemini("test")).rejects.toThrow(
                "Gemini image generation failed"
            );
        });
    });
});
