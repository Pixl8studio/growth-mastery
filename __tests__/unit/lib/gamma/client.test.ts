/**
 * Unit Tests: Gamma Client
 * Tests for lib/gamma/client.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    generateDeck,
    getDeckStatus,
    createSession,
    deckStructureToMarkdown,
} from "@/lib/gamma/client";
import type { GammaDeckRequest } from "@/lib/gamma/types";

// Mock dependencies
vi.mock("@/lib/logger", () => ({
    logger: {
        child: vi.fn(() => ({
            info: vi.fn(),
            error: vi.fn(),
        })),
        info: vi.fn(),
        error: vi.fn(),
    },
}));

describe("Gamma Client", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("generateDeck", () => {
        it("should generate a deck successfully", async () => {
            const request: GammaDeckRequest = {
                text: "# Slide 1\n\nContent for slide 1",
                theme: "alpine",
                title: "Test Presentation",
            };

            const result = await generateDeck(request);

            expect(result).toHaveProperty("sessionId");
            expect(result).toHaveProperty("deckId");
            expect(result).toHaveProperty("deckUrl");
            expect(result).toHaveProperty("editUrl");
            expect(result.status).toBe("ready");
        });

        it("should generate deck without optional parameters", async () => {
            const request: GammaDeckRequest = {
                text: "# Slide 1\n\nContent",
            };

            const result = await generateDeck(request);

            expect(result).toBeDefined();
            expect(result.deckId).toBeDefined();
        });

        it("should handle errors gracefully", async () => {
            const request: GammaDeckRequest = {
                text: "",
            };

            // Even with empty text, the function should not throw
            const result = await generateDeck(request);
            expect(result).toBeDefined();
        });

        it("should generate unique session and deck IDs", async () => {
            const request: GammaDeckRequest = {
                text: "# Test",
            };

            const result1 = await generateDeck(request);

            // Wait a tiny bit to ensure different timestamp
            await new Promise((resolve) => setTimeout(resolve, 1));

            const result2 = await generateDeck(request);

            expect(result1.sessionId).not.toBe(result2.sessionId);
            expect(result1.deckId).not.toBe(result2.deckId);
        });
    });

    describe("getDeckStatus", () => {
        it("should return deck status", async () => {
            const status = await getDeckStatus("deck-123");

            expect(status).toHaveProperty("status");
            expect(status).toHaveProperty("deckUrl");
            expect(["generating", "ready", "failed"]).toContain(status.status);
        });

        it("should return ready status with deck URL", async () => {
            const status = await getDeckStatus("deck-456");

            expect(status.status).toBe("ready");
            expect(status.deckUrl).toContain("deck-456");
        });
    });

    describe("createSession", () => {
        it("should create a Gamma session successfully", async () => {
            const session = await createSession();

            expect(session).toHaveProperty("sessionId");
            expect(session).toHaveProperty("status");
            expect(session).toHaveProperty("createdAt");
            expect(session.status).toBe("active");
        });

        it("should generate unique session IDs", async () => {
            const session1 = await createSession();

            // Wait a tiny bit to ensure different timestamp
            await new Promise((resolve) => setTimeout(resolve, 1));

            const session2 = await createSession();

            expect(session1.sessionId).not.toBe(session2.sessionId);
        });

        it("should include valid timestamp", async () => {
            const session = await createSession();
            const timestamp = new Date(session.createdAt);

            expect(timestamp.getTime()).toBeGreaterThan(0);
            expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
        });
    });

    describe("deckStructureToMarkdown", () => {
        it("should convert slides to markdown format", () => {
            const slides = [
                {
                    slideNumber: 1,
                    title: "Introduction",
                    description: "Welcome to the presentation",
                    section: "opening",
                },
                {
                    slideNumber: 2,
                    title: "Main Content",
                    description: "Key points and details",
                    section: "body",
                },
            ];

            const markdown = deckStructureToMarkdown(slides);

            expect(markdown).toContain("## Introduction");
            expect(markdown).toContain("Welcome to the presentation");
            expect(markdown).toContain("## Main Content");
            expect(markdown).toContain("Key points and details");
        });

        it("should handle empty slides array", () => {
            const markdown = deckStructureToMarkdown([]);

            expect(markdown).toBe("");
        });

        it("should format each slide with proper spacing", () => {
            const slides = [
                {
                    slideNumber: 1,
                    title: "Slide One",
                    description: "Content one",
                    section: "intro",
                },
            ];

            const markdown = deckStructureToMarkdown(slides);

            // Check for double newlines between sections
            expect(markdown).toContain("\n\n");
        });

        it("should preserve special characters in content", () => {
            const slides = [
                {
                    slideNumber: 1,
                    title: "Code & Examples",
                    description: "Here's some `code` and **bold** text",
                    section: "main",
                },
            ];

            const markdown = deckStructureToMarkdown(slides);

            expect(markdown).toContain("`code`");
            expect(markdown).toContain("**bold**");
            expect(markdown).toContain("&");
        });
    });
});
