/**
 * Vitest Setup
 * Configures the testing environment and global test utilities
 */

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
