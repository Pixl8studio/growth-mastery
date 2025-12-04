import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateIntakeContent, extractTextFromPlainFile } from "@/lib/intake/processors";

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
            const content = "This is a long enough piece of content to pass validation. It has more than 100 characters.";
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

        it("should reject lorem ipsum placeholder", () => {
            const content = "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
            const result = validateIntakeContent(content);

            expect(result.valid).toBe(false);
            expect(result.reason).toBe("Content appears to be placeholder text");
        });

        it("should reject other placeholders", () => {
            const content = "This is just placeholder text for testing purposes and should be rejected by the validator.";
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
            const file = new File([content], "test.txt", { type: "text/plain" });

            const result = await extractTextFromPlainFile(file);

            expect(result).toBe(content);
        });

        it("should extract text from markdown file", async () => {
            const content = "# Markdown Heading\n\nThis is markdown content.";
            const file = new File([content], "test.md", { type: "text/markdown" });

            const result = await extractTextFromPlainFile(file);

            expect(result).toBe(content);
        });

        it("should handle errors gracefully", async () => {
            const badFile = {
                name: "test.txt",
                text: vi.fn().mockRejectedValue(new Error("Read error")),
            } as any;

            await expect(extractTextFromPlainFile(badFile)).rejects.toThrow("Failed to read file");
        });
    });
});
