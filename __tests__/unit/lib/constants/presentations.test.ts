/**
 * Unit tests for presentation constants and helper functions
 * @vitest-environment node
 */

import { describe, it, expect } from "vitest";
import {
    PRESENTATION_LIMIT,
    PRESENTATION_LIMIT_ENABLED,
    PresentationStatus,
    type PresentationStatusType,
    countsTowardQuota,
    canResume,
    isTerminalState,
} from "@/lib/constants/presentations";

describe("presentation constants", () => {
    describe("PRESENTATION_LIMIT_ENABLED", () => {
        it("should be a boolean", () => {
            expect(typeof PRESENTATION_LIMIT_ENABLED).toBe("boolean");
        });

        it("should be false (limit currently disabled)", () => {
            // This test documents the current state - update when re-enabling
            expect(PRESENTATION_LIMIT_ENABLED).toBe(false);
        });
    });

    describe("PRESENTATION_LIMIT", () => {
        it("should be set to 3", () => {
            expect(PRESENTATION_LIMIT).toBe(3);
        });

        it("should be a positive number", () => {
            expect(PRESENTATION_LIMIT).toBeGreaterThan(0);
        });
    });

    describe("PresentationStatus", () => {
        it("should have all required status values", () => {
            expect(PresentationStatus.DRAFT).toBe("draft");
            expect(PresentationStatus.GENERATING).toBe("generating");
            expect(PresentationStatus.COMPLETED).toBe("completed");
            expect(PresentationStatus.FAILED).toBe("failed");
            expect(PresentationStatus.PAUSED).toBe("paused");
        });

        it("should have exactly 5 status values", () => {
            expect(Object.keys(PresentationStatus)).toHaveLength(5);
        });
    });
});

describe("countsTowardQuota", () => {
    it("should return true for draft status", () => {
        expect(countsTowardQuota(PresentationStatus.DRAFT)).toBe(true);
    });

    it("should return true for generating status", () => {
        expect(countsTowardQuota(PresentationStatus.GENERATING)).toBe(true);
    });

    it("should return true for completed status", () => {
        expect(countsTowardQuota(PresentationStatus.COMPLETED)).toBe(true);
    });

    it("should return true for paused status", () => {
        expect(countsTowardQuota(PresentationStatus.PAUSED)).toBe(true);
    });

    it("should return false for failed status", () => {
        expect(countsTowardQuota(PresentationStatus.FAILED)).toBe(false);
    });

    it("should only exclude failed from quota", () => {
        const allStatuses: PresentationStatusType[] = [
            PresentationStatus.DRAFT,
            PresentationStatus.GENERATING,
            PresentationStatus.COMPLETED,
            PresentationStatus.FAILED,
            PresentationStatus.PAUSED,
        ];

        const quotaCounted = allStatuses.filter(countsTowardQuota);
        expect(quotaCounted).toHaveLength(4);
        expect(quotaCounted).not.toContain(PresentationStatus.FAILED);
    });
});

describe("canResume", () => {
    it("should return true for paused status", () => {
        expect(canResume(PresentationStatus.PAUSED)).toBe(true);
    });

    it("should return true for generating status", () => {
        expect(canResume(PresentationStatus.GENERATING)).toBe(true);
    });

    it("should return false for draft status", () => {
        expect(canResume(PresentationStatus.DRAFT)).toBe(false);
    });

    it("should return false for completed status", () => {
        expect(canResume(PresentationStatus.COMPLETED)).toBe(false);
    });

    it("should return false for failed status", () => {
        expect(canResume(PresentationStatus.FAILED)).toBe(false);
    });
});

describe("isTerminalState", () => {
    it("should return true for completed status", () => {
        expect(isTerminalState(PresentationStatus.COMPLETED)).toBe(true);
    });

    it("should return true for failed status", () => {
        expect(isTerminalState(PresentationStatus.FAILED)).toBe(true);
    });

    it("should return false for draft status", () => {
        expect(isTerminalState(PresentationStatus.DRAFT)).toBe(false);
    });

    it("should return false for generating status", () => {
        expect(isTerminalState(PresentationStatus.GENERATING)).toBe(false);
    });

    it("should return false for paused status", () => {
        expect(isTerminalState(PresentationStatus.PAUSED)).toBe(false);
    });
});
