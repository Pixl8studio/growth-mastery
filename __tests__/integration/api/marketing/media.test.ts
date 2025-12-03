import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/marketing/media/route";
import {
    createMockSupabaseClient,
    createMockRequest,
} from "@/__tests__/utils/test-helpers";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

describe("GET /api/marketing/media", () => {
    let mockSupabase: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabaseClient();
        const { createClient } = await import("@/lib/supabase/server");
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    });

    it("should return media library for authenticated user", async () => {
        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/media",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(Array.isArray(data.media)).toBe(true);
    });

    it("should return 401 for unauthenticated user", async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: null },
            error: null,
        });

        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/media",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Unauthorized");
    });

    it("should accept funnel_project_id parameter", async () => {
        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/media?funnel_project_id=funnel-1",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should return empty array when no media exists", async () => {
        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/media",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.media).toEqual([]);
    });

    it("should log media library request", async () => {
        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/media",
        });

        await GET(request);

        expect(mockLogger.info).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: "test-user-id",
            }),
            "Media library requested"
        );
    });
});

describe("POST /api/marketing/media", () => {
    let mockSupabase: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabaseClient();
        const { createClient } = await import("@/lib/supabase/server");
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    });

    it("should handle media upload request for authenticated user", async () => {
        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/media",
            body: {
                file_name: "test.jpg",
                file_type: "image/jpeg",
            },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toContain("Media upload endpoint");
    });

    it("should return 401 for unauthenticated user", async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: null },
            error: null,
        });

        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/media",
            body: {},
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Unauthorized");
    });

    it("should log media upload request", async () => {
        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/media",
            body: {},
        });

        await POST(request);

        expect(mockLogger.info).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: "test-user-id",
            }),
            "Media upload requested"
        );
    });

    it("should handle errors gracefully", async () => {
        mockSupabase.auth.getUser.mockRejectedValue(new Error("Auth error"));

        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/media",
            body: {},
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Failed to upload media");
    });
});
