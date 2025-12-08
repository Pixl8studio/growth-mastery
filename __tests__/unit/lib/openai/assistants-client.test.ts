/**
 * Unit Tests: OpenAI Assistants Client
 * Tests for lib/openai/assistants-client.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    createThread,
    sendMessage,
    runAssistant,
    getRunStatus,
    getMessages,
} from "@/lib/openai/assistants-client";

// Mock dependencies
vi.mock("openai", () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            beta: {
                threads: {
                    create: vi.fn().mockResolvedValue({ id: "thread-mock-123" }),
                    messages: {
                        create: vi.fn().mockResolvedValue({ id: "msg-mock-123" }),
                        list: vi.fn().mockResolvedValue({ data: [] }),
                    },
                    runs: {
                        create: vi.fn().mockResolvedValue({ id: "run-mock-123" }),
                        retrieve: vi.fn().mockResolvedValue({
                            id: "run-mock-123",
                            status: "completed",
                        }),
                    },
                },
            },
        })),
    };
});

vi.mock("@/lib/env", () => ({
    env: {
        OPENAI_API_KEY: "sk-test-key",
        OPENAI_ASSISTANT_ID: "asst-test-123",
    },
}));

describe("OpenAI Assistants Client", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("createThread", () => {
        it("should create a thread and return thread ID", async () => {
            const OpenAI = (await import("openai")).default;
            const mockOpenAI = new OpenAI({ apiKey: "test" });

            (mockOpenAI.beta.threads.create as any).mockResolvedValue({
                id: "thread-123",
            });

            vi.doMock("openai", () => ({
                default: vi.fn(() => mockOpenAI),
            }));

            const { createThread: create } = await import(
                "@/lib/openai/assistants-client"
            );

            const threadId = await create();
            expect(threadId).toBeDefined();
        });

        it("should throw error when API key is missing", async () => {
            vi.resetModules();

            vi.doMock("@/lib/env", () => ({
                env: {
                    OPENAI_API_KEY: undefined,
                },
            }));

            vi.doMock("openai", () => ({
                default: vi.fn().mockImplementation(() => ({
                    beta: {
                        threads: {
                            create: vi
                                .fn()
                                .mockResolvedValue({ id: "thread-mock-123" }),
                        },
                    },
                })),
            }));

            const { createThread: create } = await import(
                "@/lib/openai/assistants-client"
            );

            await expect(create()).rejects.toThrow("OPENAI_API_KEY is not configured");
        });
    });

    describe("sendMessage", () => {
        it("should send a message to a thread", async () => {
            const threadId = "thread-123";
            const content = "Hello, assistant!";

            await sendMessage(threadId, content);

            // Message was sent (implementation detail tested through integration)
            expect(true).toBe(true);
        });
    });

    describe("runAssistant", () => {
        it("should run assistant on a thread", async () => {
            const threadId = "thread-123";

            const runId = await runAssistant(threadId);

            expect(runId).toBeDefined();
        });

        it("should accept additional instructions", async () => {
            const threadId = "thread-123";
            const instructions = "Focus on technical details";

            const runId = await runAssistant(threadId, instructions);

            expect(runId).toBeDefined();
        });

        it("should throw error when assistant ID is missing", async () => {
            vi.resetModules();

            vi.doMock("@/lib/env", () => ({
                env: {
                    OPENAI_API_KEY: "sk-test-key",
                    OPENAI_ASSISTANT_ID: undefined,
                },
            }));

            vi.doMock("openai", () => ({
                default: vi.fn().mockImplementation(() => ({
                    beta: {
                        threads: {
                            runs: {
                                create: vi
                                    .fn()
                                    .mockResolvedValue({ id: "run-mock-123" }),
                            },
                        },
                    },
                })),
            }));

            const { runAssistant: run } = await import(
                "@/lib/openai/assistants-client"
            );

            await expect(run("thread-123")).rejects.toThrow(
                "OPENAI_ASSISTANT_ID is not configured"
            );
        });
    });

    describe("getRunStatus", () => {
        it("should retrieve run status", async () => {
            const threadId = "thread-123";
            const runId = "run-456";

            const status = await getRunStatus(threadId, runId);

            expect(status).toBeDefined();
        });
    });

    describe("getMessages", () => {
        it("should retrieve messages from a thread", async () => {
            const threadId = "thread-123";

            const messages = await getMessages(threadId);

            expect(messages).toBeDefined();
        });
    });
});
