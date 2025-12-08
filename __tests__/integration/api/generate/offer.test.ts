/**
 * Offer Generation API Integration Tests
 * Tests the POST /api/generate/offer endpoint
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/generate/offer/route";
import { NextRequest } from "next/server";

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

// Mock AI client
vi.mock("@/lib/ai/client", () => ({
    generateWithAI: vi.fn(),
}));

// Mock prompts
vi.mock("@/lib/ai/prompts", () => ({
    createOfferGenerationPrompt: vi.fn(),
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

describe("POST /api/generate/offer", () => {
    const mockUserId = "user-123";
    const mockTranscriptId = "transcript-123e4567-e89b-12d3-a456-426614174000";
    const mockProjectId = "project-123e4567-e89b-12d3-a456-426614174000";
    const mockOfferId = "offer-123e4567-e89b-12d3-a456-426614174000";

    const mockTranscript = {
        id: mockTranscriptId,
        user_id: mockUserId,
        transcript_text: "Sample transcript text about business",
        extracted_data: { niche: "coaching" },
        funnel_project_id: mockProjectId,
    };

    const mockGeneratedOffer = {
        name: "Premium Coaching Program",
        tagline: "Transform Your Business",
        price: 997,
        currency: "USD",
        features: ["Feature 1", "Feature 2", "Feature 3"],
        bonuses: ["Bonus 1", "Bonus 2"],
        guarantee: "30-day money back",
        promise: "Transform your business in 90 days",
        person: "Struggling entrepreneurs",
        process: "Our proven framework",
        purpose: "To help you achieve freedom",
        pathway: "direct_purchase",
    };

    const mockSavedOffer = {
        id: mockOfferId,
        ...mockGeneratedOffer,
        funnel_project_id: mockProjectId,
        user_id: mockUserId,
        max_features: 6,
        max_bonuses: 5,
        created_at: new Date().toISOString(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should generate and save offer successfully with valid input", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        const { generateWithAI } = await import("@/lib/ai/client");
        const { createOfferGenerationPrompt } = await import("@/lib/ai/prompts");

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
                if (table === "vapi_transcripts") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: mockTranscript,
                                            error: null,
                                        })
                                    ),
                                })),
                            })),
                        })),
                    };
                }
                if (table === "offers") {
                    return {
                        insert: vi.fn(() => ({
                            select: vi.fn(() => ({
                                single: vi.fn(() =>
                                    Promise.resolve({
                                        data: mockSavedOffer,
                                        error: null,
                                    })
                                ),
                            })),
                        })),
                    };
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(generateWithAI).mockResolvedValue(mockGeneratedOffer);
        vi.mocked(createOfferGenerationPrompt).mockReturnValue([
            { role: "system", content: "mock system prompt" },
            { role: "user", content: "mock user prompt" },
        ]);

        const request = new NextRequest("http://localhost/api/generate/offer", {
            method: "POST",
            body: JSON.stringify({
                transcriptId: mockTranscriptId,
                projectId: mockProjectId,
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.offer).toBeDefined();
        expect(data.offer.id).toBe(mockOfferId);
        expect(data.offer.name).toBe("Premium Coaching Program");
        expect(data.offer.price).toBe(997);
        expect(generateWithAI).toHaveBeenCalledWith("mock prompt");
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

        const request = new NextRequest("http://localhost/api/generate/offer", {
            method: "POST",
            body: JSON.stringify({
                transcriptId: mockTranscriptId,
                projectId: mockProjectId,
            }),
        });

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

        const request = new NextRequest("http://localhost/api/generate/offer", {
            method: "POST",
            body: JSON.stringify({
                transcriptId: mockTranscriptId,
                // Missing projectId
            }),
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe("Invalid input");
        expect(data.details).toBeDefined();
    });

    it("should return 400 for invalid UUID format in transcriptId", async () => {
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

        const request = new NextRequest("http://localhost/api/generate/offer", {
            method: "POST",
            body: JSON.stringify({
                transcriptId: "invalid-uuid",
                projectId: mockProjectId,
            }),
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for invalid UUID format in projectId", async () => {
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

        const request = new NextRequest("http://localhost/api/generate/offer", {
            method: "POST",
            body: JSON.stringify({
                transcriptId: mockTranscriptId,
                projectId: "not-a-valid-uuid",
            }),
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
    });

    it("should return 400 when transcript not found", async () => {
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
                if (table === "vapi_transcripts") {
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

        const request = new NextRequest("http://localhost/api/generate/offer", {
            method: "POST",
            body: JSON.stringify({
                transcriptId: mockTranscriptId,
                projectId: mockProjectId,
            }),
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe("Transcript not found");
    });

    it("should return 500 when AI generation fails", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        const { generateWithAI } = await import("@/lib/ai/client");

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
                if (table === "vapi_transcripts") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: mockTranscript,
                                            error: null,
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
        vi.mocked(generateWithAI).mockRejectedValue(new Error("AI service error"));

        const request = new NextRequest("http://localhost/api/generate/offer", {
            method: "POST",
            body: JSON.stringify({
                transcriptId: mockTranscriptId,
                projectId: mockProjectId,
            }),
        });

        const response = await POST(request);
        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.error).toBe("Failed to generate offer");
    });

    it("should return 500 when database save fails", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        const { generateWithAI } = await import("@/lib/ai/client");

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
                if (table === "vapi_transcripts") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: mockTranscript,
                                            error: null,
                                        })
                                    ),
                                })),
                            })),
                        })),
                    };
                }
                if (table === "offers") {
                    return {
                        insert: vi.fn(() => ({
                            select: vi.fn(() => ({
                                single: vi.fn(() =>
                                    Promise.resolve({
                                        data: null,
                                        error: { message: "Database error" },
                                    })
                                ),
                            })),
                        })),
                    };
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(generateWithAI).mockResolvedValue(mockGeneratedOffer);

        const request = new NextRequest("http://localhost/api/generate/offer", {
            method: "POST",
            body: JSON.stringify({
                transcriptId: mockTranscriptId,
                projectId: mockProjectId,
            }),
        });

        const response = await POST(request);
        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.error).toBe("Failed to generate offer");
    });
});
