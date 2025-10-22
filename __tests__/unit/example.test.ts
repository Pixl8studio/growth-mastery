/**
 * Example Unit Test
 * This demonstrates the testing setup with Vitest
 */

import { describe, it, expect } from "vitest";

describe("Example Test Suite", () => {
    it("should pass a basic test", () => {
        expect(true).toBe(true);
    });

    it("should perform basic math", () => {
        expect(2 + 2).toBe(4);
    });

    it("should handle async operations", async () => {
        const result = await Promise.resolve("success");
        expect(result).toBe("success");
    });
});

describe("Array Operations", () => {
    it("should filter arrays correctly", () => {
        const numbers = [1, 2, 3, 4, 5];
        const evens = numbers.filter((n) => n % 2 === 0);
        expect(evens).toEqual([2, 4]);
    });

    it("should map arrays correctly", () => {
        const numbers = [1, 2, 3];
        const doubled = numbers.map((n) => n * 2);
        expect(doubled).toEqual([2, 4, 6]);
    });
});

