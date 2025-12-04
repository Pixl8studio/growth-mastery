/**
 * Tests for Scraping Cache Service
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Vercel KV
const mockKv = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
};

vi.mock("@vercel/kv", () => ({
    kv: mockKv,
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

// Import after mocks are defined
const {
    getCached,
    setCache,
    clearCache,
    cacheExists,
    setCacheWithTTL,
    CACHE_TTL_SECONDS,
} = await import("@/lib/scraping/cache");

describe("Scraping Cache Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("CACHE_TTL_SECONDS", () => {
        it("exports the correct TTL constant", () => {
            expect(CACHE_TTL_SECONDS).toBe(24 * 60 * 60);
        });
    });

    describe("getCached", () => {
        it("returns cached data when it exists", async () => {
            const mockData = { foo: "bar", timestamp: Date.now() };
            mockKv.get.mockResolvedValue(mockData);

            const result = await getCached("test-key");

            expect(result).toEqual(mockData);
            expect(mockKv.get).toHaveBeenCalledWith("test-key");
        });

        it("returns null when cache miss occurs", async () => {
            mockKv.get.mockResolvedValue(null);

            const result = await getCached("missing-key");

            expect(result).toBeNull();
            expect(mockKv.get).toHaveBeenCalledWith("missing-key");
        });

        it("returns null and logs error when cache read fails", async () => {
            mockKv.get.mockRejectedValue(new Error("Redis connection error"));

            const result = await getCached("error-key");

            expect(result).toBeNull();
        });

        it("handles typed data correctly", async () => {
            interface TestData {
                id: string;
                name: string;
            }

            const mockData: TestData = { id: "123", name: "test" };
            mockKv.get.mockResolvedValue(mockData);

            const result = await getCached<TestData>("typed-key");

            expect(result).toEqual(mockData);
        });
    });

    describe("setCache", () => {
        it("sets cache with default TTL successfully", async () => {
            mockKv.set.mockResolvedValue("OK");

            const testData = { content: "test data" };
            await setCache("test-key", testData);

            expect(mockKv.set).toHaveBeenCalledWith("test-key", testData, {
                ex: CACHE_TTL_SECONDS,
            });
        });

        it("handles cache write errors gracefully", async () => {
            mockKv.set.mockRejectedValue(new Error("Write failed"));

            const testData = { content: "test data" };

            // Should not throw
            await expect(setCache("error-key", testData)).resolves.toBeUndefined();
        });

        it("caches complex objects correctly", async () => {
            mockKv.set.mockResolvedValue("OK");

            const complexData = {
                nested: {
                    array: [1, 2, 3],
                    object: { key: "value" },
                },
                timestamp: new Date().toISOString(),
            };

            await setCache("complex-key", complexData);

            expect(mockKv.set).toHaveBeenCalledWith("complex-key", complexData, {
                ex: CACHE_TTL_SECONDS,
            });
        });
    });

    describe("clearCache", () => {
        it("clears cache entry successfully", async () => {
            mockKv.del.mockResolvedValue(1);

            await clearCache("test-key");

            expect(mockKv.del).toHaveBeenCalledWith("test-key");
        });

        it("handles cache clear errors gracefully", async () => {
            mockKv.del.mockRejectedValue(new Error("Delete failed"));

            // Should not throw
            await expect(clearCache("error-key")).resolves.toBeUndefined();
        });

        it("handles clearing non-existent keys", async () => {
            mockKv.del.mockResolvedValue(0);

            await clearCache("non-existent-key");

            expect(mockKv.del).toHaveBeenCalledWith("non-existent-key");
        });
    });

    describe("cacheExists", () => {
        it("returns true when key exists", async () => {
            mockKv.exists.mockResolvedValue(1);

            const result = await cacheExists("existing-key");

            expect(result).toBe(true);
            expect(mockKv.exists).toHaveBeenCalledWith("existing-key");
        });

        it("returns false when key does not exist", async () => {
            mockKv.exists.mockResolvedValue(0);

            const result = await cacheExists("missing-key");

            expect(result).toBe(false);
            expect(mockKv.exists).toHaveBeenCalledWith("missing-key");
        });

        it("returns false on error", async () => {
            mockKv.exists.mockRejectedValue(new Error("Connection error"));

            const result = await cacheExists("error-key");

            expect(result).toBe(false);
        });
    });

    describe("setCacheWithTTL", () => {
        it("sets cache with custom TTL successfully", async () => {
            mockKv.set.mockResolvedValue("OK");

            const testData = { content: "test data" };
            const customTTL = 3600; // 1 hour

            await setCacheWithTTL("test-key", testData, customTTL);

            expect(mockKv.set).toHaveBeenCalledWith("test-key", testData, {
                ex: customTTL,
            });
        });

        it("handles different TTL values correctly", async () => {
            mockKv.set.mockResolvedValue("OK");

            const testData = { content: "test" };
            const shortTTL = 60; // 1 minute

            await setCacheWithTTL("short-lived", testData, shortTTL);

            expect(mockKv.set).toHaveBeenCalledWith("short-lived", testData, {
                ex: shortTTL,
            });
        });

        it("handles cache write errors gracefully", async () => {
            mockKv.set.mockRejectedValue(new Error("Write failed"));

            const testData = { content: "test data" };

            // Should not throw
            await expect(
                setCacheWithTTL("error-key", testData, 3600)
            ).resolves.toBeUndefined();
        });
    });

    describe("Cache resilience", () => {
        it("degrades gracefully when cache is completely unavailable", async () => {
            mockKv.get.mockRejectedValue(new Error("Service unavailable"));
            mockKv.set.mockRejectedValue(new Error("Service unavailable"));

            // Get should return null
            const getResult = await getCached("test-key");
            expect(getResult).toBeNull();

            // Set should not throw
            await expect(
                setCache("test-key", { data: "test" })
            ).resolves.toBeUndefined();
        });
    });
});
