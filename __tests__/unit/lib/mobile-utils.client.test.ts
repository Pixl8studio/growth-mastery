/**
 * Mobile Utils Client Tests
 * Tests client-side mobile detection utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
    useIsMobile,
    useIsTablet,
    useIsTouchDevice,
    useBreakpoint,
    useViewportWidth,
    isViewportBelow,
    isViewportAbove,
    BREAKPOINTS,
} from "@/lib/mobile-utils.client";

describe("Mobile Utils Client", () => {
    let mockMatchMedia: any;

    beforeEach(() => {
        mockMatchMedia = vi.fn((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));

        Object.defineProperty(window, "matchMedia", {
            writable: true,
            value: mockMatchMedia,
        });

        Object.defineProperty(window, "innerWidth", {
            writable: true,
            value: 1024,
        });

        Object.defineProperty(navigator, "userAgent", {
            writable: true,
            value: "Mozilla/5.0",
        });

        Object.defineProperty(navigator, "maxTouchPoints", {
            writable: true,
            value: 0,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("BREAKPOINTS", () => {
        it("should export correct breakpoint values", () => {
            expect(BREAKPOINTS.sm).toBe(640);
            expect(BREAKPOINTS.md).toBe(768);
            expect(BREAKPOINTS.lg).toBe(1024);
            expect(BREAKPOINTS.xl).toBe(1280);
            expect(BREAKPOINTS["2xl"]).toBe(1400);
        });
    });

    describe("useIsMobile", () => {
        it("should return false on desktop", () => {
            mockMatchMedia.mockReturnValue({
                matches: false,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            });

            const { result } = renderHook(() => useIsMobile());

            expect(result.current).toBe(false);
        });

        it("should return true on mobile", () => {
            mockMatchMedia.mockReturnValue({
                matches: true,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            });

            const { result } = renderHook(() => useIsMobile());

            expect(result.current).toBe(true);
        });

        it("should use md breakpoint by default", () => {
            renderHook(() => useIsMobile());

            expect(mockMatchMedia).toHaveBeenCalledWith(
                `(max-width: ${BREAKPOINTS.md - 1}px)`
            );
        });

        it("should accept custom breakpoint", () => {
            renderHook(() => useIsMobile("lg"));

            expect(mockMatchMedia).toHaveBeenCalledWith(
                `(max-width: ${BREAKPOINTS.lg - 1}px)`
            );
        });
    });

    describe("useIsTablet", () => {
        it("should return false on desktop", () => {
            mockMatchMedia.mockReturnValue({
                matches: false,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            });

            const { result } = renderHook(() => useIsTablet());

            expect(result.current).toBe(false);
        });

        it("should return true for tablet screen size", () => {
            mockMatchMedia.mockReturnValue({
                matches: true,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            });

            const { result } = renderHook(() => useIsTablet());

            expect(result.current).toBe(true);
        });

        it("should detect iPad user agent", () => {
            Object.defineProperty(navigator, "userAgent", {
                writable: true,
                value: "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)",
            });

            mockMatchMedia.mockReturnValue({
                matches: false,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            });

            const { result } = renderHook(() => useIsTablet());

            expect(result.current).toBe(true);
        });
    });

    describe("useIsTouchDevice", () => {
        it("should return false for non-touch device", () => {
            const { result } = renderHook(() => useIsTouchDevice());

            expect(result.current).toBe(false);
        });

        it("should return true when maxTouchPoints > 0", () => {
            Object.defineProperty(navigator, "maxTouchPoints", {
                writable: true,
                value: 5,
            });

            const { result } = renderHook(() => useIsTouchDevice());

            expect(result.current).toBe(true);
        });

        it("should return true when ontouchstart exists", () => {
            (window as any).ontouchstart = {};

            const { result } = renderHook(() => useIsTouchDevice());

            expect(result.current).toBe(true);

            delete (window as any).ontouchstart;
        });
    });

    describe("useBreakpoint", () => {
        it("should return false when below breakpoint", () => {
            mockMatchMedia.mockReturnValue({
                matches: false,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            });

            const { result } = renderHook(() => useBreakpoint("lg"));

            expect(result.current).toBe(false);
        });

        it("should return true when above breakpoint", () => {
            mockMatchMedia.mockReturnValue({
                matches: true,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            });

            const { result } = renderHook(() => useBreakpoint("lg"));

            expect(result.current).toBe(true);
        });
    });

    describe("useViewportWidth", () => {
        it("should return current viewport width", () => {
            Object.defineProperty(window, "innerWidth", {
                writable: true,
                value: 1024,
            });

            const { result } = renderHook(() => useViewportWidth());

            expect(result.current).toBe(1024);
        });

        it("should update on resize", () => {
            const { result } = renderHook(() => useViewportWidth());

            act(() => {
                Object.defineProperty(window, "innerWidth", {
                    writable: true,
                    value: 768,
                });
                window.dispatchEvent(new Event("resize"));
            });

            expect(result.current).toBe(768);
        });
    });

    describe("isViewportBelow", () => {
        it("should return true when width below breakpoint", () => {
            expect(isViewportBelow(640, "md")).toBe(true);
        });

        it("should return false when width at breakpoint", () => {
            expect(isViewportBelow(768, "md")).toBe(false);
        });

        it("should return false when width above breakpoint", () => {
            expect(isViewportBelow(1024, "md")).toBe(false);
        });
    });

    describe("isViewportAbove", () => {
        it("should return false when width below breakpoint", () => {
            expect(isViewportAbove(640, "md")).toBe(false);
        });

        it("should return true when width at breakpoint", () => {
            expect(isViewportAbove(768, "md")).toBe(true);
        });

        it("should return true when width above breakpoint", () => {
            expect(isViewportAbove(1024, "md")).toBe(true);
        });
    });
});
