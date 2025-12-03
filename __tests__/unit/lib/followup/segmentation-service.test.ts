/**
 * Tests for Segmentation Service
 */

import { describe, it, expect } from "vitest";

// Import functions from service
const {
    determineSegment,
    getSegmentConfig,
    calculateTouchCounts,
    calculateIntentScore,
    getEngagementLevel,
    getAllSegmentConfigs,
} = await import("@/lib/followup/segmentation-service");

describe("Segmentation Service", () => {
    describe("determineSegment", () => {
        it("classifies 0% as no_show", () => {
            const segment = determineSegment(0);
            expect(segment).toBe("no_show");
        });

        it("classifies 1-24% as skimmer", () => {
            expect(determineSegment(1)).toBe("skimmer");
            expect(determineSegment(15)).toBe("skimmer");
            expect(determineSegment(24)).toBe("skimmer");
        });

        it("classifies 25-49% as sampler", () => {
            expect(determineSegment(25)).toBe("sampler");
            expect(determineSegment(35)).toBe("sampler");
            expect(determineSegment(49)).toBe("sampler");
        });

        it("classifies 50-74% as engaged", () => {
            expect(determineSegment(50)).toBe("engaged");
            expect(determineSegment(60)).toBe("engaged");
            expect(determineSegment(74)).toBe("engaged");
        });

        it("classifies 75-100% as hot", () => {
            expect(determineSegment(75)).toBe("hot");
            expect(determineSegment(90)).toBe("hot");
            expect(determineSegment(100)).toBe("hot");
        });
    });

    describe("getSegmentConfig", () => {
        it("returns config for no_show segment", () => {
            const config = getSegmentConfig("no_show");
            expect(config.name).toBe("No-Show Lite");
            expect(config.watchPctRange).toEqual([0, 0]);
            expect(config.touchCount).toBe(2);
            expect(config.tone).toBe("gentle_reminder");
        });

        it("returns config for hot segment", () => {
            const config = getSegmentConfig("hot");
            expect(config.name).toBe("Hot");
            expect(config.watchPctRange).toEqual([75, 100]);
            expect(config.touchCount).toBe(5);
            expect(config.tone).toBe("urgency_driven");
        });

        it("includes cadence hours for each segment", () => {
            const config = getSegmentConfig("engaged");
            expect(config.cadenceHours).toBeDefined();
            expect(Array.isArray(config.cadenceHours)).toBe(true);
        });
    });

    describe("calculateTouchCounts", () => {
        it("returns correct touch counts for each segment", () => {
            expect(calculateTouchCounts("no_show")).toBe(2);
            expect(calculateTouchCounts("skimmer")).toBe(3);
            expect(calculateTouchCounts("sampler")).toBe(4);
            expect(calculateTouchCounts("engaged")).toBe(5);
            expect(calculateTouchCounts("hot")).toBe(5);
        });
    });

    describe("calculateIntentScore", () => {
        it("calculates score with all signals present", () => {
            const score = calculateIntentScore({
                watchPct: 100,
                offerClick: true,
                questionsCount: 4,
                replayViews: 2,
                emailClicked: true,
            });

            // 0.45 + 0.25 + 0.15 + 0.10 + 0.05 = 1.0 = 100
            expect(score).toBe(100);
        });

        it("calculates score with minimal engagement", () => {
            const score = calculateIntentScore({
                watchPct: 0,
                offerClick: false,
                questionsCount: 0,
                replayViews: 0,
                emailClicked: false,
            });

            expect(score).toBe(0);
        });

        it("calculates score with medium engagement", () => {
            const score = calculateIntentScore({
                watchPct: 50,
                offerClick: true,
                questionsCount: 1,
                replayViews: 0,
                emailClicked: false,
            });

            // 0.45 * 0.5 + 0.25 + 0.15 * 0.5 = 0.225 + 0.25 + 0.075 = 0.55 = 55
            expect(score).toBeCloseTo(55, 0);
        });

        it("caps replay views at 1", () => {
            const score1 = calculateIntentScore({
                watchPct: 0,
                offerClick: false,
                questionsCount: 0,
                replayViews: 1,
                emailClicked: false,
            });

            const score5 = calculateIntentScore({
                watchPct: 0,
                offerClick: false,
                questionsCount: 0,
                replayViews: 5,
                emailClicked: false,
            });

            expect(score1).toBe(score5);
        });

        it("caps questions count at 2", () => {
            const score2 = calculateIntentScore({
                watchPct: 0,
                offerClick: false,
                questionsCount: 2,
                replayViews: 0,
                emailClicked: false,
            });

            const score10 = calculateIntentScore({
                watchPct: 0,
                offerClick: false,
                questionsCount: 10,
                replayViews: 0,
                emailClicked: false,
            });

            expect(score2).toBe(score10);
        });
    });

    describe("getEngagementLevel", () => {
        it("classifies score >= 60 as hot", () => {
            expect(getEngagementLevel(60)).toBe("hot");
            expect(getEngagementLevel(80)).toBe("hot");
            expect(getEngagementLevel(100)).toBe("hot");
        });

        it("classifies score 30-59 as warm", () => {
            expect(getEngagementLevel(30)).toBe("warm");
            expect(getEngagementLevel(45)).toBe("warm");
            expect(getEngagementLevel(59)).toBe("warm");
        });

        it("classifies score < 30 as cold", () => {
            expect(getEngagementLevel(0)).toBe("cold");
            expect(getEngagementLevel(15)).toBe("cold");
            expect(getEngagementLevel(29)).toBe("cold");
        });
    });

    describe("getAllSegmentConfigs", () => {
        it("returns all segment configurations", () => {
            const configs = getAllSegmentConfigs();

            expect(configs).toHaveProperty("no_show");
            expect(configs).toHaveProperty("skimmer");
            expect(configs).toHaveProperty("sampler");
            expect(configs).toHaveProperty("engaged");
            expect(configs).toHaveProperty("hot");
        });

        it("each config has required properties", () => {
            const configs = getAllSegmentConfigs();

            Object.values(configs).forEach((config) => {
                expect(config).toHaveProperty("name");
                expect(config).toHaveProperty("watchPctRange");
                expect(config).toHaveProperty("touchCount");
                expect(config).toHaveProperty("cadenceHours");
                expect(config).toHaveProperty("tone");
                expect(config).toHaveProperty("primaryCTA");
                expect(config).toHaveProperty("description");
            });
        });
    });
});
