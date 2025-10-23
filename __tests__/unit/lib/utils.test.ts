/**
 * Utils Unit Tests
 * Test core utility functions
 */

import { describe, it, expect } from "vitest";
import {
    cn,
    generateSlug,
    generateUsername,
    isValidUUID,
    isValidUsername,
    formatDate,
    formatDateTime,
    truncate,
    capitalize,
    formatCurrency,
    formatNumber,
    calculatePercentage,
    sleep,
    retry,
} from "@/lib/utils";

describe("utils", () => {
    describe("cn", () => {
        it("should merge class names correctly", () => {
            expect(cn("px-2", "px-4")).toBe("px-4");
            expect(cn("text-sm", "font-bold")).toContain("text-sm");
            expect(cn("text-sm", "font-bold")).toContain("font-bold");
        });

        it("should handle conditional classes", () => {
            expect(cn("base", false && "hidden")).toBe("base");
            expect(cn("base", true && "active")).toContain("active");
        });
    });

    describe("generateSlug", () => {
        it("should generate URL-safe slugs", () => {
            expect(generateSlug("My Awesome Page!")).toBe("my-awesome-page");
            expect(generateSlug("Hello World")).toBe("hello-world");
            expect(generateSlug("Test  Multiple   Spaces")).toBe(
                "test-multiple-spaces"
            );
        });

        it("should handle special characters", () => {
            expect(generateSlug("Test@#$%Page")).toBe("test-page");
            expect(generateSlug("àéîöü")).toBe("");
        });

        it("should trim leading/trailing hyphens", () => {
            expect(generateSlug("-test-")).toBe("test");
            expect(generateSlug("---test---")).toBe("test");
        });
    });

    describe("generateUsername", () => {
        it("should extract username from email", () => {
            expect(generateUsername("john.doe@gmail.com")).toBe("john-doe");
            expect(generateUsername("test@example.com")).toBe("test");
            expect(generateUsername("user_name@domain.com")).toBe("user-name");
        });

        it("should handle edge cases", () => {
            expect(generateUsername("@invalid.com")).toBe("user");
            expect(generateUsername("test")).toBe("test");
        });
    });

    describe("isValidUUID", () => {
        it("should validate correct UUIDs", () => {
            expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
            expect(isValidUUID("a8f3e9d2-4c1b-4e9a-8f7a-d3c4b5a6e7f8")).toBe(true);
        });

        it("should reject invalid UUIDs", () => {
            expect(isValidUUID("not-a-uuid")).toBe(false);
            expect(isValidUUID("550e8400-e29b-41d4-a716")).toBe(false);
            expect(isValidUUID("")).toBe(false);
        });
    });

    describe("isValidUsername", () => {
        it("should validate correct usernames", () => {
            expect(isValidUsername("john-doe")).toBe(true);
            expect(isValidUsername("user123")).toBe(true);
            expect(isValidUsername("test-user-123")).toBe(true);
        });

        it("should reject invalid usernames", () => {
            expect(isValidUsername("ab")).toBe(false); // Too short
            expect(isValidUsername("-test")).toBe(false); // Starts with hyphen
            expect(isValidUsername("test-")).toBe(false); // Ends with hyphen
            expect(isValidUsername("Test")).toBe(false); // Uppercase
            expect(isValidUsername("test@user")).toBe(false); // Special char
        });
    });

    describe("formatDate", () => {
        it("should format dates correctly", () => {
            const date = new Date("2025-01-23T12:00:00Z");
            const formatted = formatDate(date);
            expect(formatted).toContain("Jan");
            expect(formatted).toContain("23");
            expect(formatted).toContain("2025");
        });

        it("should handle string dates", () => {
            const formatted = formatDate("2025-01-23T12:00:00Z");
            expect(formatted).toContain("2025");
        });
    });

    describe("truncate", () => {
        it("should truncate long text", () => {
            expect(truncate("This is a long text", 10)).toBe("This is...");
            expect(truncate("Short", 10)).toBe("Short");
        });

        it("should handle edge cases", () => {
            expect(truncate("", 10)).toBe("");
            expect(truncate("Test", 10)).toBe("Test"); // Text shorter than max length
            expect(truncate("Test", 4)).toBe("Test"); // Text exactly at max length
        });
    });

    describe("capitalize", () => {
        it("should capitalize first letter", () => {
            expect(capitalize("hello")).toBe("Hello");
            expect(capitalize("world")).toBe("World");
        });

        it("should handle edge cases", () => {
            expect(capitalize("")).toBe("");
            expect(capitalize("a")).toBe("A");
        });
    });

    describe("formatCurrency", () => {
        it("should format USD correctly", () => {
            expect(formatCurrency(999.99)).toBe("$999.99");
            expect(formatCurrency(1000)).toBe("$1,000.00");
            expect(formatCurrency(0)).toBe("$0.00");
        });
    });

    describe("formatNumber", () => {
        it("should format numbers with commas", () => {
            expect(formatNumber(1000)).toBe("1,000");
            expect(formatNumber(1234567)).toBe("1,234,567");
            expect(formatNumber(42)).toBe("42");
        });
    });

    describe("calculatePercentage", () => {
        it("should calculate percentages correctly", () => {
            expect(calculatePercentage(25, 100)).toBe(25);
            expect(calculatePercentage(1, 3)).toBe(33);
            expect(calculatePercentage(2, 3)).toBe(67);
        });

        it("should handle zero total", () => {
            expect(calculatePercentage(10, 0)).toBe(0);
        });
    });

    describe("sleep", () => {
        it("should delay execution", async () => {
            const start = Date.now();
            await sleep(100);
            const duration = Date.now() - start;
            expect(duration).toBeGreaterThanOrEqual(90);
        });
    });

    describe("retry", () => {
        it("should retry failed operations", async () => {
            let attempts = 0;
            const fn = async () => {
                attempts++;
                if (attempts < 3) throw new Error("Failed");
                return "success";
            };

            const result = await retry(fn, { maxAttempts: 3, delayMs: 10 });
            expect(result).toBe("success");
            expect(attempts).toBe(3);
        });

        it("should throw after max attempts", async () => {
            const fn = async () => {
                throw new Error("Always fails");
            };

            await expect(retry(fn, { maxAttempts: 2, delayMs: 10 })).rejects.toThrow(
                "Always fails"
            );
        });
    });
});
