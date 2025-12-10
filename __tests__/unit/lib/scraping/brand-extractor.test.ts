/**
 * Unit tests for brand-extractor
 * Tests color extraction, filtering, and confidence scoring
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { extractBrandFromHtml, BrandData } from "@/lib/scraping/brand-extractor";

// Mock fetch for external CSS tests
const mockFetch = vi.fn();

describe("extractBrandFromHtml", () => {
    it("should extract primary color from button elements", async () => {
        const html = `
            <html>
                <body>
                    <button style="background-color: #3B82F6">Click</button>
                    <button style="background-color: #3B82F6">Submit</button>
                    <p style="color: #3B82F6">Text</p>
                </body>
            </html>
        `;

        const result = await extractBrandFromHtml(html);

        expect(result.colors.primary).toBe("#3B82F6");
    });

    it("should filter out grayscale colors", async () => {
        const html = `
            <html>
                <body>
                    <div style="background-color: #808080">Gray</div>
                    <div style="background-color: #888888">Gray</div>
                    <button style="background-color: #FF5733">Action</button>
                </body>
            </html>
        `;

        const result = await extractBrandFromHtml(html);

        // Primary should be the colorful button, not grayscale
        expect(result.colors.primary).toBe("#FF5733");
    });

    it("should handle RGB color format", async () => {
        const html = `
            <html>
                <body>
                    <button style="background-color: rgb(59, 130, 246)">Click</button>
                </body>
            </html>
        `;

        const result = await extractBrandFromHtml(html);

        expect(result.colors.primary).toBe("#3B82F6");
    });

    it("should handle RGBA color format", async () => {
        const html = `
            <html>
                <body>
                    <button style="background-color: rgba(59, 130, 246, 0.9)">Click</button>
                </body>
            </html>
        `;

        const result = await extractBrandFromHtml(html);

        expect(result.colors.primary).toBe("#3B82F6");
    });

    it("should handle HSL color format", async () => {
        const html = `
            <html>
                <body>
                    <button style="background-color: hsl(217, 91%, 60%)">Click</button>
                </body>
            </html>
        `;

        const result = await extractBrandFromHtml(html);

        // HSL(217, 91%, 60%) should convert to approximately #3B82F6
        expect(result.colors.primary).toMatch(/^#[0-9A-F]{6}$/);
    });

    it("should handle shorthand hex colors", async () => {
        const html = `
            <html>
                <body>
                    <button style="background-color: #38f">Click</button>
                </body>
            </html>
        `;

        const result = await extractBrandFromHtml(html);

        expect(result.colors.primary).toBe("#3388FF");
    });

    it("should handle named colors", async () => {
        const html = `
            <html>
                <body>
                    <button style="background-color: blue">Click</button>
                </body>
            </html>
        `;

        const result = await extractBrandFromHtml(html);

        expect(result.colors.primary).toBe("#0000FF");
    });

    it("should calculate confidence based on color count", async () => {
        const htmlWithManyColors = `
            <html>
                <body>
                    ${Array.from({ length: 15 }, (_, i) => `<div style="background-color: #${(i * 100).toString(16).padStart(6, "0")}">Color ${i}</div>`).join("")}
                </body>
            </html>
        `;

        const result = await extractBrandFromHtml(htmlWithManyColors);

        // With 15+ unique colors, confidence should be high
        expect(result.confidence.colors).toBeGreaterThanOrEqual(80);
    });

    it("should have low confidence with few colors", async () => {
        const html = `
            <html>
                <body>
                    <button style="background-color: #3B82F6">Click</button>
                </body>
            </html>
        `;

        const result = await extractBrandFromHtml(html);

        // With only 1-2 colors, confidence should be lower
        expect(result.confidence.colors).toBeLessThan(50);
    });

    it("should handle websites with no colors extracted", async () => {
        const html = `
            <html>
                <body>
                    <p>Plain text</p>
                </body>
            </html>
        `;

        const result = await extractBrandFromHtml(html);

        // Should have default colors
        expect(result.colors.primary).toBeDefined();
        expect(result.confidence.colors).toBe(0);
    });

    it("should extract multiple distinct colors", async () => {
        const html = `
            <html>
                <body>
                    <button style="background-color: #3B82F6">Primary</button>
                    <button style="background-color: #8B5CF6">Secondary</button>
                    <button style="background-color: #EC4899">Accent</button>
                </body>
            </html>
        `;

        const result = await extractBrandFromHtml(html);

        expect(result.colors.primary).toBeDefined();
        expect(result.colors.secondary).toBeDefined();
        expect(result.colors.accent).toBeDefined();
    });

    it("should weight button colors higher than paragraph colors", async () => {
        const html = `
            <html>
                <body>
                    <button style="background-color: #FF5733">Action</button>
                    <p style="color: #999999">Text</p>
                    <p style="color: #999999">More text</p>
                    <p style="color: #999999">Even more text</p>
                </body>
            </html>
        `;

        const result = await extractBrandFromHtml(html);

        // Button color should be primary despite fewer occurrences
        expect(result.colors.primary).toBe("#FF5733");
    });

    it("should extract fonts from style attributes", async () => {
        const html = `
            <html>
                <head>
                    <style>
                        body { font-family: 'Inter', sans-serif; }
                    </style>
                </head>
                <body>
                    <h1>Title</h1>
                </body>
            </html>
        `;

        const result = await extractBrandFromHtml(html);

        expect(result.fonts.primary).toBeDefined();
    });

    it("should detect gradients in styles", async () => {
        const html = `
            <html>
                <body>
                    <div style="background: linear-gradient(to right, #3B82F6, #8B5CF6)">Gradient</div>
                </body>
            </html>
        `;

        const result = await extractBrandFromHtml(html);

        expect(result.style.gradients).toBe(true);
    });

    it("should detect box shadows", async () => {
        const html = `
            <html>
                <head>
                    <style>
                        .card { box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    </style>
                </head>
                <body>
                    <div class="card">Content</div>
                </body>
            </html>
        `;

        const result = await extractBrandFromHtml(html);

        expect(result.style.shadows).toBe(true);
    });

    it("should detect border radius", async () => {
        const html = `
            <html>
                <head>
                    <style>
                        button { border-radius: 8px; }
                    </style>
                </head>
                <body>
                    <button>Click</button>
                </body>
            </html>
        `;

        const result = await extractBrandFromHtml(html);

        expect(result.style.borderRadius).toBeDefined();
    });

    it("should filter extreme shades (near white/black)", async () => {
        const html = `
            <html>
                <body>
                    <div style="background-color: #FFFFFF">White</div>
                    <div style="background-color: #000000">Black</div>
                    <button style="background-color: #3B82F6">Action</button>
                </body>
            </html>
        `;

        const result = await extractBrandFromHtml(html);

        // Primary should be the blue button, not white/black
        expect(result.colors.primary).toBe("#3B82F6");
    });

    it("should have overall confidence as average of components", async () => {
        const html = `
            <html>
                <head>
                    <style>
                        body { font-family: 'Inter', sans-serif; }
                    </style>
                </head>
                <body>
                    <button style="background-color: #3B82F6">Click</button>
                    <button style="background-color: #8B5CF6">Submit</button>
                </body>
            </html>
        `;

        const result = await extractBrandFromHtml(html);

        // Overall confidence should be calculated
        expect(result.confidence.overall).toBeGreaterThan(0);
        expect(result.confidence.overall).toBeLessThanOrEqual(100);
    });

    it("should handle malformed HTML gracefully", async () => {
        const html = `
            <html>
                <body>
                    <button style="background-color: #3B82F6">Click
                    <p>Unclosed tags
                </body>
        `;

        const result = await extractBrandFromHtml(html);

        // Should still extract colors despite malformed HTML
        expect(result.colors.primary).toBeDefined();
    });

    it("should handle empty HTML", async () => {
        const html = "";

        const result = await extractBrandFromHtml(html);

        // Should return default values
        expect(result.colors.primary).toBeDefined();
        expect(result.confidence.overall).toBe(0);
    });

    it("should extract background and text colors", async () => {
        const html = `
            <html>
                <body style="background-color: #FFFFFF; color: #000000">
                    <button style="background-color: #3B82F6">Click</button>
                </body>
            </html>
        `;

        const result = await extractBrandFromHtml(html);

        expect(result.colors.background).toBeDefined();
        expect(result.colors.text).toBeDefined();
    });

    it("should extract colors from CSS variables in style tags", async () => {
        const html = `
            <html>
                <head>
                    <style>
                        :root {
                            --primary-color: #FF6B00;
                            --brand-secondary: #00BFFF;
                        }
                    </style>
                </head>
                <body>
                    <p>Content</p>
                </body>
            </html>
        `;

        const result = await extractBrandFromHtml(html);

        // Primary should be the CSS variable color (weighted higher)
        expect(result.colors.primary).toBe("#FF6B00");
    });

    it("should maintain backward compatibility without baseUrl", async () => {
        const html = `
            <html>
                <head>
                    <link rel="stylesheet" href="/styles.css" />
                </head>
                <body>
                    <button style="background-color: #3B82F6">Click</button>
                </body>
            </html>
        `;

        // Without baseUrl, should still work (just won't fetch external CSS)
        const result = await extractBrandFromHtml(html);

        expect(result.colors.primary).toBe("#3B82F6");
    });

    it("should extract colors from inline style with multiple CSS variables", async () => {
        const html = `
            <html>
                <head>
                    <style>
                        :root {
                            --primary: #E11D48;
                            --secondary: #7C3AED;
                            --accent-color: #F59E0B;
                            --bg-color: #FAFAFA;
                        }
                    </style>
                </head>
                <body>
                    <p>Content</p>
                </body>
            </html>
        `;

        const result = await extractBrandFromHtml(html);

        // Should extract one of the vibrant CSS variable colors as primary
        // (not the near-white bg-color)
        const extractedColors = ["#E11D48", "#7C3AED", "#F59E0B"];
        expect(extractedColors).toContain(result.colors.primary);
    });
});

describe("extractBrandFromHtml with external CSS", () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        global.fetch = mockFetch;
        mockFetch.mockReset();
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it("should fetch and parse external CSS files when baseUrl is provided", async () => {
        const html = `
            <html>
                <head>
                    <link rel="stylesheet" href="/styles/main.css" />
                </head>
                <body>
                    <p>Content</p>
                </body>
            </html>
        `;

        const externalCss = `
            :root {
                --primary-color: #FF5733;
            }
            .btn-primary {
                background-color: #FF5733;
            }
        `;

        mockFetch.mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve(externalCss),
        });

        const result = await extractBrandFromHtml(html, {
            baseUrl: "https://example.com",
        });

        expect(mockFetch).toHaveBeenCalledWith(
            "https://example.com/styles/main.css",
            expect.objectContaining({
                headers: expect.objectContaining({
                    Accept: "text/css,*/*;q=0.1",
                }),
            })
        );

        expect(result.colors.primary).toBe("#FF5733");
    });

    it("should handle CORS failures gracefully", async () => {
        const html = `
            <html>
                <head>
                    <link rel="stylesheet" href="https://external.com/styles.css" />
                </head>
                <body>
                    <button style="background-color: #3B82F6">Click</button>
                </body>
            </html>
        `;

        // Simulate CORS failure
        mockFetch.mockRejectedValueOnce(new Error("CORS error"));

        const result = await extractBrandFromHtml(html, {
            baseUrl: "https://example.com",
        });

        // Should still return colors from inline styles
        expect(result.colors.primary).toBe("#3B82F6");
    });

    it("should handle multiple external CSS files", async () => {
        const html = `
            <html>
                <head>
                    <link rel="stylesheet" href="/styles/base.css" />
                    <link rel="stylesheet" href="/styles/theme.css" />
                </head>
                <body>
                    <p>Content</p>
                </body>
            </html>
        `;

        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve(".base { color: #333333; }"),
            })
            .mockResolvedValueOnce({
                ok: true,
                text: () =>
                    Promise.resolve(
                        ":root { --primary-color: #DC2626; } .btn { background-color: #DC2626; }"
                    ),
            });

        const result = await extractBrandFromHtml(html, {
            baseUrl: "https://example.com",
        });

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result.colors.primary).toBe("#DC2626");
    });

    it("should resolve relative URLs correctly", async () => {
        const html = `
            <html>
                <head>
                    <link rel="stylesheet" href="../assets/css/style.css" />
                    <link rel="stylesheet" href="//cdn.example.com/lib.css" />
                </head>
                <body>
                    <p>Content</p>
                </body>
            </html>
        `;

        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve(".test { color: #FF0000; }"),
            })
            .mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve(".lib { color: #00FF00; }"),
            });

        await extractBrandFromHtml(html, {
            baseUrl: "https://example.com/pages/index.html",
        });

        expect(mockFetch).toHaveBeenCalledWith(
            "https://example.com/assets/css/style.css",
            expect.any(Object)
        );
        expect(mockFetch).toHaveBeenCalledWith(
            "https://cdn.example.com/lib.css",
            expect.any(Object)
        );
    });

    it("should extract @import statements from inline styles", async () => {
        const html = `
            <html>
                <head>
                    <style>
                        @import url('/styles/imported.css');
                        .local { color: #111111; }
                    </style>
                </head>
                <body>
                    <p>Content</p>
                </body>
            </html>
        `;

        mockFetch.mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve(":root { --primary-color: #9333EA; }"),
        });

        const result = await extractBrandFromHtml(html, {
            baseUrl: "https://example.com",
        });

        expect(mockFetch).toHaveBeenCalledWith(
            "https://example.com/styles/imported.css",
            expect.any(Object)
        );
        expect(result.colors.primary).toBe("#9333EA");
    });

    it("should extract gradients from external CSS", async () => {
        const html = `
            <html>
                <head>
                    <link rel="stylesheet" href="/styles.css" />
                </head>
                <body>
                    <p>Content</p>
                </body>
            </html>
        `;

        mockFetch.mockResolvedValueOnce({
            ok: true,
            text: () =>
                Promise.resolve(
                    ".hero { background: linear-gradient(to right, #667eea, #764ba2); }"
                ),
        });

        const result = await extractBrandFromHtml(html, {
            baseUrl: "https://example.com",
        });

        expect(result.style.gradients).toBe(true);
    });

    it("should extract fonts from external CSS", async () => {
        const html = `
            <html>
                <head>
                    <link rel="stylesheet" href="/styles.css" />
                </head>
                <body>
                    <p>Content</p>
                </body>
            </html>
        `;

        mockFetch.mockResolvedValueOnce({
            ok: true,
            text: () =>
                Promise.resolve(
                    "body { font-family: 'Roboto', sans-serif; font-weight: 500; }"
                ),
        });

        const result = await extractBrandFromHtml(html, {
            baseUrl: "https://example.com",
        });

        expect(result.fonts.primary).toBe("Roboto");
        expect(result.fonts.weights).toContain("500");
    });

    it("should skip external CSS fetching when fetchExternalCss is false", async () => {
        const html = `
            <html>
                <head>
                    <link rel="stylesheet" href="/styles.css" />
                </head>
                <body>
                    <button style="background-color: #3B82F6">Click</button>
                </body>
            </html>
        `;

        const result = await extractBrandFromHtml(html, {
            baseUrl: "https://example.com",
            fetchExternalCss: false,
        });

        expect(mockFetch).not.toHaveBeenCalled();
        expect(result.colors.primary).toBe("#3B82F6");
    });

    it("should handle 404 responses for external CSS gracefully", async () => {
        const html = `
            <html>
                <head>
                    <link rel="stylesheet" href="/missing.css" />
                </head>
                <body>
                    <button style="background-color: #10B981">Click</button>
                </body>
            </html>
        `;

        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 404,
        });

        const result = await extractBrandFromHtml(html, {
            baseUrl: "https://example.com",
        });

        // Should still return colors from inline styles
        expect(result.colors.primary).toBe("#10B981");
    });
});
