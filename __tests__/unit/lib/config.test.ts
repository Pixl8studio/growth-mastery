/**
 * Config Unit Tests
 * Test application configuration
 */

import { describe, it, expect } from "vitest";
import {
    APP_CONFIG,
    FUNNEL_CONFIG,
    PAGE_CONFIG,
    USERNAME_CONFIG,
    VANITY_SLUG_CONFIG,
    STRIPE_CONFIG,
    WEBHOOK_CONFIG,
    ANALYTICS_CONFIG,
    CONTACT_CONFIG,
} from "@/lib/config";

describe("config", () => {
    describe("APP_CONFIG", () => {
        it("should have required fields", () => {
            expect(APP_CONFIG.name).toBe("Genie AI");
            expect(APP_CONFIG.description).toBeTruthy();
            expect(APP_CONFIG.url).toBeTruthy();
        });
    });

    describe("FUNNEL_CONFIG", () => {
        it("should have correct total steps", () => {
            expect(FUNNEL_CONFIG.totalSteps).toBe(13);
            expect(FUNNEL_CONFIG.stepNames).toHaveLength(13);
        });

        it("should have correct deck structure", () => {
            expect(FUNNEL_CONFIG.deckStructure.totalSlides).toBe(55);
            expect(FUNNEL_CONFIG.deckStructure.sections).toContain("hook");
            expect(FUNNEL_CONFIG.deckStructure.sections).toContain("problem");
            expect(FUNNEL_CONFIG.deckStructure.sections).toContain("solution");
        });

        it("should have video engagement milestones", () => {
            expect(FUNNEL_CONFIG.videoEngagement.milestones).toEqual([25, 50, 75, 100]);
        });
    });

    describe("USERNAME_CONFIG", () => {
        it("should have valid constraints", () => {
            expect(USERNAME_CONFIG.minLength).toBe(3);
            expect(USERNAME_CONFIG.maxLength).toBe(30);
            expect(USERNAME_CONFIG.pattern).toBeInstanceOf(RegExp);
        });

        it("should validate usernames correctly", () => {
            expect(USERNAME_CONFIG.pattern.test("john-doe")).toBe(true);
            expect(USERNAME_CONFIG.pattern.test("user123")).toBe(true);
            expect(USERNAME_CONFIG.pattern.test("-invalid")).toBe(false);
            expect(USERNAME_CONFIG.pattern.test("ab")).toBe(false);
        });
    });

    describe("STRIPE_CONFIG", () => {
        it("should have platform fee configuration", () => {
            expect(STRIPE_CONFIG.platformFeePercent).toBeGreaterThan(0);
            expect(STRIPE_CONFIG.platformFeeFixed).toBeGreaterThanOrEqual(0);
            expect(STRIPE_CONFIG.currency).toBe("USD");
        });
    });

    describe("WEBHOOK_CONFIG", () => {
        it("should have retry configuration", () => {
            expect(WEBHOOK_CONFIG.maxRetries).toBeGreaterThan(0);
            expect(WEBHOOK_CONFIG.retryDelayMs).toBeGreaterThan(0);
            expect(WEBHOOK_CONFIG.retryBackoffMultiplier).toBeGreaterThan(1);
        });
    });

    describe("ANALYTICS_CONFIG", () => {
        it("should have event types defined", () => {
            expect(ANALYTICS_CONFIG.eventTypes.pageView).toBe("page_view");
            expect(ANALYTICS_CONFIG.eventTypes.videoStart).toBe("video_start");
            expect(ANALYTICS_CONFIG.eventTypes.purchase).toBe("purchase");
        });
    });

    describe("CONTACT_CONFIG", () => {
        it("should have contact stages defined", () => {
            expect(CONTACT_CONFIG.stages.registered).toBe("registered");
            expect(CONTACT_CONFIG.stages.watched).toBe("watched");
            expect(CONTACT_CONFIG.stages.purchased).toBe("purchased");
        });
    });
});
