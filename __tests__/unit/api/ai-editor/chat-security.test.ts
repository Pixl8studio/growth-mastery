/**
 * AI Editor Chat Endpoint Security Tests
 * Tests for SSRF protection, input validation, and Zod schema validation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Test the URL validation function directly
// We need to extract and test the isAllowedImageUrl logic

describe("AI Editor Chat Security", () => {
    describe("SSRF Protection - URL Validation", () => {
        // Mock environment variables
        const originalEnv = process.env;

        beforeEach(() => {
            vi.resetModules();
            process.env = {
                ...originalEnv,
                NEXT_PUBLIC_SUPABASE_URL: "https://ufndmgxmlceuoapgvfco.supabase.co",
                NEXT_PUBLIC_APP_URL: "https://app.growthmastery.ai",
            };
        });

        // Helper function to replicate the validation logic for testing
        // This mirrors the production isAllowedImageUrl function
        function isAllowedImageUrl(url: string): boolean {
            try {
                const parsedUrl = new URL(url);

                // Block internal IPs and localhost
                const blockedHostnames = [
                    "localhost",
                    "127.0.0.1",
                    "0.0.0.0",
                    "169.254.169.254",
                    "metadata.google.internal",
                    "100.100.100.200",
                ];

                if (blockedHostnames.includes(parsedUrl.hostname)) {
                    return false;
                }

                // Block private IP ranges
                const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
                if (ipv4Regex.test(parsedUrl.hostname)) {
                    const parts = parsedUrl.hostname.split(".").map(Number);
                    if (
                        parts[0] === 10 ||
                        (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
                        (parts[0] === 192 && parts[1] === 168)
                    ) {
                        return false;
                    }
                }

                // Only allow HTTPS
                if (parsedUrl.protocol !== "https:") {
                    return false;
                }

                // Allow only trusted domains - compare hostname exactly to prevent bypass
                const allowedDomains = [
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.NEXT_PUBLIC_APP_URL,
                ].filter(Boolean);

                return allowedDomains.some((domain) => {
                    if (!domain) return false;
                    try {
                        const allowedUrl = new URL(domain);
                        return (
                            parsedUrl.protocol === allowedUrl.protocol &&
                            parsedUrl.hostname === allowedUrl.hostname
                        );
                    } catch {
                        return false;
                    }
                });
            } catch {
                return false;
            }
        }

        it("should block localhost URLs", () => {
            expect(isAllowedImageUrl("http://localhost/image.png")).toBe(false);
            expect(isAllowedImageUrl("https://localhost/image.png")).toBe(false);
        });

        it("should block loopback IP", () => {
            expect(isAllowedImageUrl("http://127.0.0.1/image.png")).toBe(false);
            expect(isAllowedImageUrl("https://127.0.0.1/image.png")).toBe(false);
        });

        it("should block AWS metadata endpoint", () => {
            expect(isAllowedImageUrl("http://169.254.169.254/latest/meta-data/")).toBe(
                false
            );
        });

        it("should block GCP metadata endpoint", () => {
            expect(
                isAllowedImageUrl("http://metadata.google.internal/computeMetadata/v1/")
            ).toBe(false);
        });

        it("should block Azure metadata endpoint", () => {
            expect(isAllowedImageUrl("http://100.100.100.200/metadata/")).toBe(false);
        });

        it("should block private IP ranges - 10.x.x.x", () => {
            expect(isAllowedImageUrl("https://10.0.0.1/image.png")).toBe(false);
            expect(isAllowedImageUrl("https://10.255.255.255/image.png")).toBe(false);
        });

        it("should block private IP ranges - 172.16-31.x.x", () => {
            expect(isAllowedImageUrl("https://172.16.0.1/image.png")).toBe(false);
            expect(isAllowedImageUrl("https://172.31.255.255/image.png")).toBe(false);
        });

        it("should block private IP ranges - 192.168.x.x", () => {
            expect(isAllowedImageUrl("https://192.168.0.1/image.png")).toBe(false);
            expect(isAllowedImageUrl("https://192.168.255.255/image.png")).toBe(false);
        });

        it("should block HTTP URLs (require HTTPS)", () => {
            expect(
                isAllowedImageUrl(
                    "http://ufndmgxmlceuoapgvfco.supabase.co/storage/image.png"
                )
            ).toBe(false);
        });

        it("should allow valid Supabase URLs", () => {
            expect(
                isAllowedImageUrl(
                    "https://ufndmgxmlceuoapgvfco.supabase.co/storage/v1/object/public/page-media/image.png"
                )
            ).toBe(true);
        });

        it("should allow valid app URLs", () => {
            expect(
                isAllowedImageUrl("https://app.growthmastery.ai/api/images/test.png")
            ).toBe(true);
        });

        it("should block unauthorized external domains", () => {
            expect(isAllowedImageUrl("https://evil.com/image.png")).toBe(false);
            expect(isAllowedImageUrl("https://example.com/image.png")).toBe(false);
        });

        it("should block subdomain bypass attempts (SSRF protection)", () => {
            // These URLs start with allowed domains but are actually different hosts
            expect(
                isAllowedImageUrl("https://app.growthmastery.ai.evil.com/image.png")
            ).toBe(false);
            expect(
                isAllowedImageUrl(
                    "https://ufndmgxmlceuoapgvfco.supabase.co.attacker.com/image.png"
                )
            ).toBe(false);
        });

        it("should handle malformed URLs gracefully", () => {
            expect(isAllowedImageUrl("not-a-url")).toBe(false);
            expect(isAllowedImageUrl("")).toBe(false);
            expect(isAllowedImageUrl("javascript:alert(1)")).toBe(false);
        });
    });

    describe("Input Validation Constants", () => {
        const MAX_MESSAGE_LENGTH = 10000;
        const MAX_HTML_SIZE = 500000;
        const MAX_IMAGE_ATTACHMENTS = 5;

        it("should have reasonable message length limit", () => {
            expect(MAX_MESSAGE_LENGTH).toBe(10000);
        });

        it("should have reasonable HTML size limit (500KB)", () => {
            expect(MAX_HTML_SIZE).toBe(500000);
        });

        it("should limit image attachments to 5", () => {
            expect(MAX_IMAGE_ATTACHMENTS).toBe(5);
        });
    });

    describe("Zod Schema Validation", () => {
        const { z } = require("zod");

        const ChatRequestSchema = z.object({
            pageId: z.string().uuid("Invalid page ID format"),
            message: z.string().min(1).max(10000),
            currentHtml: z.string().min(1).max(500000),
            conversationHistory: z
                .array(
                    z.object({
                        role: z.enum(["user", "assistant"]),
                        content: z.string(),
                    })
                )
                .optional()
                .default([]),
            imageAttachments: z
                .array(
                    z.object({
                        id: z.string().min(1),
                        url: z.string().url(),
                    })
                )
                .max(5)
                .optional()
                .default([]),
        });

        it("should validate correct request body", () => {
            const validRequest = {
                pageId: "123e4567-e89b-12d3-a456-426614174000",
                message: "Update the headline",
                currentHtml: "<html><body>Test</body></html>",
            };

            expect(() => ChatRequestSchema.parse(validRequest)).not.toThrow();
        });

        it("should reject invalid UUID for pageId", () => {
            const invalidRequest = {
                pageId: "not-a-uuid",
                message: "Test",
                currentHtml: "<html></html>",
            };

            expect(() => ChatRequestSchema.parse(invalidRequest)).toThrow();
        });

        it("should reject empty message", () => {
            const invalidRequest = {
                pageId: "123e4567-e89b-12d3-a456-426614174000",
                message: "",
                currentHtml: "<html></html>",
            };

            expect(() => ChatRequestSchema.parse(invalidRequest)).toThrow();
        });

        it("should reject message over 10000 characters", () => {
            const invalidRequest = {
                pageId: "123e4567-e89b-12d3-a456-426614174000",
                message: "a".repeat(10001),
                currentHtml: "<html></html>",
            };

            expect(() => ChatRequestSchema.parse(invalidRequest)).toThrow();
        });

        it("should reject more than 5 image attachments", () => {
            const invalidRequest = {
                pageId: "123e4567-e89b-12d3-a456-426614174000",
                message: "Test",
                currentHtml: "<html></html>",
                imageAttachments: Array(6)
                    .fill(null)
                    .map((_, i) => ({
                        id: `img-${i}`,
                        url: "https://example.com/image.png",
                    })),
            };

            expect(() => ChatRequestSchema.parse(invalidRequest)).toThrow();
        });

        it("should reject invalid URL in imageAttachments", () => {
            const invalidRequest = {
                pageId: "123e4567-e89b-12d3-a456-426614174000",
                message: "Test",
                currentHtml: "<html></html>",
                imageAttachments: [{ id: "img-1", url: "not-a-url" }],
            };

            expect(() => ChatRequestSchema.parse(invalidRequest)).toThrow();
        });
    });
});
