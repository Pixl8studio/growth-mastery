/**
 * Deck Structure Generation API Integration Tests
 * Tests the POST /api/generate/deck-structure endpoint
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/generate/deck-structure/route";
import { NextRequest } from "next/server";

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

// Mock AI client
vi.mock("@/lib/ai/client", () => ({
    generateTextWithAI: vi.fn(),
}));

// Mock file system
vi.mock("fs", () => ({
    default: {
        readFileSync: vi.fn(),
    },
}));

// Mock path
vi.mock("path", () => ({
    default: {
        join: vi.fn(),
    },
}));

describe("POST /api/generate/deck-structure", () => {
    const mockUserId = "123e4567-e89b-12d3-a456-426614174001";
    const mockTranscriptId = "223e4567-e89b-12d3-a456-426614174001";
    const mockProjectId = "323e4567-e89b-12d3-a456-426614174001";
    const mockDeckId = "423e4567-e89b-12d3-a456-426614174001";

    const mockTranscript = {
        id: mockTranscriptId,
        user_id: mockUserId,
        transcript_text: "Sample business transcript...",
        funnel_project_id: mockProjectId,
    };

    const mockFrameworkContent = `# Magnetic Masterclass Framework

## Slide 1: Hook
Introduction slide

## Slide 2: Problem
Problem statement

## Slide 3: Solution
Solution overview

## Slide 4: Process
How it works

## Slide 5: Call to Action
Next steps`;

    const mockGeneratedSlides = [
        {
            slideNumber: 1,
            title: "Welcome",
            description: "Introduction to the masterclass",
            section: "hook",
        },
        {
            slideNumber: 2,
            title: "The Problem",
            description: "Understanding the pain points",
            section: "problem",
        },
        {
            slideNumber: 3,
            title: "The Solution",
            description: "Our approach to solving it",
            section: "solution",
        },
        {
            slideNumber: 4,
            title: "The Process",
            description: "Step-by-step framework",
            section: "process",
        },
        {
            slideNumber: 5,
            title: "Next Steps",
            description: "How to get started",
            section: "close",
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should generate 5-slide test deck successfully", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        const { generateTextWithAI } = await import("@/lib/ai/client");
        const fs = (await import("fs")).default;
        const path = (await import("path")).default;

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
                if (table === "deck_structures") {
                    return {
                        insert: vi.fn(() => ({
                            select: vi.fn(() => ({
                                single: vi.fn(() =>
                                    Promise.resolve({
                                        data: {
                                            id: mockDeckId,
                                            slides: mockGeneratedSlides,
                                            template_type: "5_slide_test",
                                            presentation_type: "webinar",
                                            sections: {},
                                            metadata: {},
                                            created_at: new Date().toISOString(),
                                        },
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
        vi.mocked(path.join).mockReturnValue("/mock/path/to/framework.md");
        vi.mocked(fs.readFileSync).mockReturnValue(mockFrameworkContent);
        vi.mocked(generateTextWithAI).mockResolvedValue(
            JSON.stringify(mockGeneratedSlides)
        );

        const request = new NextRequest(
            "http://localhost/api/generate/deck-structure",
            {
                method: "POST",
                body: JSON.stringify({
                    transcriptId: mockTranscriptId,
                    projectId: mockProjectId,
                    slideCount: "5",
                    presentationType: "webinar",
                }),
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.deckStructure.slides).toHaveLength(5);
        expect(data.deckStructure.template_type).toBe("5_slide_test");
    });

    it("should generate full 55-slide deck successfully", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        const { generateTextWithAI } = await import("@/lib/ai/client");
        const fs = (await import("fs")).default;
        const path = (await import("path")).default;

        const mock55Slides = Array.from({ length: 55 }, (_, i) => ({
            slideNumber: i + 1,
            title: `Slide ${i + 1}`,
            description: `Content for slide ${i + 1}`,
            section: "hook",
        }));

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
                if (table === "deck_structures") {
                    return {
                        insert: vi.fn(() => ({
                            select: vi.fn(() => ({
                                single: vi.fn(() =>
                                    Promise.resolve({
                                        data: {
                                            id: mockDeckId,
                                            slides: mock55Slides,
                                            template_type: "webinar_full",
                                            presentation_type: "webinar",
                                            sections: {},
                                            metadata: {},
                                            created_at: new Date().toISOString(),
                                        },
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
        vi.mocked(path.join).mockReturnValue("/mock/path/to/framework.md");
        vi.mocked(fs.readFileSync).mockReturnValue(mockFrameworkContent.repeat(11));
        vi.mocked(generateTextWithAI).mockResolvedValue(
            JSON.stringify(mock55Slides.slice(0, 10))
        );

        const request = new NextRequest(
            "http://localhost/api/generate/deck-structure",
            {
                method: "POST",
                body: JSON.stringify({
                    transcriptId: mockTranscriptId,
                    projectId: mockProjectId,
                    slideCount: "55",
                    presentationType: "webinar",
                }),
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.deckStructure.template_type).toBe("webinar_full");
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
            "http://localhost/api/generate/deck-structure",
            {
                method: "POST",
                body: JSON.stringify({
                    transcriptId: mockTranscriptId,
                    projectId: mockProjectId,
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(401);
    });

    it("should return 400 for invalid UUID in transcriptId", async () => {
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
            "http://localhost/api/generate/deck-structure",
            {
                method: "POST",
                body: JSON.stringify({
                    transcriptId: "invalid-uuid",
                    projectId: mockProjectId,
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(400);
    });

    it("should return 400 for invalid enum value in slideCount", async () => {
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
            "http://localhost/api/generate/deck-structure",
            {
                method: "POST",
                body: JSON.stringify({
                    transcriptId: mockTranscriptId,
                    projectId: mockProjectId,
                    slideCount: "100", // Invalid, must be "5" or "55"
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(400);
    });

    it("should return 400 for invalid enum value in presentationType", async () => {
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
            "http://localhost/api/generate/deck-structure",
            {
                method: "POST",
                body: JSON.stringify({
                    transcriptId: mockTranscriptId,
                    projectId: mockProjectId,
                    presentationType: "invalid-type",
                }),
            }
        );

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

        const request = new NextRequest(
            "http://localhost/api/generate/deck-structure",
            {
                method: "POST",
                body: JSON.stringify({
                    transcriptId: mockTranscriptId,
                    projectId: mockProjectId,
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(400);
    });

    it("should return 400 when framework template file not found", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        const fs = (await import("fs")).default;
        const path = (await import("path")).default;

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
        vi.mocked(path.join).mockReturnValue("/mock/path/to/framework.md");
        vi.mocked(fs.readFileSync).mockImplementation(() => {
            throw new Error("ENOENT: no such file or directory");
        });

        const request = new NextRequest(
            "http://localhost/api/generate/deck-structure",
            {
                method: "POST",
                body: JSON.stringify({
                    transcriptId: mockTranscriptId,
                    projectId: mockProjectId,
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toContain("Framework template not found");
    });

    it("should return 500 when AI generation fails", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        const { generateTextWithAI } = await import("@/lib/ai/client");
        const fs = (await import("fs")).default;
        const path = (await import("path")).default;

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
        vi.mocked(path.join).mockReturnValue("/mock/path/to/framework.md");
        vi.mocked(fs.readFileSync).mockReturnValue(mockFrameworkContent);
        vi.mocked(generateTextWithAI).mockRejectedValue(new Error("AI error"));

        const request = new NextRequest(
            "http://localhost/api/generate/deck-structure",
            {
                method: "POST",
                body: JSON.stringify({
                    transcriptId: mockTranscriptId,
                    projectId: mockProjectId,
                    slideCount: "5",
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(500);
    });

    it("should return 500 when database save fails", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        const { generateTextWithAI } = await import("@/lib/ai/client");
        const fs = (await import("fs")).default;
        const path = (await import("path")).default;

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
                if (table === "deck_structures") {
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
        vi.mocked(path.join).mockReturnValue("/mock/path/to/framework.md");
        vi.mocked(fs.readFileSync).mockReturnValue(mockFrameworkContent);
        vi.mocked(generateTextWithAI).mockResolvedValue(
            JSON.stringify(mockGeneratedSlides)
        );

        const request = new NextRequest(
            "http://localhost/api/generate/deck-structure",
            {
                method: "POST",
                body: JSON.stringify({
                    transcriptId: mockTranscriptId,
                    projectId: mockProjectId,
                    slideCount: "5",
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(500);
    });
});
