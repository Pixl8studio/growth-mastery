/**
 * AI Section Generator Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    generateSectionAnswers,
    parseGptPasteResponse,
    generateGptCopyPrompt,
} from "@/lib/business-profile/ai-section-generator";
import type { BusinessProfile } from "@/types/business-profile";

// Mock dependencies
vi.mock("@/lib/ai/client", () => ({
    generateWithAI: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

const { generateWithAI } = await import("@/lib/ai/client");
const { logger } = await import("@/lib/logger");

describe("AI Section Generator", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("generateSectionAnswers", () => {
        const userContext = "I help entrepreneurs build successful businesses.";

        describe("Section 1 generation", () => {
            it("should generate section 1 answers", async () => {
                const mockResponse = {
                    ideal_customer: "Early-stage entrepreneurs",
                    transformation: "Go from struggling to profitable",
                    perceived_problem: "Not enough clients",
                    root_cause: "Lack of marketing strategy",
                    daily_pain_points: "Constant stress about money",
                    secret_desires: "Financial freedom",
                    common_mistakes: "Trying to do everything themselves",
                    limiting_beliefs: "Success requires huge investment",
                    empowering_truths: "Small consistent actions lead to big results",
                };

                vi.mocked(generateWithAI).mockResolvedValue(mockResponse);

                const result = await generateSectionAnswers("section1", userContext);

                expect(result.success).toBe(true);
                expect(result.data).toMatchObject(mockResponse);
                expect(result.data).toHaveProperty("section1_context", userContext);
                expect(result.generatedFields).toContain("ideal_customer");
                expect(result.generatedFields).toContain("transformation");
            });

            it("should include existing profile context in prompt", async () => {
                const existingProfile: Partial<BusinessProfile> = {
                    offer_name: "Business Accelerator",
                    signature_method: "The 3-Step System",
                };

                vi.mocked(generateWithAI).mockResolvedValue({});

                await generateSectionAnswers("section1", userContext, existingProfile);

                expect(generateWithAI).toHaveBeenCalledWith(
                    expect.arrayContaining([
                        expect.objectContaining({
                            role: "user",
                            content: expect.stringContaining("Business Accelerator"),
                        }),
                    ]),
                    expect.any(Object)
                );
            });
        });

        describe("Section 2 generation", () => {
            it("should generate section 2 answers", async () => {
                const mockResponse = {
                    struggle_story: "I struggled with inconsistent income",
                    breakthrough_moment: "Discovered the power of systematic marketing",
                    life_now: "Running a 7-figure business",
                    credibility_experience: "10 years in business, helped 500+ clients",
                    signature_method: "The Revenue Accelerator System",
                };

                vi.mocked(generateWithAI).mockResolvedValue(mockResponse);

                const result = await generateSectionAnswers("section2", userContext);

                expect(result.success).toBe(true);
                expect(result.data).toMatchObject(mockResponse);
                expect(result.generatedFields).toContain("struggle_story");
                expect(result.generatedFields).toContain("signature_method");
            });
        });

        describe("Section 3 generation", () => {
            it("should generate section 3 answers with pricing", async () => {
                const mockResponse = {
                    offer_name: "Business Accelerator",
                    offer_type: "Group program",
                    deliverables: "12-week program, weekly coaching",
                    delivery_process: "Live calls + recorded content",
                    problem_solved: "Inconsistent revenue",
                    promise_outcome: "Predictable $10k months",
                    pricing: { regular: 5000, webinar: 3000 },
                    guarantee: "30-day money-back guarantee",
                    testimonials: "Results from 100+ clients",
                    bonuses: "3 bonus templates",
                };

                vi.mocked(generateWithAI).mockResolvedValue(mockResponse);

                const result = await generateSectionAnswers("section3", userContext);

                expect(result.success).toBe(true);
                expect(result.data).toMatchObject(mockResponse);
                expect(result.data?.pricing).toEqual({
                    regular: 5000,
                    webinar: 3000,
                });
            });
        });

        describe("Section 4 generation", () => {
            it("should generate section 4 belief shifts", async () => {
                const mockResponse = {
                    vehicle_belief_shift: {
                        outdated_model: "Cold calling",
                        model_flaws: "Time-consuming and low conversion",
                        proof_data: "95% rejection rate",
                        new_model: "Attraction marketing",
                        key_insights: ["People buy from those they trust"],
                        quick_win: "Get your first inbound lead",
                        myths_to_bust: "You need to be pushy to sell",
                        success_story: "Client got 10 leads in first week",
                    },
                    internal_belief_shift: {
                        limiting_belief: "I'm not a salesperson",
                        perceived_lack: "Sales skills",
                        fear_of_failure: "Rejection",
                        mindset_reframes: ["Selling is serving"],
                        micro_action: "Share one piece of value",
                        beginner_success_proof: "New coaches get clients too",
                        success_story: "Shy introvert became top earner",
                    },
                    external_belief_shift: {
                        external_obstacles: "No time, no budget",
                        success_evidence: "Others succeeded with less",
                        tools_shortcuts: "Social media for free marketing",
                        fastest_path: "Focus on one platform",
                        success_story: "Built business in 30 days",
                        resource_myths: "You don't need a big team",
                    },
                    poll_questions: ["What's your biggest challenge?"],
                };

                vi.mocked(generateWithAI).mockResolvedValue(mockResponse);

                const result = await generateSectionAnswers("section4", userContext);

                expect(result.success).toBe(true);
                expect(result.data).toMatchObject(mockResponse);
                expect(result.generatedFields).toContain("vehicle_belief_shift");
                expect(result.generatedFields).toContain("poll_questions");
            });
        });

        describe("Section 5 generation", () => {
            it("should generate section 5 CTA and objections", async () => {
                const mockResponse = {
                    call_to_action: "Book your strategy call now",
                    incentive: "First 10 get bonus coaching session",
                    pricing_disclosure: "masterclass",
                    path_options: "Single path to success",
                    top_objections: [
                        {
                            objection: "I don't have time",
                            response: "This system saves you 10 hours per week",
                        },
                        {
                            objection: "Too expensive",
                            response: "ROI in first 30 days guaranteed",
                        },
                    ],
                };

                vi.mocked(generateWithAI).mockResolvedValue(mockResponse);

                const result = await generateSectionAnswers("section5", userContext);

                expect(result.success).toBe(true);
                expect(result.data).toMatchObject(mockResponse);
                expect(result.data?.top_objections).toHaveLength(2);
            });
        });

        it("should handle invalid section ID", async () => {
            const result = await generateSectionAnswers("invalid" as any, userContext);

            expect(result.success).toBe(false);
            expect(result.error).toContain("Unknown section");
        });

        it("should handle AI generation errors", async () => {
            vi.mocked(generateWithAI).mockRejectedValue(
                new Error("AI service unavailable")
            );

            const result = await generateSectionAnswers("section1", userContext);

            expect(result.success).toBe(false);
            expect(result.error).toBe("AI service unavailable");
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe("parseGptPasteResponse", () => {
        it("should parse GPT response for section 1", async () => {
            const pastedContent = `
                1. Ideal Customer: Early-stage entrepreneurs
                2. Transformation: Build profitable businesses
                3. Perceived Problem: Not enough clients
            `;

            const mockParsedData = {
                ideal_customer: "Early-stage entrepreneurs",
                transformation: "Build profitable businesses",
                perceived_problem: "Not enough clients",
            };

            vi.mocked(generateWithAI).mockResolvedValue(mockParsedData);

            const result = await parseGptPasteResponse("section1", pastedContent);

            expect(result.success).toBe(true);
            expect(result.data).toMatchObject(mockParsedData);
            expect(result.generatedFields).toEqual(
                expect.arrayContaining([
                    "ideal_customer",
                    "transformation",
                    "perceived_problem",
                ])
            );
        });

        it("should add context field to parsed data", async () => {
            const pastedContent = "Some GPT response";
            vi.mocked(generateWithAI).mockResolvedValue({
                offer_name: "Test Offer",
            });

            const result = await parseGptPasteResponse("section3", pastedContent);

            expect(result.data).toHaveProperty("section3_context", pastedContent);
        });

        it("should handle complex field types", async () => {
            const mockData = {
                vehicle_belief_shift: {
                    outdated_model: "Old way",
                    new_model: "New way",
                },
                poll_questions: ["Question 1", "Question 2"],
            };

            vi.mocked(generateWithAI).mockResolvedValue(mockData);

            const result = await parseGptPasteResponse("section4", "Complex paste");

            expect(result.success).toBe(true);
            expect(result.data).toMatchObject(mockData);
        });

        it("should filter out null/undefined fields from generatedFields", async () => {
            const mockData = {
                field1: "value",
                field2: null,
                field3: undefined,
                field4: "another value",
            };

            vi.mocked(generateWithAI).mockResolvedValue(mockData);

            const result = await parseGptPasteResponse("section1", "Some content");

            expect(result.generatedFields).toContain("field1");
            expect(result.generatedFields).toContain("field4");
            expect(result.generatedFields).not.toContain("field2");
            expect(result.generatedFields).not.toContain("field3");
        });

        it("should handle parsing errors", async () => {
            vi.mocked(generateWithAI).mockRejectedValue(new Error("Parse failed"));

            const result = await parseGptPasteResponse("section1", "Invalid content");

            expect(result.success).toBe(false);
            expect(result.error).toBe("Parse failed");
        });
    });

    describe("generateGptCopyPrompt", () => {
        it("should generate prompt for section 1", () => {
            const prompt = generateGptCopyPrompt("section1");

            expect(prompt).toContain("Ideal Customer & Core Problem");
            expect(prompt).toContain("Who is your ideal customer?");
            expect(prompt).toContain("What transformation do you help them achieve?");
        });

        it("should generate prompt for section 4 with subfields", () => {
            const prompt = generateGptCopyPrompt("section4");

            expect(prompt).toContain("Teaching Content");
            expect(prompt).toContain("Vehicle Belief Shift");
            expect(prompt).toContain("a) What outdated model");
            expect(prompt).toContain("b) Why is that model flawed");
        });

        it("should generate prompt for all sections", () => {
            const sections = [
                "section1",
                "section2",
                "section3",
                "section4",
                "section5",
            ] as const;

            sections.forEach((sectionId) => {
                const prompt = generateGptCopyPrompt(sectionId);

                expect(prompt).toBeTruthy();
                expect(prompt.length).toBeGreaterThan(50);
                expect(prompt).toMatch(/^# /); // Starts with heading
            });
        });

        it("should number questions sequentially", () => {
            const prompt = generateGptCopyPrompt("section2");

            expect(prompt).toContain("1. ");
            expect(prompt).toContain("2. ");
            expect(prompt).toContain("3. ");
        });
    });
});
