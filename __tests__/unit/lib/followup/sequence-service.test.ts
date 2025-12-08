/**
 * Tests for Sequence Service
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

const mockSupabase = {
    from: vi.fn(),
    rpc: vi.fn(),
};

const mockCreateClient = vi.fn().mockResolvedValue(mockSupabase);

// Mock Supabase client
vi.mock("@/lib/supabase/server", () => ({
    createClient: mockCreateClient,
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

// Import after mocks are defined
const {
    createSequence,
    listSequences,
    updateSequence,
    deleteSequence,
    createMessage,
    listMessages,
} = await import("@/lib/followup/sequence-service");

describe("Sequence Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("createSequence", () => {
        it("creates sequence with required fields", async () => {
            const mockSequence = {
                id: "sequence-123",
                agent_config_id: "agent-123",
                name: "3-Day Discount",
                trigger_event: "webinar_end",
            };

            mockSupabase.from.mockReturnValue({
                insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: mockSequence,
                            error: null,
                        }),
                    }),
                }),
            });

            const result = await createSequence("agent-123", {
                name: "3-Day Discount",
                trigger_event: "webinar_end",
            });

            expect(result.success).toBe(true);
            expect(result.sequence?.id).toBe("sequence-123");
        });

        it("returns error when creation fails", async () => {
            mockSupabase.from.mockReturnValue({
                insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: null,
                            error: { message: "Database error" },
                        }),
                    }),
                }),
            });

            const result = await createSequence("agent-123", {
                name: "Test Sequence",
                trigger_event: "webinar_end",
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe("Database error");
        });
    });

    describe("listSequences", () => {
        it("returns all sequences for an agent config", async () => {
            const mockSequences = [
                { id: "1", name: "Sequence 1" },
                { id: "2", name: "Sequence 2" },
            ];

            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                    data: mockSequences,
                    error: null,
                }),
            };

            mockSupabase.from.mockReturnValue(mockChain);

            const result = await listSequences("agent-123");

            expect(result.success).toBe(true);
            expect(result.sequences).toHaveLength(2);
        });
    });

    describe("createMessage", () => {
        it("creates message with all fields", async () => {
            const mockMessage = {
                id: "message-123",
                sequence_id: "sequence-123",
                name: "Day 1 Email",
                message_order: 1,
                channel: "email",
                send_delay_hours: 24,
                subject_line: "Hey {first_name}",
                body_content: "Content here",
            };

            mockSupabase.from.mockReturnValue({
                insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: mockMessage,
                            error: null,
                        }),
                    }),
                }),
            });

            const result = await createMessage("sequence-123", {
                name: "Day 1 Email",
                message_order: 1,
                channel: "email",
                send_delay_hours: 24,
                subject_line: "Hey {first_name}",
                body_content: "Content here",
            });

            expect(result.success).toBe(true);
            expect(result.message?.id).toBe("message-123");
        });
    });

    describe("listMessages", () => {
        it("returns messages in order", async () => {
            const mockMessages = [
                { id: "1", message_order: 1 },
                { id: "2", message_order: 2 },
                { id: "3", message_order: 3 },
            ];

            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                    data: mockMessages,
                    error: null,
                }),
            };

            mockSupabase.from.mockReturnValue(mockChain);

            const result = await listMessages("sequence-123");

            expect(result.success).toBe(true);
            expect(result.messages).toHaveLength(3);
        });
    });

    describe("updateSequence", () => {
        it("updates sequence fields", async () => {
            const mockSequence = {
                id: "sequence-123",
                name: "Updated Name",
                is_automated: true,
            };

            mockSupabase.from.mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: mockSequence,
                                error: null,
                            }),
                        }),
                    }),
                }),
            });

            const result = await updateSequence("sequence-123", {
                name: "Updated Name",
                is_automated: true,
            });

            expect(result.success).toBe(true);
            expect(result.sequence?.name).toBe("Updated Name");
        });
    });

    describe("deleteSequence", () => {
        it("deletes sequence successfully", async () => {
            mockSupabase.from.mockReturnValue({
                delete: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({
                        error: null,
                    }),
                }),
            });

            const result = await deleteSequence("sequence-123");

            expect(result.success).toBe(true);
        });
    });
});
