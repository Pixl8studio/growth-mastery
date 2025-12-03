/**
 * Generate Section API Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/context/generate-section/route";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock("@/lib/business-profile/ai-section-generator", () => ({
    generateSectionAnswers: vi.fn(),
}));

vi.mock("@/lib/business-profile/service", () => ({
    getProfileByProject: vi.fn(),
}));

const { createClient } = await import("@/lib/supabase/server");
const { generateSectionAnswers } = await import(
    "@/lib/business-profile/ai-section-generator"
);
const { getProfileByProject } = await import("@/lib/business-profile/service");

describe("Generate Section API Route", () => {
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockSupabase = {
            auth: {
                getUser: vi.fn(),
            },
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn(),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase);
    });

    describe("POST /api/context/generate-section", () => {
        it("should generate section answers for authenticated user", async () => {
            const userId = "user-123";
            const projectId = "project-456";
            const context = "I help entrepreneurs build successful businesses";

            const generatedData = {
                ideal_customer: "Early-stage entrepreneurs",
                transformation: "Build profitable businesses",
            };

            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: userId } },
                error: null,
            });

            mockSupabase.single.mockResolvedValue({
                data: { id: projectId, user_id: userId },
                error: null,
            });

            vi.mocked(getProfileByProject).mockResolvedValue({
                success: true,
                profile: undefined,
            });

            vi.mocked(generateSectionAnswers).mockResolvedValue({
                success: true,
                data: generatedData,
                generatedFields: ["ideal_customer", "transformation"],
            });

            const request = new NextRequest(
                "http://localhost:3000/api/context/generate-section",
                {
                    method: "POST",
                    body: JSON.stringify({
                        projectId,
                        sectionId: "section1",
                        context,
                    }),
                }
            );

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.data).toEqual(generatedData);
            expect(data.generatedFields).toEqual(["ideal_customer", "transformation"]);
            expect(generateSectionAnswers).toHaveBeenCalledWith(
                "section1",
                context,
                {}
            );
        });

        it("should use existing profile data for context", async () => {
            const userId = "user-123";
            const existingProfile = {
                id: "profile-789",
                offer_name: "Business Accelerator",
            };

            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: userId } },
                error: null,
            });

            mockSupabase.single.mockResolvedValue({
                data: { id: "project-456", user_id: userId },
                error: null,
            });

            vi.mocked(getProfileByProject).mockResolvedValue({
                success: true,
                profile: existingProfile as any,
            });

            vi.mocked(generateSectionAnswers).mockResolvedValue({
                success: true,
                data: {},
                generatedFields: [],
            });

            const request = new NextRequest(
                "http://localhost:3000/api/context/generate-section",
                {
                    method: "POST",
                    body: JSON.stringify({
                        projectId: "project-456",
                        sectionId: "section2",
                        context: "My story",
                    }),
                }
            );

            await POST(request);

            expect(generateSectionAnswers).toHaveBeenCalledWith(
                "section2",
                "My story",
                existingProfile
            );
        });

        it("should use provided existingData over fetched profile", async () => {
            const userId = "user-123";
            const existingData = { custom_field: "custom value" };

            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: userId } },
                error: null,
            });

            mockSupabase.single.mockResolvedValue({
                data: { id: "project-456", user_id: userId },
                error: null,
            });

            vi.mocked(generateSectionAnswers).mockResolvedValue({
                success: true,
                data: {},
                generatedFields: [],
            });

            const request = new NextRequest(
                "http://localhost:3000/api/context/generate-section",
                {
                    method: "POST",
                    body: JSON.stringify({
                        projectId: "project-456",
                        sectionId: "section1",
                        context: "My context",
                        existingData,
                    }),
                }
            );

            await POST(request);

            expect(generateSectionAnswers).toHaveBeenCalledWith(
                "section1",
                "My context",
                existingData
            );
            expect(getProfileByProject).not.toHaveBeenCalled();
        });

        it("should return 401 if user not authenticated", async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: null },
                error: { message: "Not authenticated" },
            });

            const request = new NextRequest(
                "http://localhost:3000/api/context/generate-section",
                {
                    method: "POST",
                    body: JSON.stringify({
                        projectId: "project-123",
                        sectionId: "section1",
                        context: "My context",
                    }),
                }
            );

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe("Authentication required");
        });

        it("should return 400 if projectId missing", async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: "user-123" } },
                error: null,
            });

            const request = new NextRequest(
                "http://localhost:3000/api/context/generate-section",
                {
                    method: "POST",
                    body: JSON.stringify({
                        sectionId: "section1",
                        context: "My context",
                    }),
                }
            );

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe("projectId is required");
        });

        it("should return 400 if sectionId missing", async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: "user-123" } },
                error: null,
            });

            const request = new NextRequest(
                "http://localhost:3000/api/context/generate-section",
                {
                    method: "POST",
                    body: JSON.stringify({
                        projectId: "project-123",
                        context: "My context",
                    }),
                }
            );

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe("sectionId is required");
        });

        it("should return 400 if context missing", async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: "user-123" } },
                error: null,
            });

            const request = new NextRequest(
                "http://localhost:3000/api/context/generate-section",
                {
                    method: "POST",
                    body: JSON.stringify({
                        projectId: "project-123",
                        sectionId: "section1",
                    }),
                }
            );

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe("context is required and must be non-empty");
        });

        it("should return 400 if context is empty string", async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: "user-123" } },
                error: null,
            });

            const request = new NextRequest(
                "http://localhost:3000/api/context/generate-section",
                {
                    method: "POST",
                    body: JSON.stringify({
                        projectId: "project-123",
                        sectionId: "section1",
                        context: "   ",
                    }),
                }
            );

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe("context is required and must be non-empty");
        });

        it("should return 400 if sectionId invalid", async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: "user-123" } },
                error: null,
            });

            const request = new NextRequest(
                "http://localhost:3000/api/context/generate-section",
                {
                    method: "POST",
                    body: JSON.stringify({
                        projectId: "project-123",
                        sectionId: "invalid_section",
                        context: "My context",
                    }),
                }
            );

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe("Invalid sectionId");
        });

        it("should return 400 if project not found", async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: "user-123" } },
                error: null,
            });

            mockSupabase.single.mockResolvedValue({
                data: null,
                error: { message: "Not found" },
            });

            const request = new NextRequest(
                "http://localhost:3000/api/context/generate-section",
                {
                    method: "POST",
                    body: JSON.stringify({
                        projectId: "invalid-project",
                        sectionId: "section1",
                        context: "My context",
                    }),
                }
            );

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe("Project not found");
        });

        it("should return 401 if user does not own project", async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: "user-123" } },
                error: null,
            });

            mockSupabase.single.mockResolvedValue({
                data: { id: "project-456", user_id: "other-user" },
                error: null,
            });

            const request = new NextRequest(
                "http://localhost:3000/api/context/generate-section",
                {
                    method: "POST",
                    body: JSON.stringify({
                        projectId: "project-456",
                        sectionId: "section1",
                        context: "My context",
                    }),
                }
            );

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe("Not authorized to access this project");
        });

        it("should return 500 if generation fails", async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: "user-123" } },
                error: null,
            });

            mockSupabase.single.mockResolvedValue({
                data: { id: "project-456", user_id: "user-123" },
                error: null,
            });

            vi.mocked(generateSectionAnswers).mockResolvedValue({
                success: false,
                error: "AI service unavailable",
            });

            const request = new NextRequest(
                "http://localhost:3000/api/context/generate-section",
                {
                    method: "POST",
                    body: JSON.stringify({
                        projectId: "project-456",
                        sectionId: "section1",
                        context: "My context",
                    }),
                }
            );

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe("AI service unavailable");
        });
    });
});
