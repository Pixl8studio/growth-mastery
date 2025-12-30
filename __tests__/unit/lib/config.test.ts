/**
 * Config Unit Tests
 * Tests actual configuration behavior, not constant values
 */

import { describe, it, expect } from "vitest";
import { USERNAME_CONFIG } from "@/lib/config";

describe("config", () => {
    describe("USERNAME_CONFIG", () => {
        it("validates usernames with hyphens and numbers", () => {
            expect(USERNAME_CONFIG.pattern.test("john-doe")).toBe(true);
            expect(USERNAME_CONFIG.pattern.test("user123")).toBe(true);
            expect(USERNAME_CONFIG.pattern.test("my-app-name")).toBe(true);
        });

        it("rejects usernames starting with hyphen", () => {
            expect(USERNAME_CONFIG.pattern.test("-invalid")).toBe(false);
        });

        it("rejects usernames shorter than minimum length", () => {
            expect(USERNAME_CONFIG.pattern.test("ab")).toBe(false);
        });

        it("rejects usernames with special characters", () => {
            expect(USERNAME_CONFIG.pattern.test("user@name")).toBe(false);
            expect(USERNAME_CONFIG.pattern.test("user name")).toBe(false);
        });
    });
});
