import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/followup/gmail/status/route";
import { parseJsonResponse } from "@/__tests__/helpers/api-test-helpers";

vi.mock("@/lib/env", () => ({
    env: {
        GOOGLE_CLIENT_ID: undefined,
        GOOGLE_CLIENT_SECRET: undefined,
    },
}));
vi.mock("@/lib/logger", () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { env } from "@/lib/env";

describe("GET /api/followup/gmail/status", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return configured status when OAuth credentials are set", async () => {
        // Mock environment variables as configured
        vi.mocked(env).GOOGLE_CLIENT_ID = "test-client-id";
        vi.mocked(env).GOOGLE_CLIENT_SECRET = "test-client-secret";

        const response = await GET();
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.available).toBe(true);
        expect(data.configured).toBe(true);
        expect(data.message).toContain(
            "Gmail OAuth is configured and ready to use"
        );
    });

    it("should return unconfigured status when OAuth credentials are missing", async () => {
        // Mock environment variables as not configured
        vi.mocked(env).GOOGLE_CLIENT_ID = undefined;
        vi.mocked(env).GOOGLE_CLIENT_SECRET = undefined;

        const response = await GET();
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.available).toBe(false);
        expect(data.configured).toBe(false);
        expect(data.message).toContain(
            "Gmail OAuth requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET"
        );
    });

    it("should return unconfigured status when only client ID is set", async () => {
        // Mock environment variables as partially configured
        vi.mocked(env).GOOGLE_CLIENT_ID = "test-client-id";
        vi.mocked(env).GOOGLE_CLIENT_SECRET = undefined;

        const response = await GET();
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.available).toBe(false);
        expect(data.configured).toBe(false);
    });

    it("should return unconfigured status when only client secret is set", async () => {
        // Mock environment variables as partially configured
        vi.mocked(env).GOOGLE_CLIENT_ID = undefined;
        vi.mocked(env).GOOGLE_CLIENT_SECRET = "test-client-secret";

        const response = await GET();
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.available).toBe(false);
        expect(data.configured).toBe(false);
    });

    it("should return 500 when error occurs during status check", async () => {
        // Create a mock that throws an error when accessed
        Object.defineProperty(env, "GOOGLE_CLIENT_ID", {
            get: () => {
                throw new Error("Failed to read environment variable");
            },
            configurable: true,
        });

        const response = await GET();
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(500);
        expect(data.available).toBe(false);
        expect(data.configured).toBe(false);
        expect(data.message).toContain(
            "Unable to check Gmail OAuth configuration"
        );
    });
});
