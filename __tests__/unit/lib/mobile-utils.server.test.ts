/**
 * Mobile Utils Server Tests
 * Tests server-side mobile detection utilities
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    isMobileUserAgent,
    isTabletUserAgent,
    getDeviceType,
} from "@/lib/mobile-utils.server";

// Mock next/headers
vi.mock("next/headers", () => ({
    headers: vi.fn(),
}));

describe("Mobile Utils Server", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("isMobileUserAgent", () => {
        it("should return true for iPhone", () => {
            const userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)";
            expect(isMobileUserAgent(userAgent)).toBe(true);
        });

        it("should return true for Android phone", () => {
            const userAgent = "Mozilla/5.0 (Linux; Android 10; Mobile)";
            expect(isMobileUserAgent(userAgent)).toBe(true);
        });

        it("should return true for iPod", () => {
            const userAgent = "Mozilla/5.0 (iPod touch; CPU iPhone OS 14_0 like Mac OS X)";
            expect(isMobileUserAgent(userAgent)).toBe(true);
        });

        it("should return false for iPad (tablet)", () => {
            const userAgent = "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)";
            expect(isMobileUserAgent(userAgent)).toBe(false);
        });

        it("should return false for Android tablet", () => {
            const userAgent = "Mozilla/5.0 (Linux; Android 10; Tablet)";
            expect(isMobileUserAgent(userAgent)).toBe(false);
        });

        it("should return false for desktop", () => {
            const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
            expect(isMobileUserAgent(userAgent)).toBe(false);
        });

        it("should return false for empty user agent", () => {
            expect(isMobileUserAgent("")).toBe(false);
        });
    });

    describe("isTabletUserAgent", () => {
        it("should return true for iPad", () => {
            const userAgent = "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)";
            expect(isTabletUserAgent(userAgent)).toBe(true);
        });

        it("should return true for Android tablet", () => {
            const userAgent = "Mozilla/5.0 (Linux; Android 10; Tablet)";
            expect(isTabletUserAgent(userAgent)).toBe(true);
        });

        it("should return true for PlayBook", () => {
            const userAgent = "Mozilla/5.0 (PlayBook; U; RIM Tablet OS)";
            expect(isTabletUserAgent(userAgent)).toBe(true);
        });

        it("should return false for iPhone", () => {
            const userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)";
            expect(isTabletUserAgent(userAgent)).toBe(false);
        });

        it("should return false for Android phone", () => {
            const userAgent = "Mozilla/5.0 (Linux; Android 10; Mobile)";
            expect(isTabletUserAgent(userAgent)).toBe(false);
        });

        it("should return false for desktop", () => {
            const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
            expect(isTabletUserAgent(userAgent)).toBe(false);
        });
    });

    describe("getDeviceType", () => {
        it("should return 'mobile' for iPhone", () => {
            const userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)";
            expect(getDeviceType(userAgent)).toBe("mobile");
        });

        it("should return 'mobile' for Android phone", () => {
            const userAgent = "Mozilla/5.0 (Linux; Android 10; Mobile)";
            expect(getDeviceType(userAgent)).toBe("mobile");
        });

        it("should return 'tablet' for iPad", () => {
            const userAgent = "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)";
            expect(getDeviceType(userAgent)).toBe("tablet");
        });

        it("should return 'tablet' for Android tablet", () => {
            const userAgent = "Mozilla/5.0 (Linux; Android 10; Tablet)";
            expect(getDeviceType(userAgent)).toBe("tablet");
        });

        it("should return 'desktop' for Windows", () => {
            const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
            expect(getDeviceType(userAgent)).toBe("desktop");
        });

        it("should return 'desktop' for Mac", () => {
            const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";
            expect(getDeviceType(userAgent)).toBe("desktop");
        });

        it("should return 'desktop' for Linux", () => {
            const userAgent = "Mozilla/5.0 (X11; Linux x86_64)";
            expect(getDeviceType(userAgent)).toBe("desktop");
        });

        it("should return 'desktop' for empty user agent", () => {
            expect(getDeviceType("")).toBe("desktop");
        });
    });

    describe("async functions", () => {
        it("should export async device detection functions", async () => {
            const { isMobileDevice, isTabletDevice, isTouchDevice, getServerDeviceType } =
                await import("@/lib/mobile-utils.server");

            expect(typeof isMobileDevice).toBe("function");
            expect(typeof isTabletDevice).toBe("function");
            expect(typeof isTouchDevice).toBe("function");
            expect(typeof getServerDeviceType).toBe("function");
        });
    });
});
