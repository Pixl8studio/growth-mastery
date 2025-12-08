import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/followup/trigger/route";
import {
    createMockRequest,
    parseJsonResponse,
} from "@/__tests__/helpers/api-test-helpers";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/logger", () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/lib/followup/scheduler-service", () => ({ triggerSequence: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { triggerSequence } from "@/lib/followup/scheduler-service";

const mockUser = { id: "user-123", email: "test@example.com" };

describe("POST /api/followup/trigger", () => {
    beforeEach(() => vi.clearAllMocks());

    it("should trigger sequence for prospect", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "followup_prospects") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: { user_id: "user-123" },
                            error: null,
                        }),
                    };
                }
                if (table === "followup_sequences") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: { agent_config_id: "config-123" },
                            error: null,
                        }),
                    };
                }
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn(),
                };
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(triggerSequence).mockResolvedValue({
            success: true,
            deliveries_created: 3,
        } as any);

        const request = createMockRequest({
            method: "POST",
            body: { sequence_id: "seq-123", prospect_id: "p-123" },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{
            success: boolean;
            deliveries_created: number;
        }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.deliveries_created).toBe(3);
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
            method: "POST",
            body: { sequence_id: "seq-123", prospect_id: "p-123" },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(401);
    });

    it("should return 400 for missing prospect_id", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: { sequence_id: "seq-123" },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("prospect_id is required");
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

        const request = createMockRequest({
            method: "POST",
            body: { prospect_id: "p-123" },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("sequence_id is required");
    });
});
