import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        setupFiles: ["./vitest.setup.tsx"],
        include: ["__tests__/unit/**/*.{test,spec}.{ts,tsx}"],
        // Parallel execution settings - optimized for 4-core GitHub Actions runner
        pool: "forks",
        poolOptions: {
            forks: {
                singleFork: false,
                maxForks: 4, // Use all 4 cores
            },
        },
        maxConcurrency: 5, // Optimal: allows async overlap without overhead
        fileParallelism: true, // Run test files in parallel
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            exclude: [
                "node_modules/",
                "__tests__/",
                "**/*.config.*",
                "**/*.d.ts",
                ".next/",
                "out/",
            ],
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./"),
        },
    },
});

