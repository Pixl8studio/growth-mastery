/**
 * Vitest Setup
 * Configures the testing environment and global test utilities
 */

// ============================================================================
// DOM API Polyfills for jsdom - MUST be defined before any imports
// These methods are not implemented in jsdom but required by Radix UI and other libraries
// ============================================================================

// Pointer Capture API - Required by Radix UI Select, Slider, and other components
Element.prototype.hasPointerCapture =
    Element.prototype.hasPointerCapture ||
    function (_pointerId: number): boolean {
        return false;
    };

Element.prototype.setPointerCapture =
    Element.prototype.setPointerCapture ||
    function (_pointerId: number): void {
        // No-op for jsdom
    };

Element.prototype.releasePointerCapture =
    Element.prototype.releasePointerCapture ||
    function (_pointerId: number): void {
        // No-op for jsdom
    };

// scrollIntoView - Required by many UI components for focus management
Element.prototype.scrollIntoView =
    Element.prototype.scrollIntoView ||
    function (_options?: boolean | ScrollIntoViewOptions): void {
        // No-op for jsdom
    };

// ResizeObserver - Required by Radix UI Popper and other components
window.ResizeObserver =
    window.ResizeObserver ||
    class ResizeObserver {
        constructor(_callback: ResizeObserverCallback) {}
        observe(_target: Element, _options?: ResizeObserverOptions): void {}
        unobserve(_target: Element): void {}
        disconnect(): void {}
    };

// IntersectionObserver - Required by some lazy-loading components
window.IntersectionObserver =
    window.IntersectionObserver ||
    class IntersectionObserver {
        readonly root: Element | Document | null = null;
        readonly rootMargin: string = "";
        readonly thresholds: ReadonlyArray<number> = [];
        constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
        observe(_target: Element): void {}
        unobserve(_target: Element): void {}
        disconnect(): void {}
        takeRecords(): IntersectionObserverEntry[] {
            return [];
        }
    };

// matchMedia - Required by responsive components
window.matchMedia =
    window.matchMedia ||
    function (query: string): MediaQueryList {
        return {
            matches: false,
            media: query,
            onchange: null,
            addListener: function () {},
            removeListener: function () {},
            addEventListener: function () {},
            removeEventListener: function () {},
            dispatchEvent: function () {
                return false;
            },
        };
    };

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, vi } from "vitest";

// Cleanup after each test
afterEach(() => {
    cleanup();
});

// Setup environment variables for testing
beforeAll(() => {
    // Mock Next.js environment variables
    // @ts-expect-error - NODE_ENV is readonly but we need to set it for tests
    process.env.NODE_ENV = "test";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
});

// Mock Next.js router
vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        prefetch: vi.fn(),
        back: vi.fn(),
        forward: vi.fn(),
        refresh: vi.fn(),
        pathname: "/",
        query: {},
    }),
    usePathname: () => "/",
    useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js image component
vi.mock("next/image", () => ({
    default: ({ src, alt, ...props }: any) => {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={src} alt={alt} {...props} />;
    },
}));

// Suppress console errors in tests (optional - remove if you want to see all errors)
const originalError = console.error;
beforeAll(() => {
    console.error = (...args: any[]) => {
        // Suppress specific React/Next.js warnings that are expected in tests
        if (
            typeof args[0] === "string" &&
            (args[0].includes("Warning: ReactDOM.render") ||
                args[0].includes("Not implemented: HTMLFormElement.prototype.submit"))
        ) {
            return;
        }
        originalError.call(console, ...args);
    };
});

afterEach(() => {
    console.error = originalError;
});
