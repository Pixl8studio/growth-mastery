/**
 * Profile Analyze URL API Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/marketing/profiles/[profileId]/analyze-url/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/marketing/social-scraper-service", () => ({
    scrapeAndExtractContent: vi.fn(() =>
        Promise.resolve({
            success: true,
            data: {
                content: ["Post 1", "Post 2"],
                platform: "instagram",
            },
        })
    ),
}));

vi.mock("@/lib/marketing/brand-voice-service", () => ({
    generateEchoModeProfile: vi.fn(() =>
        Promise.resolve({
            success: true,
            config: { voice_characteristics: ["casual", "friendly"] },
            styleSummary: "Casual and friendly",
            previewParagraph: "Test preview",
        })
    ),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
        auth: {
            getUser: vi.fn(() => ({
                data: { user: { id: "user-123" } },
                error: null,
            })),
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(() => ({
                        data: { user_id: "user-123" },
                        error: null,
                    })),
                })),
            })),
        })),
    })),
}));

describe("POST /api/marketing/profiles/[profileId]/analyze-url", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("analyzes URL successfully", async () => {
        const request = new NextRequest(
            "http://localhost/api/marketing/profiles/profile-123/analyze-url",
            {
                method: "POST",
                body: JSON.stringify({ url: "https://instagram.com/user" }),
            }
        );

        const context = { params: Promise.resolve({ profileId: "profile-123" }) };
        const response = await POST(request, context);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.echo_mode_config).toBeDefined();
    });

    it("returns 400 when URL is missing", async () => {
        const request = new NextRequest(
            "http://localhost/api/marketing/profiles/profile-123/analyze-url",
            {
                method: "POST",
                body: JSON.stringify({}),
            }
        );

        const context = { params: Promise.resolve({ profileId: "profile-123" }) };
        const response = await POST(request, context);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("URL is required");
    });

    it("returns 400 when no content extracted", async () => {
        vi.mocked(
            await import("@/lib/marketing/social-scraper-service")
        ).scrapeAndExtractContent = vi.fn(() =>
            Promise.resolve({
                success: true,
                data: { content: [], platform: "instagram" },
            })
        );

        const request = new NextRequest(
            "http://localhost/api/marketing/profiles/profile-123/analyze-url",
            {
                method: "POST",
                body: JSON.stringify({ url: "https://instagram.com/user" }),
            }
        );

        const context = { params: Promise.resolve({ profileId: "profile-123" }) };
        const response = await POST(request, context);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("No content extracted");
    });
});
