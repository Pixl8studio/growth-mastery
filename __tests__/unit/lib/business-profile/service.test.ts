/**
 * Business Profile Service Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    getOrCreateProfile,
    getProfile,
    getProfileByProject,
    updateProfile,
    updateSection,
    deleteProfile,
    getUserProfiles,
    populateFromIntake,
} from "@/lib/business-profile/service";
import type { BusinessProfile } from "@/types/business-profile";

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

const { createClient } = await import("@/lib/supabase/server");
const { logger } = await import("@/lib/logger");

describe("Business Profile Service", () => {
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mock Supabase client
        mockSupabase = {
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            single: vi.fn(),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase);
    });

    describe("getOrCreateProfile", () => {
        const userId = "user-123";
        const funnelProjectId = "project-456";

        it("should return existing profile if found", async () => {
            const existingProfile: Partial<BusinessProfile> = {
                id: "profile-789",
                user_id: userId,
                funnel_project_id: funnelProjectId,
            };

            mockSupabase.single.mockResolvedValue({
                data: existingProfile,
                error: null,
            });

            const result = await getOrCreateProfile(userId, funnelProjectId);

            expect(result.success).toBe(true);
            expect(result.profile).toEqual(existingProfile);
            expect(logger.info).toHaveBeenCalledWith(
                { profileId: existingProfile.id, funnelProjectId },
                "Found existing business profile"
            );
        });

        it("should create new profile if not found (PGRST116 error)", async () => {
            const newProfile: Partial<BusinessProfile> = {
                id: "new-profile-789",
                user_id: userId,
                funnel_project_id: funnelProjectId,
            };

            // First call returns not found error
            mockSupabase.single
                .mockResolvedValueOnce({
                    data: null,
                    error: { code: "PGRST116", message: "Not found" },
                })
                // Second call (after insert) returns new profile
                .mockResolvedValueOnce({
                    data: newProfile,
                    error: null,
                });

            const result = await getOrCreateProfile(userId, funnelProjectId);

            expect(result.success).toBe(true);
            expect(result.profile).toEqual(newProfile);
            expect(mockSupabase.insert).toHaveBeenCalledWith({
                user_id: userId,
                funnel_project_id: funnelProjectId,
                source: "wizard",
            });
            expect(logger.info).toHaveBeenCalledWith(
                { profileId: newProfile.id, funnelProjectId },
                "Created new business profile"
            );
        });

        it("should return error if profile creation fails", async () => {
            mockSupabase.single
                .mockResolvedValueOnce({
                    data: null,
                    error: { code: "PGRST116", message: "Not found" },
                })
                .mockResolvedValueOnce({
                    data: null,
                    error: { message: "Insert failed" },
                });

            const result = await getOrCreateProfile(userId, funnelProjectId);

            expect(result.success).toBe(false);
            expect(result.error).toBe("Insert failed");
        });

        it("should handle unexpected database errors", async () => {
            mockSupabase.single.mockResolvedValue({
                data: null,
                error: { code: "OTHER_ERROR", message: "Database error" },
            });

            const result = await getOrCreateProfile(userId, funnelProjectId);

            expect(result.success).toBe(false);
            expect(result.error).toBeTruthy();
        });

        it("should handle exceptions gracefully", async () => {
            mockSupabase.single.mockRejectedValue(new Error("Connection failed"));

            const result = await getOrCreateProfile(userId, funnelProjectId);

            expect(result.success).toBe(false);
            expect(result.error).toBe("Connection failed");
        });
    });

    describe("getProfile", () => {
        it("should return profile by ID", async () => {
            const profileId = "profile-123";
            const profile: Partial<BusinessProfile> = {
                id: profileId,
                user_id: "user-456",
            };

            mockSupabase.single.mockResolvedValue({
                data: profile,
                error: null,
            });

            const result = await getProfile(profileId);

            expect(result.success).toBe(true);
            expect(result.profile).toEqual(profile);
        });

        it("should return error if profile not found", async () => {
            mockSupabase.single.mockResolvedValue({
                data: null,
                error: { message: "Not found" },
            });

            const result = await getProfile("nonexistent-id");

            expect(result.success).toBe(false);
            expect(result.error).toBe("Not found");
        });
    });

    describe("getProfileByProject", () => {
        it("should return profile by funnel project ID", async () => {
            const projectId = "project-123";
            const profile: Partial<BusinessProfile> = {
                id: "profile-456",
                funnel_project_id: projectId,
            };

            mockSupabase.single.mockResolvedValue({
                data: profile,
                error: null,
            });

            const result = await getProfileByProject(projectId);

            expect(result.success).toBe(true);
            expect(result.profile).toEqual(profile);
        });

        it("should return success with undefined profile if not found (PGRST116)", async () => {
            mockSupabase.single.mockResolvedValue({
                data: null,
                error: { code: "PGRST116", message: "Not found" },
            });

            const result = await getProfileByProject("nonexistent-project");

            expect(result.success).toBe(true);
            expect(result.profile).toBeUndefined();
        });

        it("should return error for other database errors", async () => {
            mockSupabase.single.mockResolvedValue({
                data: null,
                error: { code: "OTHER", message: "Database error" },
            });

            const result = await getProfileByProject("project-123");

            expect(result.success).toBe(false);
            expect(result.error).toBe("Database error");
        });
    });

    describe("updateProfile", () => {
        it("should update profile successfully", async () => {
            const profileId = "profile-123";
            const updates = { offer_name: "New Offer" };
            const updatedProfile: Partial<BusinessProfile> = {
                id: profileId,
                offer_name: "New Offer",
            };

            mockSupabase.single.mockResolvedValue({
                data: updatedProfile,
                error: null,
            });

            const result = await updateProfile(profileId, updates);

            expect(result.success).toBe(true);
            expect(result.profile).toEqual(updatedProfile);
            expect(mockSupabase.update).toHaveBeenCalledWith(updates);
            expect(logger.info).toHaveBeenCalledWith(
                { profileId },
                "Updated business profile"
            );
        });

        it("should return error if update fails", async () => {
            mockSupabase.single.mockResolvedValue({
                data: null,
                error: { message: "Update failed" },
            });

            const result = await updateProfile("profile-123", {});

            expect(result.success).toBe(false);
            expect(result.error).toBe("Update failed");
        });
    });

    describe("updateSection", () => {
        it("should update section and calculate completion status", async () => {
            const profileId = "profile-123";
            const sectionId = "section1";
            const sectionData = {
                ideal_customer: "Entrepreneurs",
                transformation: "Build successful businesses",
            };

            // Mock get current profile
            mockSupabase.single
                .mockResolvedValueOnce({
                    data: {
                        ai_generated_fields: ["existing_field"],
                        completion_status: {
                            section1: 0,
                            section2: 0,
                            section3: 0,
                            section4: 0,
                            section5: 0,
                            overall: 0,
                        },
                    },
                    error: null,
                })
                // Mock update result
                .mockResolvedValueOnce({
                    data: { id: profileId, ...sectionData },
                    error: null,
                });

            const result = await updateSection(profileId, sectionId, sectionData, [
                "ideal_customer",
                "transformation",
            ]);

            expect(result.success).toBe(true);
            expect(result.profile).toBeTruthy();
        });

        it("should handle missing current profile data", async () => {
            const profileId = "profile-123";
            const sectionData = { ideal_customer: "Entrepreneurs" };

            mockSupabase.single
                .mockResolvedValueOnce({
                    data: null,
                    error: null,
                })
                .mockResolvedValueOnce({
                    data: { id: profileId, ...sectionData },
                    error: null,
                });

            const result = await updateSection(profileId, "section1", sectionData);

            expect(result.success).toBe(true);
        });

        it("should merge AI generated fields correctly", async () => {
            const profileId = "profile-123";

            mockSupabase.single
                .mockResolvedValueOnce({
                    data: {
                        ai_generated_fields: ["field1", "field2"],
                        completion_status: {},
                    },
                    error: null,
                })
                .mockResolvedValueOnce({
                    data: { id: profileId },
                    error: null,
                });

            await updateSection(profileId, "section1", {}, ["field2", "field3"]);

            expect(mockSupabase.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    ai_generated_fields: expect.arrayContaining([
                        "field1",
                        "field2",
                        "field3",
                    ]),
                })
            );
        });
    });

    describe("deleteProfile", () => {
        it("should delete profile successfully", async () => {
            const profileId = "profile-123";

            mockSupabase.delete.mockReturnThis();
            mockSupabase.eq.mockResolvedValue({
                data: null,
                error: null,
            });

            const result = await deleteProfile(profileId);

            expect(result.success).toBe(true);
            expect(mockSupabase.delete).toHaveBeenCalled();
            expect(logger.info).toHaveBeenCalledWith(
                { profileId },
                "Deleted business profile"
            );
        });

        it("should return error if deletion fails", async () => {
            mockSupabase.delete.mockReturnThis();
            mockSupabase.eq.mockResolvedValue({
                data: null,
                error: { message: "Delete failed" },
            });

            const result = await deleteProfile("profile-123");

            expect(result.success).toBe(false);
            expect(result.error).toBe("Delete failed");
        });
    });

    describe("getUserProfiles", () => {
        it("should return all profiles for a user", async () => {
            const userId = "user-123";
            const profiles: Partial<BusinessProfile>[] = [
                { id: "profile-1", user_id: userId },
                { id: "profile-2", user_id: userId },
            ];

            mockSupabase.order.mockResolvedValue({
                data: profiles,
                error: null,
            });

            const result = await getUserProfiles(userId);

            expect(result.success).toBe(true);
            expect(result.profiles).toEqual(profiles);
            expect(mockSupabase.order).toHaveBeenCalledWith("updated_at", {
                ascending: false,
            });
        });

        it("should return error if query fails", async () => {
            mockSupabase.order.mockResolvedValue({
                data: null,
                error: { message: "Query failed" },
            });

            const result = await getUserProfiles("user-123");

            expect(result.success).toBe(false);
            expect(result.error).toBe("Query failed");
        });
    });

    describe("populateFromIntake", () => {
        it("should populate profile from voice intake data", async () => {
            const profileId = "profile-123";
            const intakeData = {
                transcriptText: "This is the transcript",
                extractedData: {
                    targetAudience: "Entrepreneurs",
                    desiredOutcome: "Build successful businesses",
                    mainProblem: "Low revenue",
                    offerName: "Business Accelerator",
                },
            };

            const updatedProfile: Partial<BusinessProfile> = {
                id: profileId,
                ideal_customer: "Entrepreneurs",
                transformation: "Build successful businesses",
                perceived_problem: "Low revenue",
                offer_name: "Business Accelerator",
                section1_context: "This is the transcript",
            };

            mockSupabase.single.mockResolvedValue({
                data: updatedProfile,
                error: null,
            });

            const result = await populateFromIntake(profileId, intakeData, "voice");

            expect(result.success).toBe(true);
            expect(result.profile).toEqual(updatedProfile);
            expect(mockSupabase.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    source: "voice",
                    ideal_customer: "Entrepreneurs",
                    transformation: "Build successful businesses",
                    perceived_problem: "Low revenue",
                    offer_name: "Business Accelerator",
                    section1_context: "This is the transcript",
                })
            );
        });

        it("should handle import source", async () => {
            mockSupabase.single.mockResolvedValue({
                data: {},
                error: null,
            });

            await populateFromIntake("profile-123", {}, "import");

            expect(mockSupabase.update).toHaveBeenCalledWith(
                expect.objectContaining({ source: "import" })
            );
        });

        it("should handle missing extracted data", async () => {
            mockSupabase.single.mockResolvedValue({
                data: {},
                error: null,
            });

            const result = await populateFromIntake("profile-123", {
                transcriptText: "Just a transcript",
            });

            expect(result.success).toBe(true);
        });

        it("should return error if update fails", async () => {
            mockSupabase.single.mockResolvedValue({
                data: null,
                error: { message: "Update failed" },
            });

            const result = await populateFromIntake("profile-123", {});

            expect(result.success).toBe(false);
            expect(result.error).toBe("Update failed");
        });
    });
});
