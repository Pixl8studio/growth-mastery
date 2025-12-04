/**
 * Registration Page Rewrite Field API Integration Tests
 * Tests generating 3 AI-powered rewrite options for registration page fields
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/pages/registration/[pageId]/rewrite-field/route";
import { NextRequest } from "next/server";

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock auth
vi.mock("@/lib/auth", () => ({
    getCurrentUserWithProfile: vi.fn(async () => ({
        user: { id: "test-user-id", email: "test@example.com" },
        profile: { id: "test-profile-id" },
    })),
}));

// Mock AI client
vi.mock("@/lib/ai/client", () => ({
    generateTextWithAI: vi.fn(async () => "Rewritten content variation"),
}));

describe("POST /api/pages/registration/[pageId]/rewrite-field", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should generate 3 rewrite options successfully", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id/rewrite-field",
            {
                method: "POST",
                body: JSON.stringify({
                    fieldContent: "Register for our webinar today",
                    fieldType: "heading",
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.options).toBeDefined();
        expect(data.options.length).toBe(3);
        expect(data.options[0]).toHaveProperty("id");
        expect(data.options[0]).toHaveProperty("content");
        expect(data.options[0]).toHaveProperty("style");
    });

    it("should handle heading field type", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id/rewrite-field",
            {
                method: "POST",
                body: JSON.stringify({
                    fieldContent: "Join Our Masterclass",
                    fieldType: "heading",
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.options.length).toBe(3);
    });

    it("should handle subheading field type", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id/rewrite-field",
            {
                method: "POST",
                body: JSON.stringify({
                    fieldContent: "Learn the secrets to success",
                    fieldType: "subheading",
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.options.length).toBe(3);
    });

    it("should handle body field type", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id/rewrite-field",
            {
                method: "POST",
                body: JSON.stringify({
                    fieldContent: "This masterclass will teach you everything you need to know",
                    fieldType: "body",
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.options.length).toBe(3);
    });

    it("should handle cta field type", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id/rewrite-field",
            {
                method: "POST",
                body: JSON.stringify({
                    fieldContent: "Sign Up Now",
                    fieldType: "cta",
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.options.length).toBe(3);
    });

    it("should return 400 when fieldContent is missing", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id/rewrite-field",
            {
                method: "POST",
                body: JSON.stringify({
                    fieldType: "heading",
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("Missing required fields");
    });

    it("should return 400 when fieldType is missing", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id/rewrite-field",
            {
                method: "POST",
                body: JSON.stringify({
                    fieldContent: "Some content",
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("Missing required fields");
    });

    it("should handle AI generation errors", async () => {
        vi.mocked((await import("@/lib/ai/client")).generateTextWithAI).mockRejectedValueOnce(
            new Error("AI service error")
        );

        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id/rewrite-field",
            {
                method: "POST",
                body: JSON.stringify({
                    fieldContent: "Test content",
                    fieldType: "heading",
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to generate rewrites");
    });

    it("should use default styles for unknown field type", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id/rewrite-field",
            {
                method: "POST",
                body: JSON.stringify({
                    fieldContent: "Some content",
                    fieldType: "unknown",
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.options.length).toBe(3);
    });

    it("should generate different style variations", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id/rewrite-field",
            {
                method: "POST",
                body: JSON.stringify({
                    fieldContent: "Join Our Webinar",
                    fieldType: "heading",
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.options[0].style).toBe("Professional and Direct");
        expect(data.options[1].style).toBe("Conversational and Engaging");
        expect(data.options[2].style).toBe("Action-Oriented and Urgent");
    });

    it("should handle authentication errors", async () => {
        vi.mocked((await import("@/lib/auth")).getCurrentUserWithProfile).mockRejectedValueOnce(
            new Error("Unauthorized")
        );

        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id/rewrite-field",
            {
                method: "POST",
                body: JSON.stringify({
                    fieldContent: "Test content",
                    fieldType: "heading",
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to generate rewrites");
    });
});
