import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    validateIntakeContent,
    extractTextFromPlainFile,
} from "@/lib/intake/processors";

vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

describe("Intake Processors", () => {
    describe("validateIntakeContent", () => {
        it("should validate valid content", () => {
            // Content must be >= 100 characters and not contain placeholder keywords
            const content =
                "This is a long enough piece of content to pass validation checks. It has well over one hundred characters to meet the minimum length requirement for validation.";
            const result = validateIntakeContent(content);

            expect(result.valid).toBe(true);
            expect(result.reason).toBeUndefined();
        });

        it("should reject empty content", () => {
            const result = validateIntakeContent("");

            expect(result.valid).toBe(false);
            expect(result.reason).toBe("Content is empty");
        });

        it("should reject content that is too short", () => {
            const result = validateIntakeContent("Short");

            expect(result.valid).toBe(false);
            expect(result.reason).toContain("Content too short");
        });

        it("should reject lorem ipsum as placeholder", () => {
            const content =
                "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
            const result = validateIntakeContent(content);

            expect(result.valid).toBe(false);
            expect(result.reason).toBe("Content appears to be placeholder text");
        });

        it("should reject content containing placeholder keyword", () => {
            // This content has the word "placeholder" which triggers the placeholder check
            const content =
                "This is just placeholder text for testing purposes and should be rejected by the validator because it has placeholder in it.";
            const result = validateIntakeContent(content);

            expect(result.valid).toBe(false);
            expect(result.reason).toBe("Content appears to be placeholder text");
        });

        it("should handle whitespace-only content", () => {
            const result = validateIntakeContent("   \n\n   ");

            expect(result.valid).toBe(false);
            expect(result.reason).toBe("Content is empty");
        });
    });

    describe("extractTextFromPlainFile", () => {
        it("should extract text from plain text file", async () => {
            const content = "This is the file content";
            // Create mock file with working text() method since jsdom File may not support it
            const mockFile = {
                name: "test.txt",
                type: "text/plain",
                text: vi.fn().mockResolvedValue(content),
            } as unknown as File;

            const result = await extractTextFromPlainFile(mockFile);

            expect(result).toBe(content);
        });

        it("should extract text from markdown file", async () => {
            const content = "# Markdown Heading\n\nThis is markdown content.";
            // Create mock file with working text() method since jsdom File may not support it
            const mockFile = {
                name: "test.md",
                type: "text/markdown",
                text: vi.fn().mockResolvedValue(content),
            } as unknown as File;

            const result = await extractTextFromPlainFile(mockFile);

            expect(result).toBe(content);
        });

        it("should handle errors gracefully", async () => {
            const badFile = {
                name: "test.txt",
                text: vi.fn().mockRejectedValue(new Error("Read error")),
            } as unknown as File;

            await expect(extractTextFromPlainFile(badFile)).rejects.toThrow(
                "Failed to read file"
            );
        });
    });
});
