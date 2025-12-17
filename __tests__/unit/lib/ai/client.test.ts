/**
 * Unit Tests: AI Client
 * Tests for lib/ai/client.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    generateWithAI,
    generateTextWithAI,
    generateImageWithAI,
    estimateTokens,
} from "@/lib/ai/client";

// Mock Anthropic methods that will be used by the client
const mockMessagesCreate = vi.fn();

// Mock OpenAI for DALL-E image generation
const mockImagesGenerate = vi.fn();

// Mock dependencies
vi.mock("@anthropic-ai/sdk", () => ({
    default: vi.fn().mockImplementation(() => ({
        messages: {
            create: mockMessagesCreate,
        },
    })),
}));

vi.mock("openai", () => ({
    default: vi.fn().mockImplementation(() => ({
        images: {
            generate: mockImagesGenerate,
        },
    })),
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
        },
        defaultTemperature: 0.7,
        defaultMaxTokens: 2000,
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
        it("should generate and parse JSON response", async () => {
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
        });

        it("should throw error when no content returned", async () => {
            const mockResponse = {
                content: [],
                usage: { input_tokens: 0, output_tokens: 0 },
            };

            mockMessagesCreate.mockResolvedValue(mockResponse);

            const messages = [{ role: "user" as const, content: "Test" }];

            await expect(generateWithAI(messages)).rejects.toThrow(
                "No content returned"
            );
        });
    });

    describe("generateTextWithAI", () => {
        it("should generate text content", async () => {
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
        });
    });

    describe("generateImageWithAI", () => {
        it("should generate image with DALL-E", async () => {
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
