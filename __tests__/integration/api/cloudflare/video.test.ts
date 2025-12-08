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
            thumbnail: "https://cloudflare.com/thumbnail.jpg",
        });

        const request = new NextRequest(
            "http://localhost:3000/api/cloudflare/video/video-123"
        );
        // Next.js 15+ expects params as a Promise
        const response = await GET(request, {
            params: Promise.resolve({ videoId: "video-123" }),
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.readyToStream).toBe(true);
        expect(data.duration).toBe(120);
        expect(data.status).toBe("ready");
    });

    it("should handle video not found", async () => {
        const { getVideo } = await import("@/lib/cloudflare/client");
        (getVideo as any).mockRejectedValue(new Error("Video not found"));

        const request = new NextRequest(
            "http://localhost:3000/api/cloudflare/video/invalid"
        );
        // Next.js 15+ expects params as a Promise
        const response = await GET(request, {
            params: Promise.resolve({ videoId: "invalid" }),
        });

        expect(response.status).toBeGreaterThanOrEqual(400);
    });
});
