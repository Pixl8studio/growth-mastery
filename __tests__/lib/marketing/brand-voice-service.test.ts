/**
 * Brand Voice Service Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as brandVoiceService from "@/lib/marketing/brand-voice-service";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(() => ({
                        data: {
                            id: "test-profile-id",
                            user_id: "test-user",
                            brand_voice: "Test brand voice",
                            tone_settings: {
                                conversational_professional: 50,
                                warmth: 60,
                                urgency: 40,
                                empathy: 70,
                                confidence: 80,
                            },
                        },
                        error: null,
                    })),
                })),
            })),
            insert: vi.fn(() => ({
                select: vi.fn(() => ({
                    single: vi.fn(() => ({
                        data: { id: "new-profile-id" },
                        error: null,
                    })),
                })),
            })),
        })),
    })),
}));

vi.mock("@/lib/ai/client", () => ({
    generateTextWithAI: vi.fn(() =>
        Promise.resolve("Generated brand voice guidelines")
    ),
    generateWithAI: vi.fn(() =>
        Promise.resolve({
            voice_characteristics: ["conversational", "empathetic"],
            pacing: "moderate",
            cadence: "balanced",
            signature_phrases: ["let's dive in", "here's the thing"],
        })
    ),
}));

describe("Brand Voice Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getVoiceGuidelines", () => {
        it("should format voice guidelines correctly", async () => {
            const result =
                await brandVoiceService.getVoiceGuidelines("test-profile-id");

            expect(result.success).toBe(true);
            expect(result.guidelines).toContain("BRAND VOICE GUIDELINES");
            expect(result.guidelines).toContain("TONE SETTINGS");
        });
    });

    // More tests would be added for production
});
