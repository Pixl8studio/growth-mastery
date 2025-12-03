/**
 * Parse GPT Paste API Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/context/parse-gpt-paste/route";
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
    parseGptPasteResponse: vi.fn(),
}));

vi.mock("@/lib/business-profile/service", () => ({
    getProfileByProject: vi.fn(),
}));

const { createClient } = await import("@/lib/supabase/server");
const { parseGptPasteResponse } = await import(
    "@/lib/business-profile/ai-section-generator"
);
const { getProfileByProject } = await import("@/lib/business-profile/service");

describe("Parse GPT Paste API Route", () => {
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

    describe("POST /api/context/parse-gpt-paste", () => {
        it("should parse GPT paste response for authenticated user", async () => {
            const userId = "user-123";
            const projectId = "project-456";
            const pastedContent = `
                1. Ideal Customer: Early-stage entrepreneurs
                2. Transformation: Build profitable businesses
            `;

            const parsedData = {
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

            vi.mocked(parseGptPasteResponse).mockResolvedValue({
                success: true,
                data: parsedData,
                generatedFields: ["ideal_customer", "transformation"],
            });

            const request = new NextRequest(
                "http://localhost:3000/api/context/parse-gpt-paste",
                {
                    method: "POST",
                    body: JSON.stringify({
                        projectId,
                        sectionId: "section1",
                        pastedContent,
                    }),
                }
            );

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.data).toEqual(parsedData);
            expect(data.generatedFields).toEqual(["ideal_customer", "transformation"]);
            expect(parseGptPasteResponse).toHaveBeenCalledWith(
                "section1",
                pastedContent,
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

            vi.mocked(parseGptPasteResponse).mockResolvedValue({
                success: true,
                data: {},
                generatedFields: [],
            });

            const request = new NextRequest(
                "http://localhost:3000/api/context/parse-gpt-paste",
                {
                    method: "POST",
                    body: JSON.stringify({
                        projectId: "project-456",
                        sectionId: "section2",
                        pastedContent: "My GPT response",
                    }),
                }
            );

            await POST(request);

            expect(parseGptPasteResponse).toHaveBeenCalledWith(
                "section2",
                "My GPT response",
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

            vi.mocked(parseGptPasteResponse).mockResolvedValue({
                success: true,
                data: {},
                generatedFields: [],
            });

            const request = new NextRequest(
                "http://localhost:3000/api/context/parse-gpt-paste",
                {
                    method: "POST",
                    body: JSON.stringify({
                        projectId: "project-456",
                        sectionId: "section1",
                        pastedContent: "My content",
                        existingData,
                    }),
                }
            );

            await POST(request);

            expect(parseGptPasteResponse).toHaveBeenCalledWith(
                "section1",
                "My content",
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
                "http://localhost:3000/api/context/parse-gpt-paste",
                {
                    method: "POST",
                    body: JSON.stringify({
                        projectId: "project-123",
                        sectionId: "section1",
                        pastedContent: "My content",
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
                "http://localhost:3000/api/context/parse-gpt-paste",
                {
                    method: "POST",
                    body: JSON.stringify({
                        sectionId: "section1",
                        pastedContent: "My content",
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
                "http://localhost:3000/api/context/parse-gpt-paste",
                {
                    method: "POST",
                    body: JSON.stringify({
                        projectId: "project-123",
                        pastedContent: "My content",
                    }),
                }
            );

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe("sectionId is required");
        });

        it("should return 400 if pastedContent missing", async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: "user-123" } },
                error: null,
            });

            const request = new NextRequest(
                "http://localhost:3000/api/context/parse-gpt-paste",
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
            expect(data.error).toBe("pastedContent is required and must be non-empty");
        });

        it("should return 400 if pastedContent is empty string", async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: "user-123" } },
                error: null,
            });

            const request = new NextRequest(
                "http://localhost:3000/api/context/parse-gpt-paste",
                {
                    method: "POST",
                    body: JSON.stringify({
                        projectId: "project-123",
                        sectionId: "section1",
                        pastedContent: "   ",
                    }),
                }
            );

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe("pastedContent is required and must be non-empty");
        });

        it("should return 400 if sectionId invalid", async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: "user-123" } },
                error: null,
            });

            const request = new NextRequest(
                "http://localhost:3000/api/context/parse-gpt-paste",
                {
                    method: "POST",
                    body: JSON.stringify({
                        projectId: "project-123",
                        sectionId: "invalid_section",
                        pastedContent: "My content",
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
                "http://localhost:3000/api/context/parse-gpt-paste",
                {
                    method: "POST",
                    body: JSON.stringify({
                        projectId: "invalid-project",
                        sectionId: "section1",
                        pastedContent: "My content",
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
                "http://localhost:3000/api/context/parse-gpt-paste",
                {
                    method: "POST",
                    body: JSON.stringify({
                        projectId: "project-456",
                        sectionId: "section1",
                        pastedContent: "My content",
                    }),
                }
            );

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe("Not authorized to access this project");
        });

        it("should return 500 if parsing fails", async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: "user-123" } },
                error: null,
            });

            mockSupabase.single.mockResolvedValue({
                data: { id: "project-456", user_id: "user-123" },
                error: null,
            });

            vi.mocked(parseGptPasteResponse).mockResolvedValue({
                success: false,
                error: "Parse failed",
            });

            const request = new NextRequest(
                "http://localhost:3000/api/context/parse-gpt-paste",
                {
                    method: "POST",
                    body: JSON.stringify({
                        projectId: "project-456",
                        sectionId: "section1",
                        pastedContent: "Invalid content",
                    }),
                }
            );

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe("Parse failed");
        });

        it("should handle long pasted content", async () => {
            const userId = "user-123";
            const longContent = "A".repeat(10000); // 10k characters

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
                profile: undefined,
            });

            vi.mocked(parseGptPasteResponse).mockResolvedValue({
                success: true,
                data: { parsed: "data" } as any,
                generatedFields: ["parsed"],
            });

            const request = new NextRequest(
                "http://localhost:3000/api/context/parse-gpt-paste",
                {
                    method: "POST",
                    body: JSON.stringify({
                        projectId: "project-456",
                        sectionId: "section1",
                        pastedContent: longContent,
                    }),
                }
            );

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(parseGptPasteResponse).toHaveBeenCalledWith(
                "section1",
                longContent,
                {}
            );
        });
    });
});
