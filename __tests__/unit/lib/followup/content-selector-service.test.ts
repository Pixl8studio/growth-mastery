/**
 * Tests for Content Selector Service
 */

import { describe, it, expect, vi } from "vitest";
import {
    detectObjections,
    determinePriceBand,
    getRecommendedStoryTypes,
} from "@/lib/followup/content-selector-service";
import type { FollowupProspect } from "@/types/followup";

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

describe("Content Selector Service", () => {
    const mockProspect: Partial<FollowupProspect> = {
        id: "prospect-123",
        user_id: "user-123",
        email: "test@example.com",
        watch_percentage: 75,
        offer_clicks: 2,
        engagement_level: "warm",
        segment: "engaged",
        converted: false,
        objection_hints: [],
    };

    describe("detectObjections", () => {
        it("uses explicit objection hints when available", () => {
            const prospect = {
                ...mockProspect,
                objection_hints: ["price_concern", "timing_concern"],
            } as FollowupProspect;

            const objections = detectObjections(prospect);

            expect(objections).toContain("price_concern");
            expect(objections).toContain("timing_concern");
        });

        it("infers need_justification for low watch percentage", () => {
            const prospect = {
                ...mockProspect,
                watch_percentage: 30,
                objection_hints: [],
            } as FollowupProspect;

            const objections = detectObjections(prospect);

            expect(objections).toContain("need_justification");
        });

        it("infers price_concern when offer clicked but not converted", () => {
            const prospect = {
                ...mockProspect,
                watch_percentage: 80,
                offer_clicks: 3,
                converted: false,
                objection_hints: [],
            } as FollowupProspect;

            const objections = detectObjections(prospect);

            expect(objections).toContain("price_concern");
        });

        it("infers timing_concern for hot prospects who didn't convert", () => {
            const prospect = {
                ...mockProspect,
                watch_percentage: 95,
                engagement_level: "hot",
                converted: false,
                objection_hints: [],
            } as FollowupProspect;

            const objections = detectObjections(prospect);

            expect(objections).toContain("timing_concern");
        });

        it("returns default objection when none detected", () => {
            const prospect = {
                ...mockProspect,
                watch_percentage: 60,
                offer_clicks: 0,
                engagement_level: "warm",
                converted: false,
                objection_hints: [],
            } as FollowupProspect;

            const objections = detectObjections(prospect);

            expect(objections.length).toBeGreaterThan(0);
            expect(objections).toContain("need_justification");
        });
    });

    describe("determinePriceBand", () => {
        it("returns low for amounts under $1000", () => {
            expect(determinePriceBand(500)).toBe("low");
            expect(determinePriceBand(999)).toBe("low");
        });

        it("returns mid for amounts $1000-$4999", () => {
            expect(determinePriceBand(1000)).toBe("mid");
            expect(determinePriceBand(3500)).toBe("mid");
            expect(determinePriceBand(4999)).toBe("mid");
        });

        it("returns high for amounts $5000+", () => {
            expect(determinePriceBand(5000)).toBe("high");
            expect(determinePriceBand(10000)).toBe("high");
        });
    });

    describe("getRecommendedStoryTypes", () => {
        it("recommends micro_story for no_show segment", () => {
            const types = getRecommendedStoryTypes("no_show");

            expect(types).toContain("micro_story");
        });

        it("recommends case_study for hot segment", () => {
            const types = getRecommendedStoryTypes("hot");

            expect(types).toContain("case_study");
        });

        it("recommends testimonial for engaged segment", () => {
            const types = getRecommendedStoryTypes("engaged");

            expect(types).toContain("testimonial");
        });

        it("returns fallback for unknown segment", () => {
            const types = getRecommendedStoryTypes("unknown");

            expect(types.length).toBeGreaterThan(0);
            expect(types).toContain("proof_element");
        });
    });
});
