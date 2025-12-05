import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/intake/scrape/route";
import {
    createMockRequest,
    parseJsonResponse,
} from "@/__tests__/helpers/api-test-helpers";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

vi.mock("@/lib/intake/processors", () => ({
    extractTextFromUrl: vi.fn(),
    validateIntakeContent: vi.fn(() => ({ valid: true })),
}));

vi.mock("@/lib/scraping/fetch-utils", () => ({
    fetchWithRetry: vi.fn(),
    validateUrl: vi.fn(() => ({ valid: true })),
    getCached: vi.fn(),
    setCache: vi.fn(),
}));

vi.mock("@/lib/scraping/brand-extractor", () => ({
    extractBrandFromHtml: vi.fn(),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
    checkRateLimit: vi.fn(),
    getRateLimitIdentifier: vi.fn(() => "user-123"),
}));

import { createClient } from "@/lib/supabase/server";
import { extractTextFromUrl } from "@/lib/intake/processors";
import { fetchWithRetry, validateUrl, getCached } from "@/lib/scraping/fetch-utils";

describe("POST /api/intake/scrape", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should scrape URL successfully", async () => {
        const mockIntake = {
            id: "intake-123",
            funnel_project_id: "project-123",
            scraped_url: "https://example.com",
        };

        vi.mocked(getCached).mockResolvedValue(null);
        vi.mocked(validateUrl).mockReturnValue({ valid: true });
        vi.mocked(fetchWithRetry).mockResolvedValue({
            success: true,
            html: "<html><body>Test content</body></html>",
        });
        vi.mocked(extractTextFromUrl).mockResolvedValue("Test content from scraped page");

        const mockSupabase = {
            from: vi.fn(() => ({
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: mockIntake,
                    error: null,
                }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                projectId: "project-123",
                userId: "user-123",
                url: "https://example.com",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.intakeId).toBe("intake-123");
        expect(data.method).toBe("scrape");
    });

    it("should return 400 for invalid URL", async () => {
        vi.mocked(validateUrl).mockReturnValue({ valid: false, error: "Invalid URL" });

        const request = createMockRequest({
            method: "POST",
            body: {
                projectId: "project-123",
                userId: "user-123",
                url: "invalid-url",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("Invalid URL");
    });

    it("should return 400 for missing required fields", async () => {
        const request = createMockRequest({
            method: "POST",
            body: {
                projectId: "project-123",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(400);
        expect(data.error).toBeDefined();
    });

    it("should use cached data when available", async () => {
        const cachedData = {
            scrapedText: "Cached content",
            brandData: null,
            pricing: [],
        };

        vi.mocked(getCached).mockResolvedValue(cachedData);
        vi.mocked(validateUrl).mockReturnValue({ valid: true });

        const mockSupabase = {
            from: vi.fn(() => ({
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: { id: "intake-123" },
                    error: null,
                }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                projectId: "project-123",
                userId: "user-123",
                url: "https://example.com",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should return 500 when fetch fails", async () => {
        vi.mocked(getCached).mockResolvedValue(null);
        vi.mocked(validateUrl).mockReturnValue({ valid: true });
        vi.mocked(fetchWithRetry).mockResolvedValue({
            success: false,
            error: "Failed to fetch",
            statusCode: 500,
        });

        const request = createMockRequest({
            method: "POST",
            body: {
                projectId: "project-123",
                userId: "user-123",
                url: "https://example.com",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to fetch");
    });
});
