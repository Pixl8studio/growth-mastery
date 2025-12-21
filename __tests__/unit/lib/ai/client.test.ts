/**
 * Unit Tests: AI Client
 * Tests for lib/ai/client.ts
 * Uses Claude for text/JSON generation, OpenAI for image generation (DALL-E)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    generateWithAI,
    generateTextWithAI,
    generateImageWithAI,
    estimateTokens,
} from "@/lib/ai/client";

// Mock Anthropic methods for text/JSON generation
const mockMessagesCreate = vi.fn();

// Mock OpenAI methods for image generation (DALL-E)
const mockImagesGenerate = vi.fn();

// Mock Anthropic SDK
vi.mock("@anthropic-ai/sdk", () => ({
    default: vi.fn().mockImplementation(() => ({
        messages: {
            create: mockMessagesCreate,
        },
    })),
}));

// Mock OpenAI SDK (used for DALL-E only)
vi.mock("openai", () => ({
    default: vi.fn().mockImplementation(() => ({
        images: {
            generate: mockImagesGenerate,
        },
    })),
    // Provide types namespace for AIMessage type alias
    Chat: {
        Completions: {
            ChatCompletionMessageParam: {},
            ChatCompletionContentPartText: {},
        },
    },
}));

vi.mock("@/lib/env", () => ({
    env: {
        ANTHROPIC_API_KEY: "sk-ant-test-key",
        OPENAI_API_KEY: "sk-test-key",
    },
}));

vi.mock("@/lib/logger", () => ({
    logger: {
        child: vi.fn(() => ({
            info: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
        })),
    },
}));

vi.mock("@/lib/config", () => ({
    AI_CONFIG: {
        models: {
            default: "claude-sonnet-4-20250514",
            fast: "claude-3-5-haiku-20241022",
        },
        defaultTemperature: 0.7,
        defaultMaxTokens: 4000,
    },
}));

vi.mock("@/lib/utils", () => ({
    retry: vi.fn((fn) => fn()),
}));

vi.mock("@/lib/ai/json-recovery", () => ({
    recoverJSON: vi.fn(() => ({ success: false })),
}));

describe("AI Client", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("generateWithAI", () => {
        it("should generate and parse JSON response using Claude", async () => {
            const mockResponse = {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({ result: "test data" }),
                    },
                ],
                usage: {
                    input_tokens: 50,
                    output_tokens: 50,
                },
            };

            mockMessagesCreate.mockResolvedValue(mockResponse);

            const messages = [{ role: "user" as const, content: "Test prompt" }];
            const result = await generateWithAI<{ result: string }>(messages);

            expect(result).toEqual({ result: "test data" });
            expect(mockMessagesCreate).toHaveBeenCalled();
        });

        it("should handle system messages by extracting them", async () => {
            const mockResponse = {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({ response: "ok" }),
                    },
                ],
                usage: {
                    input_tokens: 50,
                    output_tokens: 50,
                },
            };

            mockMessagesCreate.mockResolvedValue(mockResponse);

            const messages = [
                { role: "system" as const, content: "You are a helpful assistant" },
                { role: "user" as const, content: "Test prompt" },
            ];
            await generateWithAI<{ response: string }>(messages);

            // Verify system message was passed to Claude correctly
            expect(mockMessagesCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    system: expect.stringContaining("You are a helpful assistant"),
                    messages: expect.arrayContaining([
                        expect.objectContaining({
                            role: "user",
                            content: "Test prompt",
                        }),
                    ]),
                })
            );
        });

        it("should throw error when no content returned", async () => {
            const mockResponse = {
                content: [{ type: "text", text: "" }],
                usage: { input_tokens: 0, output_tokens: 0 },
            };

            mockMessagesCreate.mockResolvedValue(mockResponse);

            const messages = [{ role: "user" as const, content: "Test" }];

            await expect(generateWithAI(messages)).rejects.toThrow(
                "No content returned"
            );
        });

        it("should throw error on unexpected response type", async () => {
            const mockResponse = {
                content: [{ type: "image", source: {} }],
                usage: { input_tokens: 0, output_tokens: 0 },
            };

            mockMessagesCreate.mockResolvedValue(mockResponse);

            const messages = [{ role: "user" as const, content: "Test" }];

            await expect(generateWithAI(messages)).rejects.toThrow(
                "Unexpected response type"
            );
        });
    });

    describe("generateTextWithAI", () => {
        it("should generate text content using Claude", async () => {
            const mockResponse = {
                content: [
                    {
                        type: "text",
                        text: "Generated text response",
                    },
                ],
                usage: {
                    input_tokens: 20,
                    output_tokens: 30,
                },
            };

            mockMessagesCreate.mockResolvedValue(mockResponse);

            const messages = [{ role: "user" as const, content: "Write a story" }];
            const result = await generateTextWithAI(messages);

            expect(result).toBe("Generated text response");
            expect(mockMessagesCreate).toHaveBeenCalled();
        });
    });

    describe("generateImageWithAI", () => {
        it("should generate image with DALL-E (OpenAI)", async () => {
            const mockResponse = {
                data: [
                    {
                        url: "https://images.openai.com/test.png",
                        revised_prompt: "A revised prompt",
                    },
                ],
            };

            mockImagesGenerate.mockResolvedValue(mockResponse);

            const result = await generateImageWithAI("A beautiful landscape");

            expect(result).toEqual({
                url: "https://images.openai.com/test.png",
                revisedPrompt: "A revised prompt",
            });
            expect(mockImagesGenerate).toHaveBeenCalled();
        });

        it("should use custom options", async () => {
            const mockResponse = {
                data: [
                    {
                        url: "https://images.openai.com/test.png",
                    },
                ],
            };

            mockImagesGenerate.mockResolvedValue(mockResponse);

            const result = await generateImageWithAI("Test prompt", {
                size: "1792x1024",
                quality: "hd",
                style: "natural",
            });

            expect(result).toBeDefined();
        });

        it("should throw error when no image returned", async () => {
            const mockResponse = {
                data: [],
            };

            mockImagesGenerate.mockResolvedValue(mockResponse);

            await expect(generateImageWithAI("Test")).rejects.toThrow(
                "No image returned"
            );
        });
    });

    describe("estimateTokens", () => {
        it("should estimate token count", () => {
            const text = "This is a test string";
            const tokens = estimateTokens(text);

            expect(tokens).toBeGreaterThan(0);
            expect(tokens).toBeLessThan(text.length);
        });

        it("should handle empty string", () => {
            const tokens = estimateTokens("");
            expect(tokens).toBe(0);
        });

        it("should use ~4 characters per token ratio", () => {
            const text = "a".repeat(100);
            const tokens = estimateTokens(text);

            expect(tokens).toBe(Math.ceil(100 / 4));
        });
    });
});
