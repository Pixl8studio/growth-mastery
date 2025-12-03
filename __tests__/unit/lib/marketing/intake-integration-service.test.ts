/**
 * Intake Integration Service Tests
 * Tests for marketing profile initialization from intake data
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/supabase/server");
vi.mock("@/lib/logger");
vi.mock("@/lib/marketing/brand-voice-service", () => ({
    initializeProfile: vi.fn(),
    getVoiceGuidelines: vi.fn(),
    getProfile: vi.fn(),
}));

import {
    initializeFromIntake,
    generateInitialBriefFromIntake,
} from "@/lib/marketing/intake-integration-service";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { initializeProfile } from "@/lib/marketing/brand-voice-service";

describe("IntakeIntegrationService", () => {
    const mockUserId = "user-123";
    const mockFunnelProjectId = "funnel-123";
    const mockIntakeId = "intake-123";
    const mockProfileId = "profile-123";

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("initializeFromIntake", () => {
        it("should initialize marketing profile from intake data", async () => {
            const mockIntakeData = {
                id: mockIntakeId,
                transcript_text: "I run a casual and friendly marketing agency...",
                metadata: {
                    businessName: "Growth Marketing Co",
                    industry: "Marketing",
                    targetAudience: "Small business owners",
                    mainProblem: "Lead generation",
                    desiredOutcome: "More qualified leads",
                },
            };

            const mockProfile = {
                id: mockProfileId,
                user_id: mockUserId,
                name: "Growth Marketing Co Profile",
            };

            const mockSupabase = {
                from: vi.fn((table: string) => {
                    if (table === "vapi_transcripts") {
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    eq: vi.fn().mockReturnValue({
                                        single: vi.fn().mockResolvedValue({
                                            data: mockIntakeData,
                                            error: null,
                                        }),
                                    }),
                                }),
                            }),
                        };
                    }
                    if (table === "marketing_profiles") {
                        return {
                            update: vi.fn().mockReturnValue({
                                eq: vi.fn().mockResolvedValue({ error: null }),
                            }),
                        };
                    }
                    return {};
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
            vi.mocked(initializeProfile).mockResolvedValue({
                success: true,
                profile: mockProfile as any,
            });

            const result = await initializeFromIntake(
                mockUserId,
                mockFunnelProjectId,
                mockIntakeId
            );

            expect(result.success).toBe(true);
            expect(result.profileId).toBe(mockProfileId);
            expect(initializeProfile).toHaveBeenCalledWith(
                mockUserId,
                mockFunnelProjectId,
                "Growth Marketing Co"
            );
        });

        it("should extract brand voice from transcript", async () => {
            const mockIntakeData = {
                id: mockIntakeId,
                transcript_text:
                    "We're experts in this field and take an authoritative approach...",
                metadata: {
                    businessName: "Expert Consulting",
                },
            };

            const mockProfile = {
                id: mockProfileId,
                user_id: mockUserId,
            };

            const mockUpdate = vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
            });

            const mockSupabase = {
                from: vi.fn((table: string) => {
                    if (table === "vapi_transcripts") {
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    eq: vi.fn().mockReturnValue({
                                        single: vi.fn().mockResolvedValue({
                                            data: mockIntakeData,
                                            error: null,
                                        }),
                                    }),
                                }),
                            }),
                        };
                    }
                    if (table === "marketing_profiles") {
                        return { update: mockUpdate };
                    }
                    return {};
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
            vi.mocked(initializeProfile).mockResolvedValue({
                success: true,
                profile: mockProfile as any,
            });

            await initializeFromIntake(mockUserId, mockFunnelProjectId, mockIntakeId);

            expect(mockUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    brand_voice: "authoritative",
                })
            );
        });

        it("should detect conversational voice from transcript", async () => {
            const mockIntakeData = {
                id: mockIntakeId,
                transcript_text:
                    "We keep things casual and friendly with our clients...",
                metadata: {},
            };

            const mockProfile = { id: mockProfileId };
            const mockUpdate = vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
            });

            const mockSupabase = {
                from: vi.fn((table: string) => {
                    if (table === "vapi_transcripts") {
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    eq: vi.fn().mockReturnValue({
                                        single: vi.fn().mockResolvedValue({
                                            data: mockIntakeData,
                                            error: null,
                                        }),
                                    }),
                                }),
                            }),
                        };
                    }
                    if (table === "marketing_profiles") {
                        return { update: mockUpdate };
                    }
                    return {};
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
            vi.mocked(initializeProfile).mockResolvedValue({
                success: true,
                profile: mockProfile as any,
            });

            await initializeFromIntake(mockUserId, mockFunnelProjectId, mockIntakeId);

            expect(mockUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    brand_voice: "conversational",
                })
            );
        });

        it("should extract keywords from metadata", async () => {
            const mockIntakeData = {
                id: mockIntakeId,
                transcript_text: "Some transcript",
                metadata: {
                    mainProblem: "Low conversion rates",
                    desiredOutcome: "Higher sales",
                    otherField: "Not included",
                },
            };

            const mockProfile = { id: mockProfileId };
            const mockUpdate = vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
            });

            const mockSupabase = {
                from: vi.fn((table: string) => {
                    if (table === "vapi_transcripts") {
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    eq: vi.fn().mockReturnValue({
                                        single: vi.fn().mockResolvedValue({
                                            data: mockIntakeData,
                                            error: null,
                                        }),
                                    }),
                                }),
                            }),
                        };
                    }
                    if (table === "marketing_profiles") {
                        return { update: mockUpdate };
                    }
                    return {};
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
            vi.mocked(initializeProfile).mockResolvedValue({
                success: true,
                profile: mockProfile as any,
            });

            await initializeFromIntake(mockUserId, mockFunnelProjectId, mockIntakeId);

            expect(mockUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    key_themes: ["Low conversion rates", "Higher sales"],
                })
            );
        });

        it("should handle missing intake data", async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: null,
                                    error: { message: "Not found" },
                                }),
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await initializeFromIntake(
                mockUserId,
                mockFunnelProjectId,
                mockIntakeId
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe("Failed to fetch intake data");
        });

        it("should handle profile initialization failure", async () => {
            const mockIntakeData = {
                id: mockIntakeId,
                transcript_text: "Text",
                metadata: {},
            };

            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockIntakeData,
                                    error: null,
                                }),
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
            vi.mocked(initializeProfile).mockResolvedValue({
                success: false,
                error: "Profile creation failed",
            });

            const result = await initializeFromIntake(
                mockUserId,
                mockFunnelProjectId,
                mockIntakeId
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe("Profile creation failed");
        });

        it("should continue even if profile update fails", async () => {
            const mockIntakeData = {
                id: mockIntakeId,
                transcript_text: "Text",
                metadata: {},
            };

            const mockProfile = { id: mockProfileId };

            const mockSupabase = {
                from: vi.fn((table: string) => {
                    if (table === "vapi_transcripts") {
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    eq: vi.fn().mockReturnValue({
                                        single: vi.fn().mockResolvedValue({
                                            data: mockIntakeData,
                                            error: null,
                                        }),
                                    }),
                                }),
                            }),
                        };
                    }
                    if (table === "marketing_profiles") {
                        return {
                            update: vi.fn().mockReturnValue({
                                eq: vi.fn().mockResolvedValue({
                                    error: { message: "Update failed" },
                                }),
                            }),
                        };
                    }
                    return {};
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
            vi.mocked(initializeProfile).mockResolvedValue({
                success: true,
                profile: mockProfile as any,
            });

            const result = await initializeFromIntake(
                mockUserId,
                mockFunnelProjectId,
                mockIntakeId
            );

            // Should still succeed even if update fails
            expect(result.success).toBe(true);
            expect(result.profileId).toBe(mockProfileId);
        });
    });

    describe("generateInitialBriefFromIntake", () => {
        it("should generate initial marketing brief from intake", async () => {
            const mockIntakeData = {
                id: mockIntakeId,
                transcript_text: "Text",
                metadata: {
                    mainProblem: "Low engagement",
                    targetAudience: "Small businesses",
                },
            };

            const mockBrief = {
                id: "brief-123",
                topic: "Solving Low engagement",
                target_audience: "Small businesses",
            };

            const mockSupabase = {
                from: vi.fn((table: string) => {
                    if (table === "vapi_transcripts") {
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    eq: vi.fn().mockReturnValue({
                                        single: vi.fn().mockResolvedValue({
                                            data: mockIntakeData,
                                            error: null,
                                        }),
                                    }),
                                }),
                            }),
                        };
                    }
                    if (table === "marketing_content_briefs") {
                        return {
                            insert: vi.fn().mockReturnValue({
                                select: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({
                                        data: mockBrief,
                                        error: null,
                                    }),
                                }),
                            }),
                        };
                    }
                    return {};
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await generateInitialBriefFromIntake(
                mockUserId,
                mockProfileId,
                mockIntakeId
            );

            expect(result.success).toBe(true);
            expect(result.briefId).toBe("brief-123");
        });

        it("should use default topic when no main problem provided", async () => {
            const mockIntakeData = {
                id: mockIntakeId,
                transcript_text: "Text",
                metadata: {},
            };

            const mockInsert = vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                        data: { id: "brief-123" },
                        error: null,
                    }),
                }),
            });

            const mockSupabase = {
                from: vi.fn((table: string) => {
                    if (table === "vapi_transcripts") {
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    eq: vi.fn().mockReturnValue({
                                        single: vi.fn().mockResolvedValue({
                                            data: mockIntakeData,
                                            error: null,
                                        }),
                                    }),
                                }),
                            }),
                        };
                    }
                    if (table === "marketing_content_briefs") {
                        return { insert: mockInsert };
                    }
                    return {};
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            await generateInitialBriefFromIntake(
                mockUserId,
                mockProfileId,
                mockIntakeId
            );

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    topic: "Business Growth Strategy",
                })
            );
        });

        it("should handle intake data fetch failure", async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: null,
                                    error: { message: "Not found" },
                                }),
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await generateInitialBriefFromIntake(
                mockUserId,
                mockProfileId,
                mockIntakeId
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe("Failed to fetch intake data");
        });

        it("should handle brief creation failure", async () => {
            const mockIntakeData = {
                id: mockIntakeId,
                transcript_text: "Text",
                metadata: {},
            };

            const mockSupabase = {
                from: vi.fn((table: string) => {
                    if (table === "vapi_transcripts") {
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    eq: vi.fn().mockReturnValue({
                                        single: vi.fn().mockResolvedValue({
                                            data: mockIntakeData,
                                            error: null,
                                        }),
                                    }),
                                }),
                            }),
                        };
                    }
                    if (table === "marketing_content_briefs") {
                        return {
                            insert: vi.fn().mockReturnValue({
                                select: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({
                                        data: null,
                                        error: { message: "Insert failed" },
                                    }),
                                }),
                            }),
                        };
                    }
                    return {};
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await generateInitialBriefFromIntake(
                mockUserId,
                mockProfileId,
                mockIntakeId
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe("Failed to create brief");
        });
    });
});
