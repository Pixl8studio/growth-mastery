/**
 * Unit Tests for Presentation API Routes
 * Tests validation, authentication, and error handling
 *
 * Related: GitHub Issue #325 - In-house PowerPoint Presentation Generator
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Supabase
const mockSupabaseAuth = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockSupabaseInsert = vi.fn();
const mockSupabaseUpdate = vi.fn();
const mockSupabaseDelete = vi.fn();

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
                single: mockSupabaseSelect,
                maybeSingle: mockSupabaseSelect,
            })),
            insert: vi.fn(() => ({
                select: vi.fn(() => ({
                    single: mockSupabaseInsert,
                })),
            })),
            update: vi.fn(() => ({
                eq: mockSupabaseUpdate,
            })),
            delete: vi.fn(() => ({
                eq: mockSupabaseDelete,
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

// Mock slide generator
vi.mock("@/lib/presentations/slide-generator", () => ({
    generatePresentation: vi.fn(() =>
        Promise.resolve([
            {
                slideNumber: 1,
                title: "Test Slide",
                content: ["Content"],
                speakerNotes: "Notes",
                layoutType: "title",
                section: "Intro",
            },
        ])
    ),
}));

// Mock PPTX generator
vi.mock("@/lib/presentations/pptx-generator", () => ({
    generatePptx: vi.fn(() =>
        Promise.resolve(new Blob(["test"], { type: "application/octet-stream" }))
    ),
    SlideDataSchema: {
        safeParse: vi.fn((data) => ({ success: true, data })),
    },
}));

describe("Presentations API", () => {
    const mockUser = {
        id: "test-user-id",
        email: "test@example.com",
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabaseAuth.mockResolvedValue({ data: { user: mockUser } });
    });

    describe("POST /api/presentations (Create)", () => {
        it("should return 401 when not authenticated", async () => {
            mockSupabaseAuth.mockResolvedValueOnce({ data: { user: null } });

            const { POST } = await import("@/app/api/presentations/route");

            const request = new NextRequest("http://localhost/api/presentations", {
                method: "POST",
                body: JSON.stringify({
                    projectId: "123e4567-e89b-12d3-a456-426614174000",
                    title: "Test Presentation",
                }),
            });

            const response = await POST(request);
            expect(response.status).toBe(401);
        });

        it("should return 400 for invalid projectId format", async () => {
            const { POST } = await import("@/app/api/presentations/route");

            const request = new NextRequest("http://localhost/api/presentations", {
                method: "POST",
                body: JSON.stringify({
                    projectId: "invalid-uuid",
                    title: "Test Presentation",
                }),
            });

            const response = await POST(request);
            expect(response.status).toBe(400);

            const data = await response.json();
            expect(data.error).toContain("UUID");
        });

        it("should return 400 for missing title", async () => {
            const { POST } = await import("@/app/api/presentations/route");

            const request = new NextRequest("http://localhost/api/presentations", {
                method: "POST",
                body: JSON.stringify({
                    projectId: "123e4567-e89b-12d3-a456-426614174000",
                }),
            });

            const response = await POST(request);
            expect(response.status).toBe(400);
        });

        it("should return 400 for invalid JSON", async () => {
            const { POST } = await import("@/app/api/presentations/route");

            const request = new NextRequest("http://localhost/api/presentations", {
                method: "POST",
                body: "not valid json",
            });

            const response = await POST(request);
            expect(response.status).toBe(400);

            const data = await response.json();
            expect(data.error).toContain("Invalid JSON");
        });
    });

    describe("GET /api/presentations (List)", () => {
        it("should return 401 when not authenticated", async () => {
            mockSupabaseAuth.mockResolvedValueOnce({ data: { user: null } });

            const { GET } = await import("@/app/api/presentations/route");

            const request = new NextRequest(
                "http://localhost/api/presentations?projectId=123e4567-e89b-12d3-a456-426614174000"
            );

            const response = await GET(request);
            expect(response.status).toBe(401);
        });

        it("should return 400 for missing projectId", async () => {
            const { GET } = await import("@/app/api/presentations/route");

            const request = new NextRequest("http://localhost/api/presentations");

            const response = await GET(request);
            expect(response.status).toBe(400);
        });

        it("should return 400 for invalid projectId format", async () => {
            const { GET } = await import("@/app/api/presentations/route");

            const request = new NextRequest(
                "http://localhost/api/presentations?projectId=invalid"
            );

            const response = await GET(request);
            expect(response.status).toBe(400);

            const data = await response.json();
            expect(data.error).toContain("UUID");
        });
    });

    describe("POST /api/presentations/generate", () => {
        it("should validate required fields", async () => {
            const { POST } = await import("@/app/api/presentations/generate/route");

            const request = new NextRequest(
                "http://localhost/api/presentations/generate",
                {
                    method: "POST",
                    body: JSON.stringify({
                        // Missing required fields
                    }),
                }
            );

            const response = await POST(request);
            expect(response.status).toBe(400);
        });

        it("should validate UUID formats", async () => {
            const { POST } = await import("@/app/api/presentations/generate/route");

            const request = new NextRequest(
                "http://localhost/api/presentations/generate",
                {
                    method: "POST",
                    body: JSON.stringify({
                        projectId: "not-a-uuid",
                        deckStructureId: "also-not-uuid",
                    }),
                }
            );

            const response = await POST(request);
            expect(response.status).toBe(400);

            const data = await response.json();
            expect(data.error).toContain("UUID");
        });

        it("should validate customization schema", async () => {
            const { POST } = await import("@/app/api/presentations/generate/route");

            const request = new NextRequest(
                "http://localhost/api/presentations/generate",
                {
                    method: "POST",
                    body: JSON.stringify({
                        projectId: "123e4567-e89b-12d3-a456-426614174000",
                        deckStructureId: "123e4567-e89b-12d3-a456-426614174001",
                        customization: {
                            textDensity: "invalid_value",
                        },
                    }),
                }
            );

            const response = await POST(request);
            expect(response.status).toBe(400);
        });
    });

    describe("POST /api/presentations/export", () => {
        it("should return 401 when not authenticated", async () => {
            mockSupabaseAuth.mockResolvedValueOnce({ data: { user: null } });

            const { POST } = await import("@/app/api/presentations/export/route");

            const request = new NextRequest(
                "http://localhost/api/presentations/export",
                {
                    method: "POST",
                    body: JSON.stringify({
                        presentationId: "123e4567-e89b-12d3-a456-426614174000",
                    }),
                }
            );

            const response = await POST(request);
            expect(response.status).toBe(401);
        });

        it("should validate presentationId format", async () => {
            const { POST } = await import("@/app/api/presentations/export/route");

            const request = new NextRequest(
                "http://localhost/api/presentations/export",
                {
                    method: "POST",
                    body: JSON.stringify({
                        presentationId: "invalid-uuid",
                    }),
                }
            );

            const response = await POST(request);
            expect(response.status).toBe(400);

            const data = await response.json();
            expect(data.error).toContain("UUID");
        });
    });

    describe("Rate Limiting", () => {
        it("should respect rate limits on generate endpoint", async () => {
            const { checkRateLimit } = await import("@/lib/middleware/rate-limit");
            vi.mocked(checkRateLimit).mockResolvedValueOnce(
                new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
                    status: 429,
                }) as any
            );

            const { POST } = await import("@/app/api/presentations/generate/route");

            const request = new NextRequest(
                "http://localhost/api/presentations/generate",
                {
                    method: "POST",
                    body: JSON.stringify({
                        projectId: "123e4567-e89b-12d3-a456-426614174000",
                        deckStructureId: "123e4567-e89b-12d3-a456-426614174001",
                    }),
                }
            );

            const response = await POST(request);
            expect(response.status).toBe(429);
        });
    });

    describe("Error Handling", () => {
        it("should handle database errors gracefully", async () => {
            mockSupabaseSelect.mockResolvedValueOnce({
                data: null,
                error: { message: "Database connection failed" },
            });

            const { POST } = await import("@/app/api/presentations/route");

            const request = new NextRequest("http://localhost/api/presentations", {
                method: "POST",
                body: JSON.stringify({
                    projectId: "123e4567-e89b-12d3-a456-426614174000",
                    title: "Test Presentation",
                }),
            });

            const response = await POST(request);
            // Should return an error status (404 or 500)
            expect([404, 500]).toContain(response.status);
        });
    });
});
