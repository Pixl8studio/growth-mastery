import { expect, afterEach, beforeAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

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
if (typeof Element !== "undefined") {
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
    cleanup();
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
