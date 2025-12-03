/**
 * Preflight Service Tests
 * Tests for content validation before publishing
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/logger");
vi.mock("@/lib/ai/client", () => ({
    generateWithAI: vi.fn(),
    generateTextWithAI: vi.fn(),
    openai: {},
}));
vi.mock("@/lib/marketing/platform-knowledge-service", () => ({
    validateContent: vi.fn(),
    calculateReadabilityLevel: vi.fn(),
    getPlatformSpec: vi.fn(),
}));
vi.mock("@/lib/marketing/brand-voice-service", () => ({
    getProfile: vi.fn(),
    getVoiceGuidelines: vi.fn(),
    initializeProfile: vi.fn(),
}));

import {
    runPreflightValidation,
    validateCompliance,
    checkAccessibility,
    verifyBrandVoice,
    enforceCharacterLimits,
    createPreflightStatus,
} from "@/lib/marketing/preflight-service";
import { logger } from "@/lib/logger";
import { generateWithAI } from "@/lib/ai/client";
import {
    validateContent,
    calculateReadabilityLevel,
} from "@/lib/marketing/platform-knowledge-service";
import { getProfile } from "@/lib/marketing/brand-voice-service";

describe("PreflightService", () => {
    const mockProfileId = "profile-123";
    const mockVariant = {
        copy_text: "Test content",
        platform: "instagram",
        media_urls: ["https://example.com/image.jpg"],
        alt_text: "Image description",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("runPreflightValidation", () => {
        it("should pass all checks when content is valid", async () => {
            vi.mocked(validateContent).mockResolvedValue({
                success: true,
                valid: true,
                violations: [],
            });

            vi.mocked(getProfile).mockResolvedValue({
                success: true,
                profile: {
                    brand_voice: "conversational",
                    tone_settings: {
                        conversational_professional: 70,
                        warmth: 80,
                        urgency: 50,
                        empathy: 70,
                        confidence: 60,
                    },
                    echo_mode_config: { enabled: false },
                } as any,
            });

            vi.mocked(generateWithAI).mockResolvedValue({
                alignment_score: 85,
                matches: ["Good tone"],
                deviations: [],
                passed: true,
            });

            vi.mocked(calculateReadabilityLevel).mockReturnValue(7);

            const result = await runPreflightValidation(
                mockVariant as any,
                "instagram",
                mockProfileId
            );

            expect(result.success).toBe(true);
            expect(result.result?.passed).toBe(true);
            expect(result.result?.checks.compliance.passed).toBe(true);
            expect(result.result?.checks.accessibility.passed).toBe(true);
            expect(result.result?.checks.brand_voice.passed).toBe(true);
            expect(result.result?.checks.character_limit.passed).toBe(true);
        });

        it("should fail when compliance check fails", async () => {
            vi.mocked(validateContent).mockResolvedValue({
                success: true,
                valid: true,
                violations: [],
            });

            vi.mocked(getProfile).mockResolvedValue({
                success: true,
                profile: {
                    brand_voice: "professional",
                    tone_settings: {},
                    echo_mode_config: { enabled: false },
                } as any,
            });

            vi.mocked(generateWithAI).mockResolvedValue({
                alignment_score: 85,
                matches: [],
                deviations: [],
                passed: true,
            });

            vi.mocked(calculateReadabilityLevel).mockReturnValue(7);

            const variantWithIssues = {
                ...mockVariant,
                copy_text: "Check out this testimonial from our client!",
            };

            const result = await runPreflightValidation(
                variantWithIssues as any,
                "instagram",
                mockProfileId
            );

            expect(result.success).toBe(true);
            expect(result.result?.checks.compliance.issues.length).toBeGreaterThan(0);
        });
    });

    describe("validateCompliance", () => {
        it("should detect health-related terms requiring disclaimers", async () => {
            const variant = {
                copy_text: "This will cure your headaches naturally",
            };

            const result = await validateCompliance(variant as any);

            expect(result.success).toBe(true);
            expect(result.warnings).toBeDefined();
            expect(result.warnings!.some((w) => w.includes("health"))).toBe(true);
        });

        it("should detect financial claims", async () => {
            const variant = {
                copy_text: "Guaranteed returns on your investment!",
            };

            const result = await validateCompliance(variant as any);

            expect(result.success).toBe(true);
            expect(result.warnings).toBeDefined();
            expect(result.warnings!.some((w) => w.includes("finance"))).toBe(true);
        });

        it("should flag absolute claims", async () => {
            const variant = {
                copy_text: "100% guaranteed results, always works perfectly!",
            };

            const result = await validateCompliance(variant as any);

            expect(result.success).toBe(true);
            expect(result.warnings).toBeDefined();
            expect(result.warnings!.length).toBeGreaterThan(0);
        });

        it("should require disclaimer for testimonials", async () => {
            const variant = {
                copy_text: "Here's a testimonial from our client who made $100k",
            };

            const result = await validateCompliance(variant as any);

            expect(result.success).toBe(true);
            expect(result.violations).toBeDefined();
            expect(result.violations!.some((v) => v.includes("results may vary"))).toBe(
                true
            );
        });

        it("should warn about potential affiliate links", async () => {
            const variant = {
                copy_text: "Link in bio to get this product!",
            };

            const result = await validateCompliance(variant as any);

            expect(result.success).toBe(true);
            expect(result.warnings).toBeDefined();
            expect(result.warnings!.some((w) => w.includes("affiliate"))).toBe(true);
        });

        it("should flag income claims without disclosure", async () => {
            const variant = {
                copy_text: "I earned $50,000 last month using this strategy",
            };

            const result = await validateCompliance(variant as any);

            expect(result.success).toBe(true);
            expect(result.warnings).toBeDefined();
            expect(result.warnings!.some((w) => w.includes("Income claims"))).toBe(
                true
            );
        });

        it("should pass clean content", async () => {
            const variant = {
                copy_text: "Here are 5 tips to improve your marketing strategy",
            };

            const result = await validateCompliance(variant as any);

            expect(result.success).toBe(true);
            expect(result.passed).toBe(true);
            expect(result.violations).toHaveLength(0);
        });
    });

    describe("checkAccessibility", () => {
        it("should require alt text for images", async () => {
            const variant = {
                media_urls: ["https://example.com/image.jpg"],
                alt_text: "",
            };

            const result = await checkAccessibility(variant as any, "instagram");

            expect(result.success).toBe(true);
            expect(result.passed).toBe(false);
            expect(result.violations).toBeDefined();
            expect(
                result.violations!.some((v) => v.includes("Alt text is required"))
            ).toBe(true);
        });

        it("should warn about brief alt text", async () => {
            const variant = {
                media_urls: ["https://example.com/image.jpg"],
                alt_text: "Photo",
            };

            const result = await checkAccessibility(variant as any, "instagram");

            expect(result.success).toBe(true);
            expect(result.warnings).toBeDefined();
            expect(result.warnings!.some((w) => w.includes("too brief"))).toBe(true);
        });

        it("should warn about 'image of' prefix in alt text", async () => {
            const variant = {
                media_urls: ["https://example.com/image.jpg"],
                alt_text: "Image of a marketing dashboard",
            };

            const result = await checkAccessibility(variant as any, "instagram");

            expect(result.success).toBe(true);
            expect(result.warnings).toBeDefined();
            expect(result.warnings!.some((w) => w.includes("image of"))).toBe(true);
        });

        it("should check reading level", async () => {
            const variant = {
                copy_text: "Complex multifaceted strategic marketing implementation",
            };

            vi.mocked(calculateReadabilityLevel).mockReturnValue(12);

            const result = await checkAccessibility(variant as any, "instagram");

            expect(result.success).toBe(true);
            expect(result.warnings).toBeDefined();
            expect(result.warnings!.some((w) => w.includes("Reading level"))).toBe(
                true
            );
        });

        it("should warn about excessive emojis", async () => {
            const variant = {
                copy_text: "Test 😀 😃 😄 😁 😆 😅 content",
            };

            const result = await checkAccessibility(variant as any, "instagram");

            expect(result.success).toBe(true);
            expect(result.warnings).toBeDefined();
            expect(result.warnings!.some((w) => w.includes("emojis"))).toBe(true);
        });

        it("should pass content with good accessibility", async () => {
            const variant = {
                copy_text: "Simple clear content",
                media_urls: ["https://example.com/image.jpg"],
                alt_text: "Marketing dashboard showing growth metrics",
            };

            vi.mocked(calculateReadabilityLevel).mockReturnValue(6);

            const result = await checkAccessibility(variant as any, "instagram");

            expect(result.success).toBe(true);
            expect(result.passed).toBe(true);
        });
    });

    describe("verifyBrandVoice", () => {
        it("should verify content aligns with brand voice", async () => {
            const variant = {
                copy_text: "Let's talk about marketing strategies",
            };

            vi.mocked(getProfile).mockResolvedValue({
                success: true,
                profile: {
                    brand_voice: "conversational",
                    tone_settings: {
                        conversational_professional: 70,
                        warmth: 80,
                    },
                    echo_mode_config: { enabled: false },
                } as any,
            });

            vi.mocked(generateWithAI).mockResolvedValue({
                alignment_score: 85,
                matches: ["Conversational tone maintained"],
                deviations: [],
                passed: true,
            });

            const result = await verifyBrandVoice(variant as any, mockProfileId);

            expect(result.success).toBe(true);
            expect(result.passed).toBe(true);
            expect(result.score).toBe(85);
        });

        it("should fail for low alignment scores", async () => {
            const variant = {
                copy_text: "Corporate synergy leverage",
            };

            vi.mocked(getProfile).mockResolvedValue({
                success: true,
                profile: {
                    brand_voice: "casual",
                    tone_settings: {},
                    echo_mode_config: { enabled: false },
                } as any,
            });

            vi.mocked(generateWithAI).mockResolvedValue({
                alignment_score: 40,
                matches: [],
                deviations: ["Too formal", "Lacks personality"],
                passed: false,
            });

            const result = await verifyBrandVoice(variant as any, mockProfileId);

            expect(result.success).toBe(true);
            expect(result.passed).toBe(false);
            expect(result.violations).toBeDefined();
            expect(result.violations!.length).toBeGreaterThan(0);
        });

        it("should warn for moderate alignment", async () => {
            const variant = {
                copy_text: "Content here",
            };

            vi.mocked(getProfile).mockResolvedValue({
                success: true,
                profile: {
                    brand_voice: "professional",
                    tone_settings: {},
                    echo_mode_config: { enabled: false },
                } as any,
            });

            vi.mocked(generateWithAI).mockResolvedValue({
                alignment_score: 65,
                matches: ["Some alignment"],
                deviations: ["Could be better"],
                passed: true,
            });

            const result = await verifyBrandVoice(variant as any, mockProfileId);

            expect(result.success).toBe(true);
            expect(result.passed).toBe(true);
            expect(result.warnings).toBeDefined();
            expect(result.warnings!.length).toBeGreaterThan(0);
        });

        it("should handle profile fetch failure", async () => {
            vi.mocked(getProfile).mockResolvedValue({
                success: false,
                error: "Profile not found",
            });

            const result = await verifyBrandVoice(
                { copy_text: "Test" } as any,
                mockProfileId
            );

            expect(result.success).toBe(false);
            expect(result.passed).toBe(false);
        });
    });

    describe("enforceCharacterLimits", () => {
        it("should validate content within Twitter limit", async () => {
            const content = "Short tweet";

            const result = await enforceCharacterLimits(content, "twitter");

            expect(result.success).toBe(true);
            expect(result.withinLimit).toBe(true);
            expect(result.currentLength).toBe(11);
            expect(result.maxLength).toBe(280);
            expect(result.excess).toBe(0);
        });

        it("should flag content exceeding Twitter limit", async () => {
            const content = "a".repeat(300);

            const result = await enforceCharacterLimits(content, "twitter");

            expect(result.success).toBe(true);
            expect(result.withinLimit).toBe(false);
            expect(result.excess).toBe(20);
        });

        it("should validate Instagram content", async () => {
            const content = "a".repeat(2000);

            const result = await enforceCharacterLimits(content, "instagram");

            expect(result.success).toBe(true);
            expect(result.withinLimit).toBe(true);
            expect(result.maxLength).toBe(2200);
        });

        it("should validate LinkedIn content", async () => {
            const content = "a".repeat(2500);

            const result = await enforceCharacterLimits(content, "linkedin");

            expect(result.success).toBe(true);
            expect(result.withinLimit).toBe(true);
            expect(result.maxLength).toBe(3000);
        });
    });

    describe("createPreflightStatus", () => {
        it("should create status object from result", () => {
            const result = {
                passed: true,
                checks: {
                    compliance: { passed: true, issues: [] },
                    accessibility: { passed: true, issues: [] },
                    brand_voice: { passed: true, issues: [] },
                    character_limit: { passed: true, issues: [] },
                },
            };

            const status = createPreflightStatus(result as any);

            expect(status.passed).toBe(true);
            expect(status.compliance_check).toBe("passed");
            expect(status.accessibility_check).toBe("passed");
            expect(status.brand_voice_check).toBe("passed");
            expect(status.character_limit_check).toBe("passed");
            expect(status.issues).toHaveLength(0);
        });

        it("should aggregate all issues", () => {
            const result = {
                passed: false,
                checks: {
                    compliance: { passed: false, issues: ["Issue 1"] },
                    accessibility: { passed: false, issues: ["Issue 2"] },
                    brand_voice: { passed: true, issues: [] },
                    character_limit: { passed: false, issues: ["Issue 3"] },
                },
            };

            const status = createPreflightStatus(result as any);

            expect(status.passed).toBe(false);
            expect(status.issues).toHaveLength(3);
            expect(status.issues).toContain("Issue 1");
            expect(status.issues).toContain("Issue 2");
            expect(status.issues).toContain("Issue 3");
        });
    });
});
