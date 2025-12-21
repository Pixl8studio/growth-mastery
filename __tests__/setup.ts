// ============================================================================
// DOM API Polyfills for jsdom - MUST be defined before any imports
// These methods are not implemented in jsdom but required by Radix UI and other libraries
// Guard against non-DOM environments (e.g., @vitest-environment node)
// ============================================================================

// Only apply DOM polyfills if we're in a DOM environment
if (typeof Element !== "undefined" && typeof window !== "undefined") {
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
}

import { expect, afterEach, beforeAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Only setup DOM mocks if we're in a DOM environment
if (typeof Element !== "undefined" && typeof window !== "undefined") {
    // Mock ResizeObserver globally for component tests using Radix UI
    class ResizeObserverMock {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    global.ResizeObserver = ResizeObserverMock;

    // Mock scrollIntoView for components that need it
    Element.prototype.scrollIntoView = vi.fn();

    // Mock pointer capture methods not available in JSDOM (required for Radix UI Select)
    Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
}

// CRITICAL: Block all real process spawning in tests to prevent system freezes
beforeAll(() => {
    // Mock child_process to prevent real subprocess spawning
    vi.mock("child_process", () => ({
        spawn: vi.fn(() => {
            throw new Error(
                "BLOCKED: Tests cannot spawn real child processes. Use mocks instead."
            );
        }),
        exec: vi.fn(() => {
            throw new Error(
                "BLOCKED: Tests cannot exec real processes. Use mocks instead."
            );
        }),
        execSync: vi.fn(() => {
            throw new Error(
                "BLOCKED: Tests cannot execSync real processes. Use mocks instead."
            );
        }),
        fork: vi.fn(() => {
            throw new Error("BLOCKED: Tests cannot fork processes. Use mocks instead.");
        }),
        execFile: vi.fn(() => {
            throw new Error(
                "BLOCKED: Tests cannot execFile real processes. Use mocks instead."
            );
        }),
    }));

    // Block Node.js worker threads
    vi.mock("worker_threads", () => ({
        Worker: vi.fn(() => {
            throw new Error(
                "BLOCKED: Tests cannot create worker threads. Use mocks instead."
            );
        }),
    }));

    console.warn("🛡️  Process spawning protection ENABLED in tests");
});

// Cleanup after each test
afterEach(() => {
    // Only run DOM cleanup in DOM environments
    if (typeof Element !== "undefined" && typeof window !== "undefined") {
        cleanup();
    }
    vi.clearAllMocks();
});

// Mock Next.js router
vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        prefetch: vi.fn(),
        back: vi.fn(),
    }),
    usePathname: () => "",
    useSearchParams: () => new URLSearchParams(),
}));

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

// Extend Vitest matchers
expect.extend({});
