/**
 * Profile By ID API Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT } from "@/app/api/marketing/profiles/[profileId]/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/marketing/brand-voice-service", () => ({
    getProfile: vi.fn(() =>
        Promise.resolve({
            success: true,
            profile: { id: "profile-123", user_id: "user-123" },
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
            update: vi.fn(() => ({
                eq: vi.fn(() => ({
                    select: vi.fn(() => ({
                        single: vi.fn(() => ({
                            data: { id: "profile-123" },
                            error: null,
                        })),
                    })),
                })),
            })),
        })),
    })),
}));

describe("GET /api/marketing/profiles/[profileId]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns profile successfully", async () => {
        const request = new NextRequest(
            "http://localhost/api/marketing/profiles/profile-123"
        );
        const context = { params: Promise.resolve({ profileId: "profile-123" }) };
        const response = await GET(request, context);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.profile).toBeDefined();
    });

    it("returns 401 for unauthorized access", async () => {
        vi.mocked(await import("@/lib/marketing/brand-voice-service")).getProfile =
            vi.fn(() =>
                Promise.resolve({
                    success: true,
                    profile: { id: "profile-123", user_id: "different-user" },
                })
            );

        const request = new NextRequest(
            "http://localhost/api/marketing/profiles/profile-123"
        );
        const context = { params: Promise.resolve({ profileId: "profile-123" }) };
        const response = await GET(request, context);

        expect(response.status).toBe(401);
    });
});

describe("PUT /api/marketing/profiles/[profileId]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("updates profile successfully", async () => {
        const request = new NextRequest(
            "http://localhost/api/marketing/profiles/profile-123",
            {
                method: "PUT",
                body: JSON.stringify({ name: "Updated Name" }),
            }
        );

        const context = { params: Promise.resolve({ profileId: "profile-123" }) };
        const response = await PUT(request, context);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });
});
