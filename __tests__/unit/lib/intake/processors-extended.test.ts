/**
 * Tests for extended intake processors (XLSX, CSV, PPTX support)
 * These tests focus on the validation and routing logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the logger
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

describe("Extended Intake Processors", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("validateIntakeContent", () => {
        it("should validate content with sufficient length", async () => {
            const { validateIntakeContent } = await import("@/lib/intake/processors");

            const validContent =
                "This is a valid piece of content that has more than 100 characters and should pass validation without any issues at all.";

            const result = validateIntakeContent(validContent);

            expect(result.valid).toBe(true);
        });

        it("should reject empty content", async () => {
            const { validateIntakeContent } = await import("@/lib/intake/processors");

            const result = validateIntakeContent("");

            expect(result.valid).toBe(false);
            expect(result.reason).toBe("Content is empty");
        });

        it("should reject content that is too short", async () => {
            const { validateIntakeContent } = await import("@/lib/intake/processors");

            const result = validateIntakeContent("Too short");

            expect(result.valid).toBe(false);
            expect(result.reason).toContain("Content too short");
        });

        it("should reject placeholder text with lorem ipsum", async () => {
            const { validateIntakeContent } = await import("@/lib/intake/processors");

            const loremContent =
                "Lorem ipsum dolor sit amet, consectetur adipiscing elit. This is placeholder text that should be rejected by validation.";

            const result = validateIntakeContent(loremContent);

            expect(result.valid).toBe(false);
            expect(result.reason).toBe("Content appears to be placeholder text");
        });

        it("should accept valid business content", async () => {
            const { validateIntakeContent } = await import("@/lib/intake/processors");

            const businessContent =
                "Our company provides comprehensive software solutions for enterprise clients. We specialize in digital transformation and cloud computing services.";

            const result = validateIntakeContent(businessContent);

            expect(result.valid).toBe(true);
        });
    });

    describe("extractTextFromFile - file type routing", () => {
        it("should throw error for unsupported file type", async () => {
            const { extractTextFromFile } = await import("@/lib/intake/processors");

            const mockFile = {
                name: "test.xyz",
                size: 100,
                type: "application/octet-stream",
                arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
                text: vi.fn().mockResolvedValue(""),
            } as unknown as File;

            await expect(extractTextFromFile(mockFile)).rejects.toThrow(
                "Unsupported file type: xyz"
            );
        });
    });
});
