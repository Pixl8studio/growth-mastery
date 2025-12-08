import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/followup/messages/route";
import {
    createMockRequest,
    parseJsonResponse,
} from "@/__tests__/helpers/api-test-helpers";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/logger", () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { createClient } from "@/lib/supabase/server";

const mockUser = { id: "user-123", email: "test@example.com" };

describe("GET /api/followup/messages", () => {
    beforeEach(() => vi.clearAllMocks());

    it("should list messages for sequence", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "followup_sequences") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: {
                                followup_agent_configs: { user_id: "user-123" },
                            },
                            error: null,
                        }),
                    };
                }
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    order: vi.fn().mockResolvedValue({ data: [], error: null }),
                };
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            url: "http://localhost:3000/api/followup/messages?sequence_id=seq-123",
        });
        const response = await GET(request);

        expect(response.status).toBe(200);
    });

    it("should return 400 for missing sequence_id", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest();
        const response = await GET(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("sequence_id query parameter is required");
    });

    it("should return 401 for unauthenticated users", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: null },
                    error: { message: "Unauthorized" },
                }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            url: "http://localhost:3000/api/followup/messages?sequence_id=seq-123",
        });
        const response = await GET(request);
        await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(401);
    });
});
