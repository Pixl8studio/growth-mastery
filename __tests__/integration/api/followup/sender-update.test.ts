import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/followup/sender/update/route";
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

describe("POST /api/followup/sender/update", () => {
    beforeEach(() => vi.clearAllMocks());

    it("should update sender information successfully", async () => {
        let callCount = 0;
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "followup_agent_configs") {
                    callCount++;
                    if (callCount === 1) {
                        // First call - ownership check (select)
                        return {
                            select: vi.fn().mockReturnThis(),
                            eq: vi.fn().mockReturnThis(),
                            single: vi.fn().mockResolvedValue({
                                data: { user_id: "user-123" },
                                error: null,
                            }),
                        };
                    } else {
                        // Second call - update
                        return {
                            update: vi.fn().mockReturnThis(),
                            eq: vi.fn().mockResolvedValue({
                                error: null,
                            }),
                        };
                    }
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                agent_config_id: "config-123",
                sender_name: "John Doe",
                sender_email: "john@example.com",
                sms_sender_id: "+15551234567",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toBe("Sender information updated successfully");
    });

    it("should return 400 for missing agent_config_id", async () => {
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
            body: {
                sender_name: "John Doe",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("agent_config_id is required");
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
            body: { agent_config_id: "config-123" },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Authentication required");
    });

    it("should return 401 for accessing other user's config", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "followup_agent_configs") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: { user_id: "other-user" },
                            error: null,
                        }),
                    };
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: { agent_config_id: "config-123" },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Access denied to agent config");
    });

    it("should return 400 when update fails", async () => {
        let callCount = 0;
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "followup_agent_configs") {
                    callCount++;
                    if (callCount === 1) {
                        // First call - ownership check (select)
                        return {
                            select: vi.fn().mockReturnThis(),
                            eq: vi.fn().mockReturnThis(),
                            single: vi.fn().mockResolvedValue({
                                data: { user_id: "user-123" },
                                error: null,
                            }),
                        };
                    } else {
                        // Second call - update (simulate error)
                        return {
                            update: vi.fn().mockReturnThis(),
                            eq: vi.fn().mockResolvedValue({
                                error: { message: "Update failed" },
                            }),
                        };
                    }
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: { agent_config_id: "config-123" },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("Failed to update sender information");
    });
});
