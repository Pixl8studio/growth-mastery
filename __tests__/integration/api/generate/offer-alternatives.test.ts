/**
 * Offer Alternatives Generation API Integration Tests
 * Tests the POST /api/generate/offer-alternatives endpoint
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/generate/offer-alternatives/route";
import { NextRequest } from "next/server";

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

// Mock AI client
vi.mock("@/lib/ai/client", () => ({
    generateTextWithAI: vi.fn(),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        child: vi.fn(() => ({
            info: vi.fn(),
            error: vi.fn(),
        })),
    },
}));

describe("POST /api/generate/offer-alternatives", () => {
    const mockUserId = "user-123";
    const mockBaseOfferId = "offer-123e4567-e89b-12d3-a456-426614174000";
    const mockProjectId = "project-123e4567-e89b-12d3-a456-426614174000";

    const mockBaseOffer = {
        id: mockBaseOfferId,
        user_id: mockUserId,
        funnel_project_id: mockProjectId,
        name: "Premium Coaching Program",
        tagline: "Transform Your Business",
        price: 997,
        currency: "USD",
        features: ["Feature 1", "Feature 2", "Feature 3"],
        bonuses: ["Bonus 1", "Bonus 2"],
        guarantee: "30-day money back",
        promise: "Transform your business",
        person: "Entrepreneurs",
        process: "Proven framework",
        purpose: "Achieve freedom",
        pathway: "direct_purchase",
    };

    const mockTranscript = {
        transcript_text: "Sample business transcript...",
        extracted_data: { niche: "coaching" },
    };

    const mockAIResponse = JSON.stringify({
        variations: [
            {
                type: "value",
                name: "Starter Coaching",
                tagline: "Get Started Today",
                price: 497,
                currency: "USD",
                promise: "Start your journey",
                person: "New entrepreneurs",
                process: "Simple framework",
                purpose: "Begin transformation",
                pathway: "direct_purchase",
                features: ["Feature 1", "Feature 2"],
                bonuses: ["Bonus 1"],
                guarantee: "14-day money back",
                keyDifference: "Lower price point for entry-level",
            },
            {
                type: "premium",
                name: "Elite Coaching",
                tagline: "Premium Experience",
                price: 1997,
                currency: "USD",
                promise: "Complete transformation",
                person: "Serious entrepreneurs",
                process: "Advanced framework",
                purpose: "Maximum results",
                pathway: "direct_purchase",
                features: ["Feature 1", "Feature 2", "Feature 3", "Feature 4"],
                bonuses: ["Bonus 1", "Bonus 2", "Bonus 3"],
                guarantee: "60-day money back",
                keyDifference: "Premium support and features",
            },
            {
                type: "scale",
                name: "Growth Coaching",
                tagline: "Scale Your Business",
                price: 997,
                currency: "USD",
                promise: "Scale effectively",
                person: "Growing entrepreneurs",
                process: "Balanced framework",
                purpose: "Sustainable growth",
                pathway: "direct_purchase",
                features: ["Feature 1", "Feature 2", "Feature 3"],
                bonuses: ["Bonus 1", "Bonus 2"],
                guarantee: "30-day money back",
                keyDifference: "Optimal conversion pricing",
            },
        ],
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should generate alternative offers successfully with valid input", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        const { generateTextWithAI } = await import("@/lib/ai/client");

        const mockSupabase = {
            auth: {
                getUser: vi.fn(() =>
                    Promise.resolve({
                        data: { user: { id: mockUserId, email: "test@example.com" } },
                        error: null,
                    })
                ),
            },
            from: vi.fn((table: string) => {
                if (table === "offers") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: mockBaseOffer,
                                            error: null,
                                        })
                                    ),
                                })),
                            })),
                        })),
                    };
                }
                if (table === "vapi_transcripts") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    order: vi.fn(() => ({
                                        limit: vi.fn(() =>
                                            Promise.resolve({
                                                data: [mockTranscript],
                                                error: null,
                                            })
                                        ),
                                    })),
                                })),
                            })),
                        })),
                    };
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(generateTextWithAI).mockResolvedValue(mockAIResponse);

        const request = new NextRequest(
            "http://localhost/api/generate/offer-alternatives",
            {
                method: "POST",
                body: JSON.stringify({
                    baseOfferId: mockBaseOfferId,
                    projectId: mockProjectId,
                }),
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.alternatives).toHaveLength(3);
        expect(data.alternatives[0].type).toBe("value");
        expect(data.alternatives[1].type).toBe("premium");
        expect(data.alternatives[2].type).toBe("scale");
    });

    it("should return 401 for unauthenticated users", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const mockSupabase = {
            auth: {
                getUser: vi.fn(() =>
                    Promise.resolve({
                        data: { user: null },
                        error: null,
                    })
                ),
            },
            from: vi.fn(),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = new NextRequest(
            "http://localhost/api/generate/offer-alternatives",
            {
                method: "POST",
                body: JSON.stringify({
                    baseOfferId: mockBaseOfferId,
                    projectId: mockProjectId,
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(401);
    });

    it("should return 400 for missing required fields", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const mockSupabase = {
            auth: {
                getUser: vi.fn(() =>
                    Promise.resolve({
                        data: { user: { id: mockUserId } },
                        error: null,
                    })
                ),
            },
            from: vi.fn(),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = new NextRequest(
            "http://localhost/api/generate/offer-alternatives",
            {
                method: "POST",
                body: JSON.stringify({
                    baseOfferId: mockBaseOfferId,
                    // Missing projectId
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for invalid UUID in baseOfferId", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const mockSupabase = {
            auth: {
                getUser: vi.fn(() =>
                    Promise.resolve({
                        data: { user: { id: mockUserId } },
                        error: null,
                    })
                ),
            },
            from: vi.fn(),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = new NextRequest(
            "http://localhost/api/generate/offer-alternatives",
            {
                method: "POST",
                body: JSON.stringify({
                    baseOfferId: "invalid-uuid",
                    projectId: mockProjectId,
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(400);
    });

    it("should return 400 for invalid UUID in projectId", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const mockSupabase = {
            auth: {
                getUser: vi.fn(() =>
                    Promise.resolve({
                        data: { user: { id: mockUserId } },
                        error: null,
                    })
                ),
            },
            from: vi.fn(),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = new NextRequest(
            "http://localhost/api/generate/offer-alternatives",
            {
                method: "POST",
                body: JSON.stringify({
                    baseOfferId: mockBaseOfferId,
                    projectId: "not-a-uuid",
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(400);
    });

    it("should return 400 when base offer not found", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const mockSupabase = {
            auth: {
                getUser: vi.fn(() =>
                    Promise.resolve({
                        data: { user: { id: mockUserId } },
                        error: null,
                    })
                ),
            },
            from: vi.fn((table: string) => {
                if (table === "offers") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: null,
                                            error: { message: "Not found" },
                                        })
                                    ),
                                })),
                            })),
                        })),
                    };
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = new NextRequest(
            "http://localhost/api/generate/offer-alternatives",
            {
                method: "POST",
                body: JSON.stringify({
                    baseOfferId: mockBaseOfferId,
                    projectId: mockProjectId,
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe("Base offer not found");
    });

    it("should return 500 when AI generation fails", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        const { generateTextWithAI } = await import("@/lib/ai/client");

        const mockSupabase = {
            auth: {
                getUser: vi.fn(() =>
                    Promise.resolve({
                        data: { user: { id: mockUserId } },
                        error: null,
                    })
                ),
            },
            from: vi.fn((table: string) => {
                if (table === "offers") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: mockBaseOffer,
                                            error: null,
                                        })
                                    ),
                                })),
                            })),
                        })),
                    };
                }
                if (table === "vapi_transcripts") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    order: vi.fn(() => ({
                                        limit: vi.fn(() =>
                                            Promise.resolve({
                                                data: [mockTranscript],
                                                error: null,
                                            })
                                        ),
                                    })),
                                })),
                            })),
                        })),
                    };
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(generateTextWithAI).mockRejectedValue(
            new Error("AI service unavailable")
        );

        const request = new NextRequest(
            "http://localhost/api/generate/offer-alternatives",
            {
                method: "POST",
                body: JSON.stringify({
                    baseOfferId: mockBaseOfferId,
                    projectId: mockProjectId,
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.error).toBe("Failed to generate alternative offers");
    });

    it("should handle generation without transcript context", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        const { generateTextWithAI } = await import("@/lib/ai/client");

        const mockSupabase = {
            auth: {
                getUser: vi.fn(() =>
                    Promise.resolve({
                        data: { user: { id: mockUserId } },
                        error: null,
                    })
                ),
            },
            from: vi.fn((table: string) => {
                if (table === "offers") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: mockBaseOffer,
                                            error: null,
                                        })
                                    ),
                                })),
                            })),
                        })),
                    };
                }
                if (table === "vapi_transcripts") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    order: vi.fn(() => ({
                                        limit: vi.fn(() =>
                                            Promise.resolve({
                                                data: [],
                                                error: null,
                                            })
                                        ),
                                    })),
                                })),
                            })),
                        })),
                    };
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(generateTextWithAI).mockResolvedValue(mockAIResponse);

        const request = new NextRequest(
            "http://localhost/api/generate/offer-alternatives",
            {
                method: "POST",
                body: JSON.stringify({
                    baseOfferId: mockBaseOfferId,
                    projectId: mockProjectId,
                }),
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.alternatives).toHaveLength(3);
    });
});
