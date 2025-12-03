/**
 * Marketing Profiles API Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/marketing/profiles/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/marketing/brand-voice-service", () => ({
    initializeProfile: vi.fn(() =>
        Promise.resolve({
            success: true,
            profile: { id: "profile-123", name: "Test Profile" },
        })
    ),
    listProfiles: vi.fn(() =>
        Promise.resolve({
            success: true,
            profiles: [{ id: "profile-1" }],
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

describe("POST /api/marketing/profiles", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("creates profile successfully", async () => {
        const request = new NextRequest("http://localhost/api/marketing/profiles", {
            method: "POST",
            body: JSON.stringify({
                funnel_project_id: "project-123",
                name: "Test Profile",
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.profile).toBeDefined();
    });

    it("returns 400 when funnel_project_id is missing", async () => {
        const request = new NextRequest("http://localhost/api/marketing/profiles", {
            method: "POST",
            body: JSON.stringify({ name: "Test Profile" }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("funnel_project_id is required");
    });
});

describe("GET /api/marketing/profiles", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns profiles successfully", async () => {
        const request = new NextRequest("http://localhost/api/marketing/profiles");
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.profiles).toBeDefined();
    });
});
