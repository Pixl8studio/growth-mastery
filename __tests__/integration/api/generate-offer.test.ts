/**
 * Offer Generation API Integration Tests
 * Test the offer generation endpoint
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/generate/offer/route";
import { NextRequest } from "next/server";

// Mock Supabase client
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
        auth: {
            getUser: vi.fn(() => ({
                data: { user: { id: "test-user-id", email: "test@example.com" } },
            })),
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        single: vi.fn(() => ({
                            data: {
                                id: "test-transcript-id",
                                transcript_text: "Test transcript about a business",
                                extracted_data: {},
                            },
                            error: null,
                        })),
                    })),
                })),
            })),
        })),
    })),
}));

// Mock AI client
vi.mock("@/lib/ai/client", () => ({
    generateWithAI: vi.fn(async () => ({
        name: "Test Offer",
        tagline: "Test tagline",
        price: 997,
        currency: "USD",
        features: ["Feature 1", "Feature 2"],
        bonuses: ["Bonus 1"],
        guarantee: "30-day guarantee",
    })),
}));

describe("POST /api/generate/offer", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should generate offer successfully", async () => {
        const request = new NextRequest("http://localhost:3000/api/generate/offer", {
            method: "POST",
            body: JSON.stringify({
                transcriptId: "test-transcript-id",
                projectId: "test-project-id",
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.offer).toBeDefined();
        expect(data.offer.name).toBe("Test Offer");
        expect(data.offer.price).toBe(997);
    });

    it("should return 400 for missing parameters", async () => {
        const request = new NextRequest("http://localhost:3000/api/generate/offer", {
            method: "POST",
            body: JSON.stringify({}),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBeDefined();
    });
});
