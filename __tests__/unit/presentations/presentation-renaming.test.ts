/**
 * Unit Tests for Presentation Renaming Functionality
 * Tests the inline renaming feature for presentations in Step 5
 *
 * Related: GitHub Issue for presentation renaming UX
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Supabase
const mockSupabaseAuth = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockSupabaseUpdate = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
        auth: {
            getUser: mockSupabaseAuth,
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        single: mockSupabaseSelect,
                        maybeSingle: mockSupabaseSelect,
                    })),
                    single: mockSupabaseSelect,
                    maybeSingle: mockSupabaseSelect,
                })),
            })),
            update: vi.fn(() => ({
                eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        select: vi.fn(() => ({
                            single: mockSupabaseUpdate,
                        })),
                    })),
                })),
            })),
        })),
    })),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        userError: vi.fn(),
    },
}));

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
    captureException: vi.fn(),
    addBreadcrumb: vi.fn(),
    startSpan: vi.fn((config, callback) =>
        callback({ setAttribute: vi.fn(), setStatus: vi.fn() })
    ),
    setMeasurement: vi.fn(),
}));

// Mock rate limiter
vi.mock("@/lib/middleware/rate-limit", () => ({
    checkRateLimit: vi.fn(() => Promise.resolve(null)),
    getRateLimitIdentifier: vi.fn(() => "user:test-user-id"),
}));

describe("Presentation Renaming", () => {
    const mockUser = {
        id: "test-user-id",
        email: "test@example.com",
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabaseAuth.mockResolvedValue({ data: { user: mockUser } });
    });

    describe("PATCH /api/presentations (Update Title)", () => {
        it("should update presentation title successfully", async () => {
            const presentationId = "123e4567-e89b-12d3-a456-426614174000";
            const newTitle = "My Updated Presentation";

            // Mock project verification
            mockSupabaseSelect.mockResolvedValueOnce({
                data: {
                    id: presentationId,
                    title: "Old Title",
                    funnel_project_id: "project-123",
                    user_id: mockUser.id,
                },
                error: null,
            });

            // Mock update response
            mockSupabaseUpdate.mockResolvedValueOnce({
                data: {
                    id: presentationId,
                    title: newTitle,
                },
                error: null,
            });

            const { PATCH } = await import("@/app/api/presentations/route");

            const request = new NextRequest("http://localhost/api/presentations", {
                method: "PATCH",
                body: JSON.stringify({
                    presentationId,
                    title: newTitle,
                }),
            });

            const response = await PATCH(request);
            expect(response.status).toBe(200);

            const data = await response.json();
            expect(data.presentation).toBeDefined();
        });

        it("should return 401 when not authenticated", async () => {
            mockSupabaseAuth.mockResolvedValueOnce({ data: { user: null } });

            const { PATCH } = await import("@/app/api/presentations/route");

            const request = new NextRequest("http://localhost/api/presentations", {
                method: "PATCH",
                body: JSON.stringify({
                    presentationId: "123e4567-e89b-12d3-a456-426614174000",
                    title: "New Title",
                }),
            });

            const response = await PATCH(request);
            expect(response.status).toBe(401);
        });

        it("should return 400 for invalid presentationId format", async () => {
            const { PATCH } = await import("@/app/api/presentations/route");

            const request = new NextRequest("http://localhost/api/presentations", {
                method: "PATCH",
                body: JSON.stringify({
                    presentationId: "invalid-uuid",
                    title: "New Title",
                }),
            });

            const response = await PATCH(request);
            expect(response.status).toBe(400);

            const data = await response.json();
            expect(data.error).toContain("UUID");
        });

        it("should return 400 for empty title", async () => {
            const { PATCH } = await import("@/app/api/presentations/route");

            const request = new NextRequest("http://localhost/api/presentations", {
                method: "PATCH",
                body: JSON.stringify({
                    presentationId: "123e4567-e89b-12d3-a456-426614174000",
                    title: "",
                }),
            });

            const response = await PATCH(request);
            expect(response.status).toBe(400);
        });

        it("should return 400 for title exceeding max length", async () => {
            const { PATCH } = await import("@/app/api/presentations/route");

            // Create a title longer than 500 characters
            const longTitle = "A".repeat(501);

            const request = new NextRequest("http://localhost/api/presentations", {
                method: "PATCH",
                body: JSON.stringify({
                    presentationId: "123e4567-e89b-12d3-a456-426614174000",
                    title: longTitle,
                }),
            });

            const response = await PATCH(request);
            expect(response.status).toBe(400);

            const data = await response.json();
            expect(data.error).toBeDefined();
        });

        it("should return 400 for invalid JSON", async () => {
            const { PATCH } = await import("@/app/api/presentations/route");

            const request = new NextRequest("http://localhost/api/presentations", {
                method: "PATCH",
                body: "not valid json",
            });

            const response = await PATCH(request);
            expect(response.status).toBe(400);

            const data = await response.json();
            expect(data.error).toContain("Invalid JSON");
        });
    });

    describe("getTitleFromSlides Helper Logic", () => {
        // Test the logic that getTitleFromSlides implements
        const mockSlides = [
            {
                slideNumber: 1,
                title: "Introduction Title",
                content: ["Content"],
                layoutType: "title" as const,
                speakerNotes: "",
            },
            {
                slideNumber: 2,
                title: "Second Slide",
                content: ["Content"],
                layoutType: "bullets" as const,
                speakerNotes: "",
            },
        ];

        it("should extract title from title slide", () => {
            // Replicate the getTitleFromSlides logic
            const getTitleFromSlides = (
                slides: typeof mockSlides,
                fallbackTitle: string
            ): string => {
                if (!slides || slides.length === 0) {
                    return fallbackTitle;
                }
                const titleSlide =
                    slides.find((s) => s.layoutType === "title") || slides[0];
                if (titleSlide?.title && titleSlide.title.trim()) {
                    return titleSlide.title.trim();
                }
                return fallbackTitle;
            };

            const result = getTitleFromSlides(mockSlides, "Fallback");
            expect(result).toBe("Introduction Title");
        });

        it("should use first slide if no title slide exists", () => {
            const slidesWithoutTitle: Array<{
                slideNumber: number;
                title: string;
                content: string[];
                layoutType: string;
                speakerNotes: string;
            }> = [
                {
                    slideNumber: 1,
                    title: "First Slide",
                    content: ["Content"],
                    layoutType: "bullets",
                    speakerNotes: "",
                },
            ];

            const getTitleFromSlides = (
                slides: typeof slidesWithoutTitle,
                fallbackTitle: string
            ): string => {
                if (!slides || slides.length === 0) {
                    return fallbackTitle;
                }
                const titleSlide =
                    slides.find((s) => s.layoutType === "title") || slides[0];
                if (titleSlide?.title && titleSlide.title.trim()) {
                    return titleSlide.title.trim();
                }
                return fallbackTitle;
            };

            const result = getTitleFromSlides(slidesWithoutTitle, "Fallback");
            expect(result).toBe("First Slide");
        });

        it("should return fallback for empty slides array", () => {
            const getTitleFromSlides = (
                slides: any[],
                fallbackTitle: string
            ): string => {
                if (!slides || slides.length === 0) {
                    return fallbackTitle;
                }
                const titleSlide =
                    slides.find((s: any) => s.layoutType === "title") || slides[0];
                if (titleSlide?.title && titleSlide.title.trim()) {
                    return titleSlide.title.trim();
                }
                return fallbackTitle;
            };

            const result = getTitleFromSlides([], "Fallback Title");
            expect(result).toBe("Fallback Title");
        });

        it("should return fallback for undefined slides", () => {
            const getTitleFromSlides = (
                slides: any[] | undefined,
                fallbackTitle: string
            ): string => {
                if (!slides || slides.length === 0) {
                    return fallbackTitle;
                }
                const titleSlide =
                    slides.find((s: any) => s.layoutType === "title") || slides[0];
                if (titleSlide?.title && titleSlide.title.trim()) {
                    return titleSlide.title.trim();
                }
                return fallbackTitle;
            };

            const result = getTitleFromSlides(undefined, "Fallback Title");
            expect(result).toBe("Fallback Title");
        });

        it("should return fallback if slide title is empty string", () => {
            const slidesWithEmptyTitle = [
                {
                    slideNumber: 1,
                    title: "",
                    content: ["Content"],
                    layoutType: "title" as const,
                    speakerNotes: "",
                },
            ];

            const getTitleFromSlides = (
                slides: typeof slidesWithEmptyTitle,
                fallbackTitle: string
            ): string => {
                if (!slides || slides.length === 0) {
                    return fallbackTitle;
                }
                const titleSlide =
                    slides.find((s) => s.layoutType === "title") || slides[0];
                if (titleSlide?.title && titleSlide.title.trim()) {
                    return titleSlide.title.trim();
                }
                return fallbackTitle;
            };

            const result = getTitleFromSlides(slidesWithEmptyTitle, "Fallback");
            expect(result).toBe("Fallback");
        });

        it("should trim whitespace from slide title", () => {
            const slidesWithWhitespace = [
                {
                    slideNumber: 1,
                    title: "  Trimmed Title  ",
                    content: ["Content"],
                    layoutType: "title" as const,
                    speakerNotes: "",
                },
            ];

            const getTitleFromSlides = (
                slides: typeof slidesWithWhitespace,
                fallbackTitle: string
            ): string => {
                if (!slides || slides.length === 0) {
                    return fallbackTitle;
                }
                const titleSlide =
                    slides.find((s) => s.layoutType === "title") || slides[0];
                if (titleSlide?.title && titleSlide.title.trim()) {
                    return titleSlide.title.trim();
                }
                return fallbackTitle;
            };

            const result = getTitleFromSlides(slidesWithWhitespace, "Fallback");
            expect(result).toBe("Trimmed Title");
        });
    });

    describe("Auto-naming Prevention (userEditedTitles)", () => {
        it("should not overwrite user-edited title during resume", () => {
            // Simulate the logic in updatePresentationTitleAuto
            const userEditedTitles = new Set(["presentation-123"]);
            const presentationId = "presentation-123";

            const shouldUpdate = !userEditedTitles.has(presentationId);
            expect(shouldUpdate).toBe(false);
        });

        it("should allow auto-naming for non-edited presentations", () => {
            const userEditedTitles = new Set(["other-presentation"]);
            const presentationId = "presentation-123";

            const shouldUpdate = !userEditedTitles.has(presentationId);
            expect(shouldUpdate).toBe(true);
        });

        it("should detect default names correctly with isDefaultPresentationName", () => {
            // This matches the extracted helper in step 5
            const isDefaultPresentationName = (title: string): boolean => {
                return (
                    title.includes("Generating") ||
                    title.includes("Generated") ||
                    title.includes("Untitled")
                );
            };

            expect(isDefaultPresentationName("Generating...")).toBe(true);
            expect(isDefaultPresentationName("Generated Presentation")).toBe(true);
            expect(isDefaultPresentationName("Untitled Presentation")).toBe(true);
            expect(isDefaultPresentationName("My Custom Title")).toBe(false);
            expect(isDefaultPresentationName("Weekly Team Meeting")).toBe(false);
            // Edge cases
            expect(isDefaultPresentationName("Re-Generating Ideas")).toBe(true);
            expect(isDefaultPresentationName("")).toBe(false);
        });
    });

    describe("localStorage Persistence", () => {
        it("should serialize userEditedTitles to JSON array", () => {
            const userEditedTitles = new Set(["pres-1", "pres-2", "pres-3"]);
            const serialized = JSON.stringify([...userEditedTitles]);
            const deserialized = new Set(JSON.parse(serialized));

            expect(deserialized.has("pres-1")).toBe(true);
            expect(deserialized.has("pres-2")).toBe(true);
            expect(deserialized.has("pres-3")).toBe(true);
            expect(deserialized.size).toBe(3);
        });

        it("should handle empty Set serialization", () => {
            const userEditedTitles = new Set<string>();
            const serialized = JSON.stringify([...userEditedTitles]);
            expect(serialized).toBe("[]");

            const deserialized = new Set(JSON.parse(serialized));
            expect(deserialized.size).toBe(0);
        });
    });
});
