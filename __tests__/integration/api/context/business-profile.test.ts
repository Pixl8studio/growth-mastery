/**
 * Business Profile API Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH } from "@/app/api/context/business-profile/route";
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

vi.mock("@/lib/business-profile/service", () => ({
    getOrCreateProfile: vi.fn(),
    updateSection: vi.fn(),
    getProfileByProject: vi.fn(),
}));

const { createClient } = await import("@/lib/supabase/server");
const { getOrCreateProfile, updateSection, getProfileByProject } = await import(
    "@/lib/business-profile/service"
);

describe("Business Profile API Routes", () => {
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

    describe("GET /api/context/business-profile", () => {
        it("should get or create business profile for authenticated user", async () => {
            const userId = "user-123";
            const projectId = "project-456";
            const profile = {
                id: "profile-789",
                user_id: userId,
                funnel_project_id: projectId,
            };

            // Mock authentication
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: userId } },
                error: null,
            });

            // Mock project ownership check
            mockSupabase.single.mockResolvedValue({
                data: { id: projectId, user_id: userId },
                error: null,
            });

            // Mock profile retrieval
            vi.mocked(getOrCreateProfile).mockResolvedValue({
                success: true,
                profile: profile as any,
            });

            const request = new NextRequest(
                `http://localhost:3000/api/context/business-profile?projectId=${projectId}`
            );

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.profile).toEqual(profile);
            expect(getOrCreateProfile).toHaveBeenCalledWith(userId, projectId);
        });

        it("should return 401 if user not authenticated", async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: null },
                error: { message: "Not authenticated" },
            });

            const request = new NextRequest(
                "http://localhost:3000/api/context/business-profile?projectId=project-123"
            );

            const response = await GET(request);
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
                "http://localhost:3000/api/context/business-profile"
            );

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe("projectId is required");
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
                "http://localhost:3000/api/context/business-profile?projectId=invalid"
            );

            const response = await GET(request);
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
                "http://localhost:3000/api/context/business-profile?projectId=project-456"
            );

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe("Not authorized to access this project");
        });

        it("should return 500 if profile retrieval fails", async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: "user-123" } },
                error: null,
            });

            mockSupabase.single.mockResolvedValue({
                data: { id: "project-456", user_id: "user-123" },
                error: null,
            });

            vi.mocked(getOrCreateProfile).mockResolvedValue({
                success: false,
                error: "Database error",
            });

            const request = new NextRequest(
                "http://localhost:3000/api/context/business-profile?projectId=project-456"
            );

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe("Failed to get business profile");
        });
    });

    describe("PATCH /api/context/business-profile", () => {
        it("should update section for authenticated user", async () => {
            const userId = "user-123";
            const projectId = "project-456";
            const profileId = "profile-789";
            const sectionData = { ideal_customer: "Entrepreneurs" };

            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: userId } },
                error: null,
            });

            vi.mocked(getProfileByProject).mockResolvedValue({
                success: true,
                profile: {
                    id: profileId,
                    user_id: userId,
                    funnel_project_id: projectId,
                } as any,
            });

            vi.mocked(updateSection).mockResolvedValue({
                success: true,
                profile: {
                    id: profileId,
                    ...sectionData,
                } as any,
            });

            const request = new NextRequest(
                "http://localhost:3000/api/context/business-profile",
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        projectId,
                        sectionId: "section1",
                        sectionData,
                        aiGeneratedFields: ["ideal_customer"],
                    }),
                }
            );

            const response = await PATCH(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.profile).toBeTruthy();
            expect(updateSection).toHaveBeenCalledWith(
                profileId,
                "section1",
                sectionData,
                ["ideal_customer"]
            );
        });

        it("should return 401 if user not authenticated", async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: null },
                error: { message: "Not authenticated" },
            });

            const request = new NextRequest(
                "http://localhost:3000/api/context/business-profile",
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        projectId: "project-123",
                        sectionId: "section1",
                        sectionData: {},
                    }),
                }
            );

            const response = await PATCH(request);
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
                "http://localhost:3000/api/context/business-profile",
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        sectionId: "section1",
                        sectionData: {},
                    }),
                }
            );

            const response = await PATCH(request);
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
                "http://localhost:3000/api/context/business-profile",
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        projectId: "project-123",
                        sectionData: {},
                    }),
                }
            );

            const response = await PATCH(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe("sectionId is required");
        });

        it("should return 400 if sectionData missing", async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: "user-123" } },
                error: null,
            });

            const request = new NextRequest(
                "http://localhost:3000/api/context/business-profile",
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        projectId: "project-123",
                        sectionId: "section1",
                    }),
                }
            );

            const response = await PATCH(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe("sectionData is required");
        });

        it("should return 400 if sectionId invalid", async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: "user-123" } },
                error: null,
            });

            const request = new NextRequest(
                "http://localhost:3000/api/context/business-profile",
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        projectId: "project-123",
                        sectionId: "invalid_section",
                        sectionData: {},
                    }),
                }
            );

            const response = await PATCH(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe("Invalid sectionId");
        });

        it("should return 400 if business profile not found", async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: "user-123" } },
                error: null,
            });

            vi.mocked(getProfileByProject).mockResolvedValue({
                success: true,
                profile: undefined,
            });

            const request = new NextRequest(
                "http://localhost:3000/api/context/business-profile",
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        projectId: "project-123",
                        sectionId: "section1",
                        sectionData: {},
                    }),
                }
            );

            const response = await PATCH(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe("Business profile not found for this project");
        });

        it("should return 401 if user does not own profile", async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: "user-123" } },
                error: null,
            });

            vi.mocked(getProfileByProject).mockResolvedValue({
                success: true,
                profile: {
                    id: "profile-789",
                    user_id: "other-user",
                } as any,
            });

            const request = new NextRequest(
                "http://localhost:3000/api/context/business-profile",
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        projectId: "project-123",
                        sectionId: "section1",
                        sectionData: {},
                    }),
                }
            );

            const response = await PATCH(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe("Not authorized to update this profile");
        });

        it("should return 500 if update fails", async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: "user-123" } },
                error: null,
            });

            vi.mocked(getProfileByProject).mockResolvedValue({
                success: true,
                profile: {
                    id: "profile-789",
                    user_id: "user-123",
                } as any,
            });

            vi.mocked(updateSection).mockResolvedValue({
                success: false,
                error: "Database error",
            });

            const request = new NextRequest(
                "http://localhost:3000/api/context/business-profile",
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        projectId: "project-123",
                        sectionId: "section1",
                        sectionData: {},
                    }),
                }
            );

            const response = await PATCH(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe("Failed to update business profile");
        });
    });
});
