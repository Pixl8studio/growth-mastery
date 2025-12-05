import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

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
        exclude: [
            "**/node_modules/**",
            "**/dist/**",
            "**/.gitworktrees/**",
            ".gitworktrees/**",
            // Exclude E2E tests from vitest - they spawn browser processes
            // Run these separately with: pnpm test:e2e
            "**/__tests__/e2e/**",
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
