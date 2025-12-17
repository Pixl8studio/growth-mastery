/**
 * Unit Tests: Support Chat Client (Anthropic)
 * Tests for lib/openai/assistants-client.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    createThread,
    sendMessage,
    runAssistant,
    getRunStatus,
    getMessages,
    generateSupportResponse,
} from "@/lib/openai/assistants-client";

// Mock Anthropic methods
const mockMessagesCreate = vi.fn();

// Mock dependencies
vi.mock("@anthropic-ai/sdk", () => ({
    default: vi.fn().mockImplementation(() => ({
        messages: {
            create: mockMessagesCreate,
        },
    })),
}));

vi.mock("@/lib/env", () => ({
    env: {
        ANTHROPIC_API_KEY: "sk-ant-test-key",
    },
}));

vi.mock("@/lib/config", () => ({
    AI_CONFIG: {
        models: {
            default: "claude-sonnet-4-20250514",
        },
        defaultTemperature: 0.7,
        defaultMaxTokens: 4000,
    },
}));

describe("Support Chat Client (Anthropic)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("createThread", () => {
        it("should create a thread and return thread ID", async () => {
            const threadId = await createThread();

            expect(threadId).toBeDefined();
            expect(threadId).toMatch(/^thread_/);
        });

        it("should generate unique thread IDs", async () => {
            const threadId1 = await createThread();
            const threadId2 = await createThread();

            expect(threadId1).not.toBe(threadId2);
        });
    });

    describe("generateSupportResponse", () => {
        it("should generate response from Anthropic Claude", async () => {
            const mockResponse = {
                content: [
                    {
                        type: "text",
                        text: "Hello! How can I help you today?",
                    },
                ],
                usage: {
                    input_tokens: 50,
                    output_tokens: 20,
                },
            };

            mockMessagesCreate.mockResolvedValue(mockResponse);

            const messages = [
                {
                    role: "user" as const,
                    content: "I need help with my funnel",
                    timestamp: new Date().toISOString(),
                },
            ];

            const result = await generateSupportResponse(
                messages,
                "You are Genie AI, a helpful assistant."
            );

            expect(result).toBe("Hello! How can I help you today?");
            expect(mockMessagesCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: "claude-sonnet-4-20250514",
                    messages: expect.arrayContaining([
                        expect.objectContaining({
                            role: "user",
                            content: "I need help with my funnel",
                        }),
                    ]),
                })
            );
        });

        it("should throw error when no response content", async () => {
            const mockResponse = {
                content: [],
                usage: { input_tokens: 0, output_tokens: 0 },
            };

            mockMessagesCreate.mockResolvedValue(mockResponse);

            const messages = [
                {
                    role: "user" as const,
                    content: "Test",
                    timestamp: new Date().toISOString(),
                },
            ];

            await expect(
                generateSupportResponse(messages, "System prompt")
            ).rejects.toThrow("No text response from Anthropic");
        });

        it("should throw error when API key is missing", async () => {
            vi.resetModules();

            vi.doMock("@/lib/env", () => ({
                env: {
                    ANTHROPIC_API_KEY: undefined,
                },
            }));

            const { generateSupportResponse: generate } = await import(
                "@/lib/openai/assistants-client"
            );

            const messages = [
                {
                    role: "user" as const,
                    content: "Test",
                    timestamp: new Date().toISOString(),
                },
            ];

            await expect(generate(messages, "System prompt")).rejects.toThrow(
                "ANTHROPIC_API_KEY is not configured"
            );
        });
    });

    // Legacy functions (deprecated but kept for compatibility)
    describe("Legacy Functions", () => {
        describe("sendMessage", () => {
            it("should be a no-op function", async () => {
                await sendMessage("thread-123", "Hello");
                // No error thrown = success
                expect(true).toBe(true);
            });
        });

        describe("runAssistant", () => {
            it("should return a run ID", async () => {
                const runId = await runAssistant("thread-123");
                expect(runId).toMatch(/^run_/);
            });

            it("should accept additional instructions", async () => {
                const runId = await runAssistant("thread-123", "Extra context");
                expect(runId).toBeDefined();
            });
        });

        describe("getRunStatus", () => {
            it("should always return completed status", async () => {
                const status = await getRunStatus("thread-123", "run-456");
                expect(status).toEqual({ status: "completed" });
            });
        });

        describe("getMessages", () => {
            it("should return empty array", async () => {
                const messages = await getMessages("thread-123");
                expect(messages).toEqual([]);
            });
        });
    });
});
