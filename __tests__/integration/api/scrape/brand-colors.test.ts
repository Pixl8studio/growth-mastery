import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/scraping/fetch-utils", () => ({
    fetchWithRetry: vi.fn(),
    validateUrl: vi.fn(),
    getCached: vi.fn(),
    setCache: vi.fn(),
}));

vi.mock("@/lib/scraping/brand-extractor", () => ({
    extractBrandFromHtml: vi.fn(),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
    checkRateLimit: vi.fn(),
    getRateLimitIdentifier: vi.fn(),
}));

const { POST } = await import("@/app/api/scrape/brand-colors/route");

describe("Brand Colors API Route", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("POST /api/scrape/brand-colors", () => {
        it("validates request body", async () => {
            const request = new Request("http://localhost", {
                method: "POST",
                body: JSON.stringify({ url: "invalid" }),
            });

            const response = await POST(request as any);
            const data = await response.json();

            expect(response.status).toBeGreaterThanOrEqual(400);
        });

        it("requires URL field", async () => {
            const request = new Request("http://localhost", {
                method: "POST",
                body: JSON.stringify({}),
            });

            const response = await POST(request as any);
            expect(response.status).toBeGreaterThanOrEqual(400);
        });
    });
});
