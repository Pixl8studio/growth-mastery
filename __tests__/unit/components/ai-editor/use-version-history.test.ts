/**
 * useVersionHistory Hook Tests
 * Tests version history fetching, restoration, and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useVersionHistory } from "@/components/ai-editor/hooks/use-version-history";

// Mock client logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useVersionHistory", () => {
    const pageId = "test-page-123";

    beforeEach(() => {
        vi.clearAllMocks();
        mockFetch.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("initialization", () => {
        it("should initialize with default values", () => {
            const { result } = renderHook(() => useVersionHistory({ pageId }));

            expect(result.current.versions).toEqual([]);
            expect(result.current.pagination).toBeNull();
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
        });
    });

    describe("fetchVersions", () => {
        it("should fetch versions successfully", async () => {
            const mockVersions = [
                {
                    id: "v1",
                    version: 3,
                    change_description: "Updated headline",
                    created_at: "2025-01-01T00:00:00Z",
                },
                {
                    id: "v2",
                    version: 2,
                    change_description: "Initial content",
                    created_at: "2025-01-01T00:00:00Z",
                },
            ];
            const mockPagination = {
                page: 1,
                pageSize: 20,
                total: 2,
                totalPages: 1,
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    versions: mockVersions,
                    pagination: mockPagination,
                }),
            });

            const { result } = renderHook(() => useVersionHistory({ pageId }));

            await act(async () => {
                await result.current.fetchVersions();
            });

            expect(result.current.versions).toEqual(mockVersions);
            expect(result.current.pagination).toEqual(mockPagination);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
        });

        it("should handle fetch error", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: "Unauthorized" }),
            });

            const { result } = renderHook(() => useVersionHistory({ pageId }));

            await act(async () => {
                await result.current.fetchVersions();
            });

            expect(result.current.versions).toEqual([]);
            expect(result.current.error).toBe("Unauthorized");
            expect(result.current.isLoading).toBe(false);
        });

        it("should set loading state during fetch", async () => {
            let resolvePromise: (value: unknown) => void;
            const fetchPromise = new Promise((resolve) => {
                resolvePromise = resolve;
            });

            mockFetch.mockImplementationOnce(() => fetchPromise);

            const { result } = renderHook(() => useVersionHistory({ pageId }));

            // Start fetch
            act(() => {
                result.current.fetchVersions();
            });

            // Should be loading
            expect(result.current.isLoading).toBe(true);

            // Complete the fetch
            await act(async () => {
                resolvePromise!({
                    ok: true,
                    json: async () => ({
                        versions: [],
                        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
                    }),
                });
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
        });

        it("should pass page number in request", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    versions: [],
                    pagination: { page: 2, pageSize: 20, total: 0, totalPages: 0 },
                }),
            });

            const { result } = renderHook(() => useVersionHistory({ pageId }));

            await act(async () => {
                await result.current.fetchVersions(2);
            });

            expect(mockFetch).toHaveBeenCalledWith(
                `/api/ai-editor/pages/${pageId}/versions?page=2`
            );
        });
    });

    describe("getVersionHtml", () => {
        it("should get version HTML successfully", async () => {
            const versionId = "v1";
            const htmlContent = "<h1>Version 1 Content</h1>";

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    version: { html_content: htmlContent },
                }),
            });

            const { result } = renderHook(() => useVersionHistory({ pageId }));

            let html: string | null;
            await act(async () => {
                html = await result.current.getVersionHtml(versionId);
            });

            expect(html!).toBe(htmlContent);
            expect(mockFetch).toHaveBeenCalledWith(
                `/api/ai-editor/pages/${pageId}/versions/${versionId}`
            );
        });

        it("should return null on error", async () => {
            const versionId = "v1";

            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: "Not found" }),
            });

            const { result } = renderHook(() => useVersionHistory({ pageId }));

            let html: string | null;
            await act(async () => {
                html = await result.current.getVersionHtml(versionId);
            });

            expect(html!).toBeNull();
        });
    });

    describe("restoreVersion", () => {
        it("should restore version successfully", async () => {
            const versionId = "v1";
            const restoredHtml = "<h1>Restored Content</h1>";
            const newVersion = 5;

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    page: {
                        html_content: restoredHtml,
                        version: newVersion,
                    },
                }),
            });

            const { result } = renderHook(() => useVersionHistory({ pageId }));

            let restoreResult: { html: string; version: number } | null;
            await act(async () => {
                restoreResult = await result.current.restoreVersion(versionId);
            });

            expect(restoreResult!).toEqual({
                html: restoredHtml,
                version: newVersion,
            });
            expect(mockFetch).toHaveBeenCalledWith(
                `/api/ai-editor/pages/${pageId}/versions/${versionId}`,
                { method: "POST" }
            );
        });

        it("should return null on restore error", async () => {
            const versionId = "v1";

            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: "Restore failed" }),
            });

            const { result } = renderHook(() => useVersionHistory({ pageId }));

            let restoreResult: { html: string; version: number } | null;
            await act(async () => {
                restoreResult = await result.current.restoreVersion(versionId);
            });

            expect(restoreResult!).toBeNull();
        });
    });
});
