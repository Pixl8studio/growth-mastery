/**
 * GetPublicUrl Tests
 * Tests public URL generation
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getPublicPageUrlClient } from "@/lib/get-public-url";

describe("getPublicPageUrlClient", () => {
    const originalWindow = global.window;

    beforeEach(() => {
        // Mock window.location
        Object.defineProperty(global, "window", {
            value: {
                location: {
                    origin: "https://example.com",
                },
            },
            writable: true,
        });
    });

    afterEach(() => {
        global.window = originalWindow;
    });

    it("should generate correct public URL", () => {
        const url = getPublicPageUrlClient("johndoe", "my-funnel");

        expect(url).toBe("https://example.com/johndoe/my-funnel");
    });

    it("should return null when vanitySlug is null", () => {
        const url = getPublicPageUrlClient("johndoe", null);

        expect(url).toBeNull();
    });

    it("should return null when vanitySlug is empty string", () => {
        const url = getPublicPageUrlClient("johndoe", "");

        expect(url).toBeNull();
    });

    it("should return null when username is empty", () => {
        const url = getPublicPageUrlClient("", "my-funnel");

        expect(url).toBeNull();
    });

    it("should handle special characters in username", () => {
        const url = getPublicPageUrlClient("john-doe_123", "my-funnel");

        expect(url).toBe("https://example.com/john-doe_123/my-funnel");
    });

    it("should handle special characters in vanitySlug", () => {
        const url = getPublicPageUrlClient("johndoe", "my-funnel-2024");

        expect(url).toBe("https://example.com/johndoe/my-funnel-2024");
    });

    it("should use current window origin", () => {
        Object.defineProperty(window, "location", {
            value: {
                origin: "http://localhost:3000",
            },
            writable: true,
        });

        const url = getPublicPageUrlClient("johndoe", "test");

        expect(url).toBe("http://localhost:3000/johndoe/test");
    });

    it("should handle different origins", () => {
        Object.defineProperty(window, "location", {
            value: {
                origin: "https://app.example.com",
            },
            writable: true,
        });

        const url = getPublicPageUrlClient("johndoe", "my-funnel");

        expect(url).toBe("https://app.example.com/johndoe/my-funnel");
    });
});
