/**
 * Platform Knowledge Service Tests
 */

import { describe, it, expect } from "vitest";
import { calculateReadabilityLevel } from "@/lib/marketing/platform-knowledge-service";

describe("Platform Knowledge Service", () => {
    describe("calculateReadabilityLevel", () => {
        it("should calculate grade level for simple text", () => {
            const simpleText = "This is a simple sentence. It is easy to read.";
            const grade = calculateReadabilityLevel(simpleText);

            expect(grade).toBeGreaterThanOrEqual(0);
            expect(grade).toBeLessThanOrEqual(12);
        });

        it("should return higher grade for complex text", () => {
            const complexText =
                "The implementation of sophisticated algorithmic methodologies necessitates comprehensive analytical frameworks.";
            const grade = calculateReadabilityLevel(complexText);

            expect(grade).toBeGreaterThan(8);
        });

        it("should handle empty text", () => {
            const grade = calculateReadabilityLevel("");
            expect(grade).toBe(0);
        });
    });
});
