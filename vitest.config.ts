import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

/**
 * Testing Strategy:
 * - Pre-push: Runs static analysis only (lint, type-check, format) for fast feedback (<60s).
 *   Tests are intentionally skipped to avoid timeouts with 230+ test files.
 *
 * - CI (GitHub Actions): Runs the full test suite with coverage via pnpm test:ci.
 *   This ensures comprehensive test coverage while keeping local development fast.
 *
 * - Manual options:
 *   - pnpm test:unit:changed - Tests affected by HEAD~1 (for targeted testing)
 *   - pnpm test:unit:fast - All unit tests with dot reporter
 *   - pnpm pre-push:full - Full validation suite including tests
 */
export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./__tests__/setup.ts"],
        // Prevent cascading process spawning
        maxWorkers: 4,
        minWorkers: 1,
        maxConcurrency: 4,
        fileParallelism: true,
        // Timeout protection
        testTimeout: 10000,
        hookTimeout: 10000,
        teardownTimeout: 5000,
        include: [
            "__tests__/unit/**/*.{test,spec}.{ts,tsx}",
            "__tests__/integration/**/*.{test,spec}.{ts,tsx}",
        ],
        exclude: [
            "**/node_modules/**",
            "**/dist/**",
            "**/.gitworktrees/**",
            ".gitworktrees/**",
            // Exclude E2E tests from vitest - they spawn browser processes
            // Run these separately with: pnpm test:e2e
            "**/__tests__/e2e/**",
            // Exclude tests that require external API keys (VAPI_API_KEY, ANTHROPIC_API_KEY)
            // Run these separately in environments with proper credentials
            "**/*vapi*.test.{ts,tsx}",
            "**/presentations/slide-generator.test.ts",
            "**/lib/presentations/slide-generator.test.ts",
        ],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            exclude: [
                "node_modules/",
                "__tests__/",
                "*.config.{js,ts}",
                ".next/",
                "coverage/",
                ".gitworktrees/",
            ],
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "."),
        },
    },
});
