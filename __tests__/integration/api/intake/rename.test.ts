import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "@/app/api/intake/rename/route";
import {
    createMockRequest,
    parseJsonResponse,
} from "@/__tests__/helpers/api-test-helpers";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), error: vi.fn() } }));

import { createClient } from "@/lib/supabase/server";

describe("PATCH /api/intake/rename", () => {
    const mockUser = { id: "user-123", email: "test@example.com" };

    beforeEach(() => vi.clearAllMocks());

    it("should rename intake session successfully", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: {
                        id: "intake-123",
                        user_id: "user-123",
                        session_name: "Old Name",
                    },
                    error: null,
                }),
                update: vi.fn().mockReturnThis(),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "PATCH",
            body: {
                intakeId: "intake-123",
                sessionName: "New Name",
                projectId: "project-123",
            },
        });

        const response = await PATCH(request);
        const data = await parseJsonResponse<{ success: boolean }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should return 400 for missing fields", async () => {
        const request = createMockRequest({
            method: "PATCH",
            body: { intakeId: "intake-123" },
        });

        const response = await PATCH(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("intakeId and sessionName are required");
    });

    it("should return 401 for unauthenticated user", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: null }, error: null }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "PATCH",
            body: {
                intakeId: "intake-123",
                sessionName: "New Name",
                projectId: "project-123",
            },
        });

        const response = await PATCH(request);
        await parseJsonResponse(response);

        expect(response.status).toBe(401);
    });

    it("should return 400 for session name too long", async () => {
        const request = createMockRequest({
            method: "PATCH",
            body: {
                intakeId: "intake-123",
                sessionName: "x".repeat(300),
                projectId: "project-123",
            },
        });

        const response = await PATCH(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("Session name cannot exceed 255 characters");
    });
});
