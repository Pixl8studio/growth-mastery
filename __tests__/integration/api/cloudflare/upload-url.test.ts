/**
 * Integration Tests: Cloudflare Upload URL API
 * Tests for app/api/cloudflare/upload-url/route.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/cloudflare/upload-url/route";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/cloudflare/client", () => ({
    generateUploadUrl: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

describe("POST /api/cloudflare/upload-url", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should generate upload URL successfully", async () => {
        const { generateUploadUrl } = await import("@/lib/cloudflare/client");
        (generateUploadUrl as any).mockResolvedValue({
            uploadUrl: "https://upload.cloudflare.com/test",
            videoId: "video-123",
        });

        const request = new NextRequest("http://localhost:3000/api/cloudflare/upload-url", {
            method: "POST",
            body: JSON.stringify({ name: "test-video.mp4" }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty("uploadUrl");
        expect(data).toHaveProperty("videoId");
    });

    it("should handle errors gracefully", async () => {
        const { generateUploadUrl } = await import("@/lib/cloudflare/client");
        (generateUploadUrl as any).mockRejectedValue(new Error("API error"));

        const request = new NextRequest("http://localhost:3000/api/cloudflare/upload-url", {
            method: "POST",
        });

        const response = await POST(request);

        expect(response.status).toBeGreaterThanOrEqual(400);
    });
});
