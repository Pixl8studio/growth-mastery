/**
 * Tests for Content Extractor Service
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

// Mock fetch-utils
const mockFetchWithRetry = vi.fn();
const mockValidateUrl = vi.fn();

vi.mock("@/lib/scraping/fetch-utils", () => ({
    fetchWithRetry: mockFetchWithRetry,
    validateUrl: mockValidateUrl,
}));

// Import after mocks
const { extractContent, extractContentFromUrl } = await import(
    "@/lib/scraping/content-extractor"
);

describe("Content Extractor Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("extractContent", () => {
        it("extracts basic content from HTML", async () => {
            const html = `
                <html>
                    <head>
                        <title>Test Article</title>
                        <meta name="description" content="Test description">
                        <meta name="author" content="John Doe">
                    </head>
                    <body>
                        <article>
                            <h1>Main Title</h1>
                            <p>This is a substantial paragraph with more than fifty characters of content.</p>
                            <p>This is another paragraph with significant content that should be extracted.</p>
                        </article>
                    </body>
                </html>
            `;

            const result = await extractContent(html, "https://example.com");

            expect(result.title).toBe("Test Article");
            expect(result.description).toBe("Test description");
            expect(result.metadata.author).toBe("John Doe");
            expect(result.mainContent).toContain("substantial paragraph");
            expect(result.headings).toContain("Main Title");
        });

        it("extracts metadata from Open Graph tags", async () => {
            const html = `
                <html>
                    <head>
                        <meta property="og:title" content="OG Title">
                        <meta property="og:description" content="OG Description">
                        <meta property="article:author" content="Jane Smith">
                        <meta property="article:published_time" content="2024-01-01T00:00:00Z">
                    </head>
                    <body>
                        <p>Content</p>
                    </body>
                </html>
            `;

            const result = await extractContent(html, "https://example.com");

            expect(result.title).toBe("OG Title");
            expect(result.description).toBe("OG Description");
            expect(result.metadata.author).toBe("Jane Smith");
            expect(result.metadata.publishDate).toBe("2024-01-01T00:00:00Z");
        });

        it("extracts keywords from meta tags", async () => {
            const html = `
                <html>
                    <head>
                        <title>Test</title>
                        <meta name="keywords" content="javascript, testing, automation">
                    </head>
                    <body>
                        <p>Content with more than fifty characters to be substantial.</p>
                    </body>
                </html>
            `;

            const result = await extractContent(html, "https://example.com");

            expect(result.metadata.keywords).toEqual([
                "javascript",
                "testing",
                "automation",
            ]);
        });

        it("removes unwanted elements from content", async () => {
            const html = `
                <html>
                    <body>
                        <nav>Navigation menu</nav>
                        <header>Header content</header>
                        <article>
                            <p>This is the main content that should be extracted successfully.</p>
                        </article>
                        <script>console.log('script');</script>
                        <footer>Footer content</footer>
                    </body>
                </html>
            `;

            const result = await extractContent(html, "https://example.com");

            expect(result.mainContent).toContain("main content");
            expect(result.mainContent).not.toContain("Navigation");
            expect(result.mainContent).not.toContain("Header");
            expect(result.mainContent).not.toContain("Footer");
            expect(result.mainContent).not.toContain("script");
        });

        it("extracts all headings in order", async () => {
            const html = `
                <html>
                    <body>
                        <h1>Title</h1>
                        <h2>Section 1</h2>
                        <h3>Subsection 1.1</h3>
                        <h2>Section 2</h2>
                    </body>
                </html>
            `;

            const result = await extractContent(html, "https://example.com");

            expect(result.headings).toEqual([
                "Title",
                "Section 1",
                "Subsection 1.1",
                "Section 2",
            ]);
        });

        it("extracts and normalizes links", async () => {
            const html = `
                <html>
                    <body>
                        <a href="/relative">Relative link</a>
                        <a href="https://example.com/absolute">Absolute link</a>
                        <a href="#anchor">Anchor</a>
                    </body>
                </html>
            `;

            const result = await extractContent(html, "https://example.com");

            expect(result.links).toContain("https://example.com/relative");
            expect(result.links).toContain("https://example.com/absolute");
            expect(result.links).toContain("https://example.com/#anchor");
        });

        it("extracts and normalizes images", async () => {
            const html = `
                <html>
                    <body>
                        <img src="/image1.jpg" alt="Image 1">
                        <img src="https://example.com/image2.jpg" alt="Image 2">
                    </body>
                </html>
            `;

            const result = await extractContent(html, "https://example.com");

            expect(result.images).toContain("https://example.com/image1.jpg");
            expect(result.images).toContain("https://example.com/image2.jpg");
        });

        it("limits links to 50 items", async () => {
            const links = Array.from(
                { length: 100 },
                (_, i) => `<a href="/link${i}">Link ${i}</a>`
            );
            const html = `
                <html>
                    <body>${links.join("")}</body>
                </html>
            `;

            const result = await extractContent(html, "https://example.com");

            expect(result.links.length).toBeLessThanOrEqual(50);
        });

        it("limits images to 20 items", async () => {
            const images = Array.from(
                { length: 50 },
                (_, i) => `<img src="/image${i}.jpg">`
            );
            const html = `
                <html>
                    <body>${images.join("")}</body>
                </html>
            `;

            const result = await extractContent(html, "https://example.com");

            expect(result.images.length).toBeLessThanOrEqual(20);
        });

        it("calculates word count and reading time", async () => {
            const words = Array.from({ length: 400 }, () => "word").join(" ");
            const html = `
                <html>
                    <body>
                        <article>
                            <p>${words}</p>
                        </article>
                    </body>
                </html>
            `;

            const result = await extractContent(html, "https://example.com");

            expect(result.metadata.wordCount).toBeGreaterThan(0);
            expect(result.metadata.readingTime).toBe(2); // ~400 words / 200 wpm = 2 minutes
        });

        it("deduplicates links", async () => {
            const html = `
                <html>
                    <body>
                        <a href="/link1">Link 1</a>
                        <a href="/link1">Link 1 duplicate</a>
                        <a href="/link2">Link 2</a>
                    </body>
                </html>
            `;

            const result = await extractContent(html, "https://example.com");

            const link1Count = result.links.filter(
                (link) => link === "https://example.com/link1"
            ).length;
            expect(link1Count).toBe(1);
        });

        it("deduplicates images", async () => {
            const html = `
                <html>
                    <body>
                        <img src="/image.jpg">
                        <img src="/image.jpg">
                        <img src="/image2.jpg">
                    </body>
                </html>
            `;

            const result = await extractContent(html, "https://example.com");

            const image1Count = result.images.filter(
                (img) => img === "https://example.com/image.jpg"
            ).length;
            expect(image1Count).toBe(1);
        });

        it("handles HTML with no metadata gracefully", async () => {
            const html = `
                <html>
                    <body>
                        <p>Minimal HTML with no metadata but enough content.</p>
                    </body>
                </html>
            `;

            const result = await extractContent(html, "https://example.com");

            expect(result.title).toBe("");
            expect(result.description).toBeUndefined();
            expect(result.metadata.author).toBeUndefined();
        });

        it("handles empty HTML gracefully", async () => {
            const result = await extractContent("", "https://example.com");

            expect(result.title).toBe("");
            expect(result.mainContent).toBe("");
            expect(result.headings).toEqual([]);
        });
    });

    describe("extractContentFromUrl", () => {
        it("validates URL before fetching", async () => {
            mockValidateUrl.mockReturnValue({
                valid: false,
                error: "Invalid URL",
            });

            await expect(extractContentFromUrl("invalid-url")).rejects.toThrow(
                "Invalid URL"
            );
        });

        it("fetches and extracts content successfully", async () => {
            mockValidateUrl.mockReturnValue({ valid: true });
            mockFetchWithRetry.mockResolvedValue({
                success: true,
                html: `
                    <html>
                        <head><title>Test</title></head>
                        <body>
                            <article>
                                <p>This is the main content of the article with enough text.</p>
                            </article>
                        </body>
                    </html>
                `,
            });

            const result = await extractContentFromUrl("https://example.com");

            expect(result.title).toBe("Test");
            expect(result.mainContent).toContain("main content");
            expect(mockFetchWithRetry).toHaveBeenCalledWith(
                "https://example.com",
                expect.objectContaining({
                    maxRetries: 3,
                    timeoutMs: 30000,
                })
            );
        });

        it("throws error when fetch fails", async () => {
            mockValidateUrl.mockReturnValue({ valid: true });
            mockFetchWithRetry.mockResolvedValue({
                success: false,
                error: "Network error",
            });

            await expect(extractContentFromUrl("https://example.com")).rejects.toThrow(
                "Network error"
            );
        });

        it("throws error when fetch returns no HTML", async () => {
            mockValidateUrl.mockReturnValue({ valid: true });
            mockFetchWithRetry.mockResolvedValue({
                success: true,
                html: null,
            });

            await expect(extractContentFromUrl("https://example.com")).rejects.toThrow(
                "Failed to fetch URL"
            );
        });
    });
});
