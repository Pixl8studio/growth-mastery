import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/intake/paste/route";
import {
    createMockRequest,
    parseJsonResponse,
} from "@/__tests__/helpers/api-test-helpers";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock("@/lib/intake/processors", () => ({
    validateIntakeContent: vi.fn((content: string) => ({
        valid: content.length >= 100,
        reason: content.length < 100 ? "Content too short" : undefined,
    })),
}));

import { createClient } from "@/lib/supabase/server";

describe("POST /api/intake/paste", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should save pasted content successfully", async () => {
        const mockIntake = {
            id: "intake-123",
            funnel_project_id: "project-123",
            user_id: "user-123",
            raw_content:
                "This is a long enough pasted content for testing purposes to pass validation.",
        };

        const mockSupabase = {
            from: vi.fn(() => ({
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: mockIntake,
                    error: null,
                }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                projectId: "project-123",
                userId: "user-123",
                content:
                    "This is a long enough pasted content for testing purposes to pass validation.",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{
            success: boolean;
            intakeId: string;
            method: string;
        }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.intakeId).toBe("intake-123");
        expect(data.method).toBe("paste");
    });

    it("should return 400 when missing required fields", async () => {
        const request = createMockRequest({
            method: "POST",
            body: {
                projectId: "project-123",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("Missing required fields");
    });

    it("should return 400 when content is invalid", async () => {
        const request = createMockRequest({
            method: "POST",
            body: {
                projectId: "project-123",
                userId: "user-123",
                content: "Short",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("Content too short");
    });

    it("should include session name if provided", async () => {
        const mockIntake = {
            id: "intake-123",
            session_name: "Custom Session Name",
        };

        const mockSupabase = {
            from: vi.fn(() => ({
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: mockIntake,
                    error: null,
                }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                projectId: "project-123",
                userId: "user-123",
                content:
                    "This is a long enough pasted content for testing purposes to pass validation.",
                sessionName: "Custom Session Name",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ success: boolean }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should return 500 on database error", async () => {
        const mockSupabase = {
            from: vi.fn(() => ({
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: "Database error" },
                }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                projectId: "project-123",
                userId: "user-123",
                content:
                    "This is a long enough pasted content for testing purposes to pass validation.",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to save content. Please try again.");
    });
});
