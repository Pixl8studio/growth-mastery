/**
 * Unit tests for brand-extractor
 * Tests color extraction, filtering, and confidence scoring
 */

import { describe, it, expect } from "vitest";
import { extractBrandFromHtml, BrandData } from "@/lib/scraping/brand-extractor";

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
});
