/**
 * Generator Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    loadGeneratorContext,
    buildPromptContext,
    getMergedGenerationContext,
} from "@/lib/business-profile/generator-integration";
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

describe("Generator Integration", () => {
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockSupabase = {
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn(),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase);
    });

    describe("loadGeneratorContext", () => {
        it("should load and transform business profile into generator context", async () => {
            const projectId = "project-123";
            const mockProfile: Partial<BusinessProfile> = {
                id: "profile-456",
                ideal_customer: "Entrepreneurs",
                transformation: "Build successful businesses",
                offer_name: "Business Accelerator",
                offer_type: "Group program",
                deliverables: "12-week program",
                promise_outcome: "Predictable revenue",
                pricing: { regular: 5000, webinar: 3000 },
                struggle_story: "I struggled with...",
                signature_method: "The 3-Step System",
                vehicle_belief_shift: {
                    outdated_model: "Cold calling",
                    new_model: "Attraction marketing",
                    key_insights: ["Trust is key"],
                    model_flaws: null,
                    proof_data: null,
                    quick_win: null,
                    myths_to_bust: null,
                    success_story: null,
                },
                call_to_action: "Book a call",
                top_objections: [
                    {
                        objection: "Too expensive",
                        response: "ROI in 30 days",
                    },
                ],
            };

            mockSupabase.single.mockResolvedValue({
                data: mockProfile,
                error: null,
            });

            const result = await loadGeneratorContext(projectId);

            expect(result.success).toBe(true);
            expect(result.context).toBeTruthy();
            expect(result.context?.idealCustomer).toBe("Entrepreneurs");
            expect(result.context?.transformation).toBe("Build successful businesses");
            expect(result.context?.offerName).toBe("Business Accelerator");
            expect(result.context?.pricing).toEqual({
                regular: 5000,
                webinar: 3000,
            });
            expect(result.context?.vehicleBeliefShift).toEqual({
                oldModel: "Cold calling",
                newModel: "Attraction marketing",
                keyInsights: ["Trust is key"],
            });
            expect(result.context?.rawProfile).toEqual(mockProfile);
        });

        it("should return empty context if no profile found (PGRST116)", async () => {
            mockSupabase.single.mockResolvedValue({
                data: null,
                error: { code: "PGRST116", message: "Not found" },
            });

            const result = await loadGeneratorContext("project-123");

            expect(result.success).toBe(true);
            expect(result.context).toEqual({});
            expect(logger.info).toHaveBeenCalledWith(
                { projectId: "project-123" },
                "No business profile found, returning empty context"
            );
        });

        it("should handle other database errors", async () => {
            mockSupabase.single.mockResolvedValue({
                data: null,
                error: new Error("Database error"),
            });

            const result = await loadGeneratorContext("project-123");

            expect(result.success).toBe(false);
            expect(result.error).toBe("Database error");
        });

        it("should handle partial profile data", async () => {
            const partialProfile: Partial<BusinessProfile> = {
                id: "profile-123",
                ideal_customer: "Entrepreneurs",
                // Many fields missing
            };

            mockSupabase.single.mockResolvedValue({
                data: partialProfile,
                error: null,
            });

            const result = await loadGeneratorContext("project-123");

            expect(result.success).toBe(true);
            expect(result.context?.idealCustomer).toBe("Entrepreneurs");
            expect(result.context?.transformation).toBeUndefined();
        });

        it("should transform belief shifts correctly", async () => {
            const profile: Partial<BusinessProfile> = {
                id: "profile-123",
                internal_belief_shift: {
                    limiting_belief: "I'm not good enough",
                    mindset_reframes: ["I am capable", "I am worthy"],
                    perceived_lack: null,
                    fear_of_failure: null,
                    micro_action: null,
                    beginner_success_proof: null,
                    success_story: null,
                },
                external_belief_shift: {
                    external_obstacles: "No time, no money",
                    tools_shortcuts: "Use free tools",
                    success_evidence: null,
                    fastest_path: null,
                    success_story: null,
                    resource_myths: null,
                },
            };

            mockSupabase.single.mockResolvedValue({
                data: profile,
                error: null,
            });

            const result = await loadGeneratorContext("project-123");

            expect(result.context?.internalBeliefShift).toEqual({
                limitingBelief: "I'm not good enough",
                reframes: ["I am capable", "I am worthy"],
            });
            expect(result.context?.externalBeliefShift).toEqual({
                obstacles: "No time, no money",
                solutions: "Use free tools",
            });
        });

        it("should handle exceptions gracefully", async () => {
            mockSupabase.single.mockRejectedValue(new Error("Connection failed"));

            const result = await loadGeneratorContext("project-123");

            expect(result.success).toBe(false);
            expect(result.error).toBe("Connection failed");
        });
    });

    describe("buildPromptContext", () => {
        it("should build comprehensive prompt context from generator context", () => {
            const context = {
                idealCustomer: "Entrepreneurs",
                transformation: "Build successful businesses",
                painPoints: "Inconsistent revenue",
                desires: "Financial freedom",
                offerName: "Business Accelerator",
                offerType: "Group program",
                promise: "Predictable $10k months",
                deliverables: "12-week program",
                pricing: { regular: 5000, webinar: 3000 },
                guarantee: "30-day money-back",
                founderStory: "I struggled with...",
                signatureMethod: "The 3-Step System",
                vehicleBeliefShift: {
                    oldModel: "Cold calling",
                    newModel: "Attraction marketing",
                },
                objections: [
                    {
                        objection: "Too expensive",
                        response: "ROI in 30 days",
                    },
                ],
            };

            const promptContext = buildPromptContext(context);

            expect(promptContext).toContain("## Target Audience");
            expect(promptContext).toContain("Entrepreneurs");
            expect(promptContext).toContain("Build successful businesses");
            expect(promptContext).toContain("## Offer Details");
            expect(promptContext).toContain("Business Accelerator");
            expect(promptContext).toContain("Regular: $5000");
            expect(promptContext).toContain("Webinar: $3000");
            expect(promptContext).toContain("## Founder Story");
            expect(promptContext).toContain("The 3-Step System");
            expect(promptContext).toContain("## Belief Shifts");
            expect(promptContext).toContain("Cold calling");
            expect(promptContext).toContain("Attraction marketing");
            expect(promptContext).toContain("## Common Objections");
            expect(promptContext).toContain("Too expensive");
        });

        it("should handle empty context", () => {
            const promptContext = buildPromptContext({});

            expect(promptContext).toBe("");
        });

        it("should handle partial context", () => {
            const context = {
                idealCustomer: "Entrepreneurs",
                offerName: "My Offer",
            };

            const promptContext = buildPromptContext(context);

            expect(promptContext).toContain("## Target Audience");
            expect(promptContext).toContain("Entrepreneurs");
            expect(promptContext).toContain("## Offer Details");
            expect(promptContext).toContain("My Offer");
            expect(promptContext).not.toContain("## Founder Story");
        });

        it("should handle null pricing values", () => {
            const context = {
                offerName: "Test Offer",
                pricing: { regular: null, webinar: 3000 },
            };

            const promptContext = buildPromptContext(context);

            expect(promptContext).toContain("Regular: $TBD");
            expect(promptContext).toContain("Webinar: $3000");
        });

        it("should limit objections to top 3", () => {
            const context = {
                objections: [
                    { objection: "Objection 1", response: "Response 1" },
                    { objection: "Objection 2", response: "Response 2" },
                    { objection: "Objection 3", response: "Response 3" },
                    { objection: "Objection 4", response: "Response 4" },
                ],
            };

            const promptContext = buildPromptContext(context);

            expect(promptContext).toContain("Objection 1");
            expect(promptContext).toContain("Objection 2");
            expect(promptContext).toContain("Objection 3");
            expect(promptContext).not.toContain("Objection 4");
        });

        it("should handle belief shifts with missing fields", () => {
            const context = {
                vehicleBeliefShift: {
                    newModel: "New Way",
                    // oldModel missing
                },
            };

            const promptContext = buildPromptContext(context);

            expect(promptContext).toContain("New Way");
        });
    });

    describe("getMergedGenerationContext", () => {
        it("should merge profile context with intake transcript", async () => {
            const projectId = "project-123";
            const transcript = "This is my business story...";

            const mockProfile: Partial<BusinessProfile> = {
                id: "profile-456",
                ideal_customer: "Entrepreneurs",
                offer_name: "Business Accelerator",
            };

            mockSupabase.single.mockResolvedValue({
                data: mockProfile,
                error: null,
            });

            const result = await getMergedGenerationContext(projectId, transcript);

            expect(result.success).toBe(true);
            expect(result.promptContext).toContain("# Business Profile Context");
            expect(result.promptContext).toContain("Entrepreneurs");
            expect(result.promptContext).toContain("# Intake Transcript");
            expect(result.promptContext).toContain(transcript);
            expect(result.generatorContext?.idealCustomer).toBe("Entrepreneurs");
        });

        it("should handle missing transcript", async () => {
            mockSupabase.single.mockResolvedValue({
                data: { id: "profile-123", ideal_customer: "Entrepreneurs" },
                error: null,
            });

            const result = await getMergedGenerationContext("project-123");

            expect(result.success).toBe(true);
            expect(result.promptContext).toContain("# Business Profile Context");
            expect(result.promptContext).not.toContain("# Intake Transcript");
        });

        it("should fallback to transcript only if profile load fails", async () => {
            mockSupabase.single.mockResolvedValue({
                data: null,
                error: { code: "ERROR", message: "Failed" },
            });

            const transcript = "Just my story";
            const result = await getMergedGenerationContext("project-123", transcript);

            expect(result.success).toBe(true);
            expect(result.promptContext).toContain("## Intake Transcript");
            expect(result.promptContext).toContain(transcript);
            expect(result.promptContext).not.toContain("# Business Profile Context");
        });

        it("should handle empty context and no transcript", async () => {
            mockSupabase.single.mockResolvedValue({
                data: null,
                error: { code: "PGRST116" },
            });

            const result = await getMergedGenerationContext("project-123");

            expect(result.success).toBe(true);
            expect(result.promptContext).toBe("");
        });

        it("should provide both promptContext and generatorContext", async () => {
            const mockProfile: Partial<BusinessProfile> = {
                id: "profile-123",
                ideal_customer: "Entrepreneurs",
                transformation: "Build businesses",
            };

            mockSupabase.single.mockResolvedValue({
                data: mockProfile,
                error: null,
            });

            const result = await getMergedGenerationContext(
                "project-123",
                "My transcript"
            );

            expect(result.promptContext).toBeTruthy();
            expect(result.generatorContext).toBeTruthy();
            expect(result.generatorContext?.idealCustomer).toBe("Entrepreneurs");
            expect(result.generatorContext?.rawProfile).toEqual(mockProfile);
        });
    });
});
