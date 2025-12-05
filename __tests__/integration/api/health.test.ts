import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/health/route";
import { parseJsonResponse } from "@/__tests__/helpers/api-test-helpers";

// Mock env
vi.mock("@/lib/env", () => ({
    env: {
        NODE_ENV: "test",
    },
}));

describe("GET /api/health", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return health status", async () => {
        const response = await GET();
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.status).toBe("healthy");
        expect(data.timestamp).toBeDefined();
        expect(data.environment).toBe("test");
    });

    it("should return version if available", async () => {
        process.env.npm_package_version = "1.0.0";

        const response = await GET();
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.version).toBe("1.0.0");
    });

    it("should return unknown version if not available", async () => {
        delete process.env.npm_package_version;

        const response = await GET();
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.version).toBe("unknown");
    });
});
