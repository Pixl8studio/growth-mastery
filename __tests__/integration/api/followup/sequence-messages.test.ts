import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET } from "@/app/api/followup/sequences/[sequenceId]/messages/route";
import {
    createMockRequest,
    parseJsonResponse,
} from "@/__tests__/helpers/api-test-helpers";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/logger", () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/lib/followup/sequence-service", () => ({
    createMessage: vi.fn(),
    listMessages: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { createMessage, listMessages } from "@/lib/followup/sequence-service";

const mockUser = { id: "user-123", email: "test@example.com" };

describe("POST /api/followup/sequences/[sequenceId]/messages", () => {
    beforeEach(() => vi.clearAllMocks());

    it("should create message with valid data", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: {}, error: null }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(createMessage).mockResolvedValue({
            success: true,
            message: { id: "msg-123", name: "Welcome" },
        } as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                name: "Welcome",
                message_order: 1,
                channel: "email",
                send_delay_hours: 0,
                body_content: "Hello!",
            },
        });
        const context = { params: Promise.resolve({ sequenceId: "seq-123" }) };

        const response = await POST(request, context);
        const data = await parseJsonResponse<{
            success: boolean;
            message: { name: string };
        }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message.name).toBe("Welcome");
    });

    it("should return 400 for missing required fields", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: {}, error: null }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: { message_order: 1 },
        });
        const context = { params: Promise.resolve({ sequenceId: "seq-123" }) };

        const response = await POST(request, context);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(400);
        expect(data.error).toContain("required");
    });
});

describe("GET /api/followup/sequences/[sequenceId]/messages", () => {
    beforeEach(() => vi.clearAllMocks());

    it("should list messages", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: {}, error: null }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(listMessages).mockResolvedValue({
            success: true,
            messages: [{ id: "msg-1" }, { id: "msg-2" }],
        } as any);

        const request = createMockRequest();
        const context = { params: Promise.resolve({ sequenceId: "seq-123" }) };

        const response = await GET(request, context);
        const data = await parseJsonResponse<{ messages: Array<unknown> }>(response);

        expect(response.status).toBe(200);
        expect(data.messages).toHaveLength(2);
    });
});
