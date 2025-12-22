/**
 * useDomainVerification Hook Tests
 * Tests domain verification polling, status management, and callbacks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useDomainVerification } from "@/components/domains/hooks/use-domain-verification";

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

describe("useDomainVerification", () => {
    const domainId = "domain-123";

    beforeEach(() => {
        vi.clearAllMocks();
        mockFetch.mockReset();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    describe("initialization", () => {
        it("should initialize with pending status by default", () => {
            const { result } = renderHook(() =>
                useDomainVerification({ domainId, enabled: false })
            );

            expect(result.current.status).toBe("pending");
            expect(result.current.isPolling).toBe(false);
            expect(result.current.error).toBeNull();
            expect(result.current.lastCheckedAt).toBeNull();
        });

        it("should initialize with verified status when specified", () => {
            const { result } = renderHook(() =>
                useDomainVerification({
                    domainId,
                    enabled: false,
                    initialStatus: "verified",
                })
            );

            expect(result.current.status).toBe("verified");
        });
    });

    describe("checkNow", () => {
        it("should verify domain successfully", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ verified: true }),
            });

            const { result } = renderHook(() =>
                useDomainVerification({ domainId, enabled: false })
            );

            let verified: boolean;
            await act(async () => {
                verified = await result.current.checkNow();
            });

            expect(verified!).toBe(true);
            expect(result.current.status).toBe("verified");
            expect(mockFetch).toHaveBeenCalledWith(`/api/domains/${domainId}/verify`, {
                method: "POST",
            });
        });

        it("should return false when not verified", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ verified: false }),
            });

            const { result } = renderHook(() =>
                useDomainVerification({ domainId, enabled: false })
            );

            let verified: boolean;
            await act(async () => {
                verified = await result.current.checkNow();
            });

            expect(verified!).toBe(false);
            expect(result.current.status).toBe("pending");
        });

        it("should handle verification API error", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: "API Error" }),
            });

            const { result } = renderHook(() =>
                useDomainVerification({ domainId, enabled: false })
            );

            let verified: boolean;
            await act(async () => {
                verified = await result.current.checkNow();
            });

            expect(verified!).toBe(false);
            expect(result.current.error).toBe("API Error");
        });
    });

    describe("callbacks", () => {
        it("should call onVerified when domain is verified", async () => {
            const onVerified = vi.fn();

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ verified: true }),
            });

            const { result } = renderHook(() =>
                useDomainVerification({
                    domainId,
                    enabled: false,
                    onVerified,
                })
            );

            await act(async () => {
                await result.current.checkNow();
            });

            expect(onVerified).toHaveBeenCalled();
        });
    });

    describe("polling", () => {
        it("should not start polling if already verified", () => {
            const { result } = renderHook(() =>
                useDomainVerification({
                    domainId,
                    enabled: false,
                    initialStatus: "verified",
                })
            );

            act(() => {
                result.current.startPolling();
            });

            expect(result.current.isPolling).toBe(false);
        });

        it("should stop polling when stopPolling is called", async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({ verified: false }),
            });

            const { result } = renderHook(() =>
                useDomainVerification({
                    domainId,
                    enabled: false,
                    pollingInterval: 1000,
                })
            );

            // Start polling
            act(() => {
                result.current.startPolling();
            });

            // Wait for first check
            await act(async () => {
                await vi.advanceTimersByTimeAsync(100);
            });

            expect(result.current.isPolling).toBe(true);

            // Stop polling
            act(() => {
                result.current.stopPolling();
            });

            expect(result.current.isPolling).toBe(false);
        });

        it("should set verified status when check succeeds", async () => {
            vi.useRealTimers(); // Use real timers for this test

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ verified: true }),
            });

            const onVerified = vi.fn();

            const { result } = renderHook(() =>
                useDomainVerification({
                    domainId,
                    enabled: false,
                    onVerified,
                })
            );

            // Manual check should work and update status
            await act(async () => {
                await result.current.checkNow();
            });

            expect(result.current.status).toBe("verified");
            expect(onVerified).toHaveBeenCalled();
        });
    });
});
