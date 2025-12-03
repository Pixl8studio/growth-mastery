/**
 * Profile Calibrate API Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/marketing/profiles/[profileId]/calibrate/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/marketing/brand-voice-service", () => ({
    generateEchoModeProfile: vi.fn(() =>
        Promise.resolve({
            success: true,
            config: { voice_characteristics: ["professional"] },
            styleSummary: "Professional tone",
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

describe("POST /api/marketing/profiles/[profileId]/calibrate", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("calibrates profile successfully", async () => {
        const request = new NextRequest(
            "http://localhost/api/marketing/profiles/profile-123/calibrate",
            {
                method: "POST",
                body: JSON.stringify({
                    sample_content: ["Sample 1", "Sample 2"],
                }),
            }
        );

        const context = { params: Promise.resolve({ profileId: "profile-123" }) };
        const response = await POST(request, context);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.echo_mode_config).toBeDefined();
    });

    it("returns 400 when sample_content is missing", async () => {
        const request = new NextRequest(
            "http://localhost/api/marketing/profiles/profile-123/calibrate",
            {
                method: "POST",
                body: JSON.stringify({}),
            }
        );

        const context = { params: Promise.resolve({ profileId: "profile-123" }) };
        const response = await POST(request, context);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("sample_content is required");
    });

    it("returns 400 when sample_content is empty array", async () => {
        const request = new NextRequest(
            "http://localhost/api/marketing/profiles/profile-123/calibrate",
            {
                method: "POST",
                body: JSON.stringify({
                    sample_content: [],
                }),
            }
        );

        const context = { params: Promise.resolve({ profileId: "profile-123" }) };
        const response = await POST(request, context);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("At least one sample");
    });
});
