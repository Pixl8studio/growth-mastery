/**
 * Integration Tests: Cloudflare Video API
 * Tests for app/api/cloudflare/video/[videoId]/route.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/cloudflare/video/[videoId]/route";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/cloudflare/client", () => ({
    getVideo: vi.fn(),
    getVideoStatus: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

describe("GET /api/cloudflare/video/[videoId]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return video details", async () => {
        const { getVideo } = await import("@/lib/cloudflare/client");
        (getVideo as any).mockResolvedValue({
            uid: "video-123",
            status: { state: "ready" },
            readyToStream: true,
            duration: 120,
        });

        const request = new NextRequest("http://localhost:3000/api/cloudflare/video/video-123");
        const response = await GET(request, { params: { videoId: "video-123" } });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.uid).toBe("video-123");
    });

    it("should handle video not found", async () => {
        const { getVideo } = await import("@/lib/cloudflare/client");
        (getVideo as any).mockRejectedValue(new Error("Video not found"));

        const request = new NextRequest("http://localhost:3000/api/cloudflare/video/invalid");
        const response = await GET(request, { params: { videoId: "invalid" } });

        expect(response.status).toBeGreaterThanOrEqual(400);
    });
});
