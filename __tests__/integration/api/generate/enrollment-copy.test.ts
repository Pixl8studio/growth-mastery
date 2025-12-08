/**
 * Enrollment Copy Generation API Integration Tests
 * Tests the POST /api/generate/enrollment-copy endpoint
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/generate/enrollment-copy/route";
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
    createEnrollmentCopyPrompt: vi.fn(),
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

describe("POST /api/generate/enrollment-copy", () => {
    const mockUserId = "user-123";
    const mockOfferId = "offer-123e4567-e89b-12d3-a456-426614174000";
    const mockTranscriptId = "transcript-123e4567-e89b-12d3-a456-426614174000";

    const mockOffer = {
        id: mockOfferId,
        user_id: mockUserId,
        name: "Premium Coaching Program",
        tagline: "Transform Your Business",
        features: ["Feature 1", "Feature 2", "Feature 3"],
        bonuses: ["Bonus 1", "Bonus 2"],
        guarantee: "30-day money back",
    };

    const mockTranscript = {
        id: mockTranscriptId,
        user_id: mockUserId,
        transcript_text: "Sample transcript",
        extracted_data: { niche: "coaching" },
    };

    const mockEnrollmentCopy = {
        headline: "Ready to Transform Your Business?",
        subheadline: "Join the Premium Coaching Program today",
        benefits: [
            "Access to proven frameworks",
            "One-on-one coaching",
            "Lifetime support",
        ],
        cta_primary: "Enroll Now",
        cta_secondary: "Learn More",
        guarantee_text: "100% satisfaction guaranteed or your money back",
        testimonials_section: "What our clients say...",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should generate enrollment copy successfully for direct purchase", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        const { generateWithAI } = await import("@/lib/ai/client");
        const { createEnrollmentCopyPrompt } = await import("@/lib/ai/prompts");

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
                                            data: mockOffer,
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
        vi.mocked(generateWithAI).mockResolvedValue(mockEnrollmentCopy);
        vi.mocked(createEnrollmentCopyPrompt).mockReturnValue([
            { role: "system", content: "mock system prompt" },
            { role: "user", content: "mock user prompt" },
        ]);

        const request = new NextRequest(
            "http://localhost/api/generate/enrollment-copy",
            {
                method: "POST",
                body: JSON.stringify({
                    offerId: mockOfferId,
                    transcriptId: mockTranscriptId,
                    pageType: "direct_purchase",
                }),
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.copy).toEqual(mockEnrollmentCopy);
        expect(createEnrollmentCopyPrompt).toHaveBeenCalledWith(
            expect.any(Object),
            expect.any(Object),
            "direct_purchase"
        );
    });

    it("should generate enrollment copy successfully for book call", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        const { generateWithAI } = await import("@/lib/ai/client");
        const { createEnrollmentCopyPrompt } = await import("@/lib/ai/prompts");

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
                                            data: mockOffer,
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
        vi.mocked(generateWithAI).mockResolvedValue(mockEnrollmentCopy);
        vi.mocked(createEnrollmentCopyPrompt).mockReturnValue([
            { role: "system", content: "mock system prompt" },
            { role: "user", content: "mock user prompt" },
        ]);

        const request = new NextRequest(
            "http://localhost/api/generate/enrollment-copy",
            {
                method: "POST",
                body: JSON.stringify({
                    offerId: mockOfferId,
                    transcriptId: mockTranscriptId,
                    pageType: "book_call",
                }),
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(createEnrollmentCopyPrompt).toHaveBeenCalledWith(
            expect.any(Object),
            expect.any(Object),
            "book_call"
        );
    });

    it("should use default pageType when not provided", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        const { generateWithAI } = await import("@/lib/ai/client");
        const { createEnrollmentCopyPrompt } = await import("@/lib/ai/prompts");

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
                                            data: mockOffer,
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
        vi.mocked(generateWithAI).mockResolvedValue(mockEnrollmentCopy);
        vi.mocked(createEnrollmentCopyPrompt).mockReturnValue([
            { role: "system", content: "mock system prompt" },
            { role: "user", content: "mock user prompt" },
        ]);

        const request = new NextRequest(
            "http://localhost/api/generate/enrollment-copy",
            {
                method: "POST",
                body: JSON.stringify({
                    offerId: mockOfferId,
                    transcriptId: mockTranscriptId,
                }),
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(createEnrollmentCopyPrompt).toHaveBeenCalledWith(
            expect.any(Object),
            expect.any(Object),
            "direct_purchase"
        );
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
            "http://localhost/api/generate/enrollment-copy",
            {
                method: "POST",
                body: JSON.stringify({
                    offerId: mockOfferId,
                    transcriptId: mockTranscriptId,
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
            "http://localhost/api/generate/enrollment-copy",
            {
                method: "POST",
                body: JSON.stringify({
                    offerId: mockOfferId,
                    // Missing transcriptId
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for invalid UUID in offerId", async () => {
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
            "http://localhost/api/generate/enrollment-copy",
            {
                method: "POST",
                body: JSON.stringify({
                    offerId: "invalid-uuid",
                    transcriptId: mockTranscriptId,
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(400);
    });

    it("should return 400 for invalid enum value in pageType", async () => {
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
            "http://localhost/api/generate/enrollment-copy",
            {
                method: "POST",
                body: JSON.stringify({
                    offerId: mockOfferId,
                    transcriptId: mockTranscriptId,
                    pageType: "invalid_type",
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(400);
    });

    it("should return 400 when offer not found", async () => {
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
            "http://localhost/api/generate/enrollment-copy",
            {
                method: "POST",
                body: JSON.stringify({
                    offerId: mockOfferId,
                    transcriptId: mockTranscriptId,
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe("Offer not found");
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
                if (table === "offers") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: mockOffer,
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
            "http://localhost/api/generate/enrollment-copy",
            {
                method: "POST",
                body: JSON.stringify({
                    offerId: mockOfferId,
                    transcriptId: mockTranscriptId,
                }),
            }
        );

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
                if (table === "offers") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: mockOffer,
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

        const request = new NextRequest(
            "http://localhost/api/generate/enrollment-copy",
            {
                method: "POST",
                body: JSON.stringify({
                    offerId: mockOfferId,
                    transcriptId: mockTranscriptId,
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.error).toBe("Failed to generate enrollment copy");
    });
});
