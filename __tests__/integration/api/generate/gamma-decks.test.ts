/**
 * Gamma Decks Generation API Integration Tests
 * Tests the POST /api/generate/gamma-decks endpoint
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/generate/gamma-decks/route";
import { NextRequest } from "next/server";

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

describe("POST /api/generate/gamma-decks", () => {
    const mockUserId = "user-123";
    const mockProjectId = "project-123e4567-e89b-12d3-a456-426614174000";
    const mockDeckStructureId = "deck-123e4567-e89b-12d3-a456-426614174000";
    const mockGammaDeckId = "gamma-123e4567-e89b-12d3-a456-426614174000";
    const mockGenerationId = "gen-abc123";

    const mockProject = {
        id: mockProjectId,
        user_id: mockUserId,
        name: "My Presentation",
    };

    const mockDeckStructure = {
        id: mockDeckStructureId,
        user_id: mockUserId,
        template_type: "5_slide_test",
        slides: [
            { slideNumber: 1, title: "Slide 1", description: "Content 1" },
            { slideNumber: 2, title: "Slide 2", description: "Content 2" },
        ],
        metadata: {
            title: "Test Deck",
        },
    };

    const mockBrandDesign = {
        id: "brand-123",
        funnel_project_id: mockProjectId,
        user_id: mockUserId,
        primary_color: "#FF5733",
        secondary_color: "#33FF57",
        accent_color: "#3357FF",
        design_style: "modern",
        personality_traits: { tone: "professional" },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Set mock environment variable
        process.env.GAMMA_API_KEY = "test-gamma-api-key";
    });

    it("should generate Gamma deck successfully", async () => {
        const { createClient } = await import("@/lib/supabase/server");

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
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: mockProject,
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
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: mockDeckStructure,
                                            error: null,
                                        })
                                    ),
                                })),
                            })),
                        })),
                    };
                }
                if (table === "brand_designs") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    maybeSingle: vi.fn(() =>
                                        Promise.resolve({
                                            data: mockBrandDesign,
                                            error: null,
                                        })
                                    ),
                                })),
                            })),
                        })),
                    };
                }
                if (table === "gamma_decks") {
                    return {
                        insert: vi.fn(() => ({
                            select: vi.fn(() => ({
                                single: vi.fn(() =>
                                    Promise.resolve({
                                        data: {
                                            id: mockGammaDeckId,
                                            funnel_project_id: mockProjectId,
                                            deck_structure_id: mockDeckStructureId,
                                            user_id: mockUserId,
                                            title: `${mockProject.name} - Gamma Presentation`,
                                            status: "generating",
                                            created_at: new Date().toISOString(),
                                        },
                                        error: null,
                                    })
                                ),
                            })),
                        })),
                        update: vi.fn(() => ({
                            eq: vi.fn(() =>
                                Promise.resolve({
                                    data: {},
                                    error: null,
                                })
                            ),
                            select: vi.fn(() => ({
                                single: vi.fn(() =>
                                    Promise.resolve({
                                        data: {
                                            id: mockGammaDeckId,
                                            status: "completed",
                                            deck_url: "https://gamma.app/docs/abc123",
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

        // Mock global fetch for Gamma API
        global.fetch = vi.fn((url: string | URL | Request) => {
            const urlString = url.toString();

            // Start generation call
            if (urlString.includes("/v0.2/generations") && !urlString.includes("/gen-")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ generationId: mockGenerationId }),
                } as Response);
            }

            // Status check call
            if (urlString.includes(`/v0.2/generations/${mockGenerationId}`)) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        status: "completed",
                        generationId: mockGenerationId,
                        gammaUrl: "https://gamma.app/docs/abc123",
                        credits: { deducted: 10, remaining: 90 },
                    }),
                } as Response);
            }

            return Promise.reject(new Error("Unexpected fetch call"));
        });

        const request = new NextRequest(
            "http://localhost/api/generate/gamma-decks",
            {
                method: "POST",
                body: JSON.stringify({
                    projectId: mockProjectId,
                    deckStructureId: mockDeckStructureId,
                    settings: {
                        theme: "nebulae",
                        style: "professional",
                        length: "full",
                    },
                }),
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.gammaDeck.id).toBeDefined();
        expect(data.gammaDeck.status).toBe("completed");
        expect(data.gammaDeck.deck_url).toBe("https://gamma.app/docs/abc123");
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
            "http://localhost/api/generate/gamma-decks",
            {
                method: "POST",
                body: JSON.stringify({
                    projectId: mockProjectId,
                    deckStructureId: mockDeckStructureId,
                    settings: { theme: "nebulae" },
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
            "http://localhost/api/generate/gamma-decks",
            {
                method: "POST",
                body: JSON.stringify({
                    projectId: mockProjectId,
                    // Missing deckStructureId
                    settings: {},
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
            "http://localhost/api/generate/gamma-decks",
            {
                method: "POST",
                body: JSON.stringify({
                    projectId: "invalid-uuid",
                    deckStructureId: mockDeckStructureId,
                    settings: {},
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(400);
    });

    it("should return 400 when project not found", async () => {
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
                if (table === "funnel_projects") {
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
            "http://localhost/api/generate/gamma-decks",
            {
                method: "POST",
                body: JSON.stringify({
                    projectId: mockProjectId,
                    deckStructureId: mockDeckStructureId,
                    settings: {},
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(400);
    });

    it("should return 400 when deck structure not found", async () => {
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
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: mockProject,
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
            "http://localhost/api/generate/gamma-decks",
            {
                method: "POST",
                body: JSON.stringify({
                    projectId: mockProjectId,
                    deckStructureId: mockDeckStructureId,
                    settings: {},
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(400);
    });

    it("should handle Gamma API start generation failure", async () => {
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
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: mockProject,
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
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: mockDeckStructure,
                                            error: null,
                                        })
                                    ),
                                })),
                            })),
                        })),
                    };
                }
                if (table === "brand_designs") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    maybeSingle: vi.fn(() =>
                                        Promise.resolve({
                                            data: null,
                                            error: null,
                                        })
                                    ),
                                })),
                            })),
                        })),
                    };
                }
                if (table === "gamma_decks") {
                    return {
                        insert: vi.fn(() => ({
                            select: vi.fn(() => ({
                                single: vi.fn(() =>
                                    Promise.resolve({
                                        data: {
                                            id: mockGammaDeckId,
                                            created_at: new Date().toISOString(),
                                        },
                                        error: null,
                                    })
                                ),
                            })),
                        })),
                        update: vi.fn(() => ({
                            eq: vi.fn(() => Promise.resolve({ data: {}, error: null })),
                        })),
                    };
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        // Mock fetch to fail on generation start
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: false,
                status: 500,
                text: async () => "Gamma API error",
            } as Response)
        );

        const request = new NextRequest(
            "http://localhost/api/generate/gamma-decks",
            {
                method: "POST",
                body: JSON.stringify({
                    projectId: mockProjectId,
                    deckStructureId: mockDeckStructureId,
                    settings: {},
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(500);
    });

    it("should handle database save failure", async () => {
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
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: mockProject,
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
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: mockDeckStructure,
                                            error: null,
                                        })
                                    ),
                                })),
                            })),
                        })),
                    };
                }
                if (table === "brand_designs") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    maybeSingle: vi.fn(() =>
                                        Promise.resolve({
                                            data: null,
                                            error: null,
                                        })
                                    ),
                                })),
                            })),
                        })),
                    };
                }
                if (table === "gamma_decks") {
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

        const request = new NextRequest(
            "http://localhost/api/generate/gamma-decks",
            {
                method: "POST",
                body: JSON.stringify({
                    projectId: mockProjectId,
                    deckStructureId: mockDeckStructureId,
                    settings: {},
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(500);
    });

    it("should work without brand design", async () => {
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
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: mockProject,
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
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: mockDeckStructure,
                                            error: null,
                                        })
                                    ),
                                })),
                            })),
                        })),
                    };
                }
                if (table === "brand_designs") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    maybeSingle: vi.fn(() =>
                                        Promise.resolve({
                                            data: null,
                                            error: null,
                                        })
                                    ),
                                })),
                            })),
                        })),
                    };
                }
                if (table === "gamma_decks") {
                    return {
                        insert: vi.fn(() => ({
                            select: vi.fn(() => ({
                                single: vi.fn(() =>
                                    Promise.resolve({
                                        data: {
                                            id: mockGammaDeckId,
                                            created_at: new Date().toISOString(),
                                        },
                                        error: null,
                                    })
                                ),
                            })),
                        })),
                        update: vi.fn(() => ({
                            eq: vi.fn(() =>
                                Promise.resolve({
                                    data: {},
                                    error: null,
                                })
                            ),
                            select: vi.fn(() => ({
                                single: vi.fn(() =>
                                    Promise.resolve({
                                        data: {
                                            id: mockGammaDeckId,
                                            status: "completed",
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

        global.fetch = vi.fn((url: string | URL | Request) => {
            const urlString = url.toString();
            if (urlString.includes("/v0.2/generations") && !urlString.includes("/gen-")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ generationId: mockGenerationId }),
                } as Response);
            }
            if (urlString.includes(`/v0.2/generations/${mockGenerationId}`)) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        status: "completed",
                        generationId: mockGenerationId,
                        gammaUrl: "https://gamma.app/docs/abc123",
                    }),
                } as Response);
            }
            return Promise.reject(new Error("Unexpected fetch"));
        });

        const request = new NextRequest(
            "http://localhost/api/generate/gamma-decks",
            {
                method: "POST",
                body: JSON.stringify({
                    projectId: mockProjectId,
                    deckStructureId: mockDeckStructureId,
                    settings: {},
                }),
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });
});
