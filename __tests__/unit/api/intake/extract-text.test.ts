/**
 * Tests for extract-text API endpoint
 * Note: File upload tests are limited due to Node.js test environment constraints
 * with FormData/File handling. Manual testing required for file upload flows.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies before importing
vi.mock("@sentry/nextjs", () => ({
    captureException: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

vi.mock("@/lib/intake/processors", () => ({
    extractTextFromFile: vi.fn(),
    validateIntakeContent: vi.fn(),
}));

// Import route after mocks are set up
import { POST } from "@/app/api/intake/extract-text/route";

describe("POST /api/intake/extract-text", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("should return 400 if file is missing", async () => {
        const formData = new FormData();
        formData.append("projectId", "test-project");

        const request = new NextRequest("http://localhost/api/intake/extract-text", {
            method: "POST",
            body: formData,
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("Missing required fields");
    });

    it("should return 400 if both file and projectId are missing", async () => {
        const formData = new FormData();

        const request = new NextRequest("http://localhost/api/intake/extract-text", {
            method: "POST",
            body: formData,
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("Missing required fields");
    });
});
