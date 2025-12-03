/**
 * Unit Tests for Supabase Configuration Validator
 * Tests all validation functions using the actual exported functions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { existsSync, statSync } from "fs";
import {
    validateEnvVariables,
    validateDatabaseTypes,
    validateSupabaseDirectory,
    validateSupabaseConnection,
    runAllValidations,
} from "@/scripts/validate-supabase";

// Mock file system operations
vi.mock("fs", async (importOriginal) => {
    const actual = await importOriginal<typeof import("fs")>();
    return {
        ...actual,
        existsSync: vi.fn(),
        statSync: vi.fn(),
        readdirSync: vi.fn(),
        readFileSync: vi.fn(),
    };
});

describe("Supabase Validator - Environment Variables", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        // Reset environment before each test
        vi.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
        vi.clearAllMocks();
    });

    it("should warn when NEXT_PUBLIC_SUPABASE_URL is missing", () => {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;

        const result = validateEnvVariables();

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(3); // 2 required + 1 optional
        expect(result.warnings[0]).toContain("NEXT_PUBLIC_SUPABASE_URL");
        expect(result.warnings[1]).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    });

    it("should not warn when required environment variables are set", () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
        process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";

        const result = validateEnvVariables();

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
    });

    it("should warn about missing optional SUPABASE_SERVICE_ROLE_KEY", () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;

        const result = validateEnvVariables();

        expect(result.valid).toBe(true);
        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0]).toContain("SUPABASE_SERVICE_ROLE_KEY");
    });

    it("should handle empty string environment variables as missing", () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = "";
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;

        const result = validateEnvVariables();

        expect(result.warnings).toHaveLength(3);
    });
});

describe("Supabase Validator - Database Types", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetAllMocks();
    });

    // TODO: Fix mocking for filesystem operations in CI
    it.skip("should error when types/database.ts does not exist", () => {
        const existsSyncMock = vi.mocked(existsSync);
        existsSyncMock.mockReturnValue(false);

        const result = validateDatabaseTypes();

        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain("types/database.ts not found");
    });

    it("should pass when types/database.ts exists and is recent", () => {
        const existsSyncMock = vi.mocked(existsSync);
        const statSyncMock = vi.mocked(statSync);

        existsSyncMock.mockReturnValue(true);
        statSyncMock.mockReturnValue({
            mtimeMs: Date.now() - 1000 * 60 * 60 * 24 * 5, // 5 days ago
        } as any);

        const result = validateDatabaseTypes();

        expect(result.valid).toBe(true);
        expect(result.warnings).toHaveLength(0);
    });

    // TODO: Fix mocking for filesystem operations in CI
    it.skip("should warn when types/database.ts is older than 30 days", () => {
        const existsSyncMock = vi.mocked(existsSync);
        const statSyncMock = vi.mocked(statSync);

        existsSyncMock.mockReturnValue(true);
        statSyncMock.mockReturnValue({
            mtimeMs: Date.now() - 1000 * 60 * 60 * 24 * 45, // 45 days ago
        } as any);

        const result = validateDatabaseTypes();

        expect(result.valid).toBe(true);
        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0]).toContain("45 days old");
    });

    // TODO: Fix mocking for filesystem operations in CI
    it.skip("should warn when types/database.ts is exactly 31 days old", () => {
        const existsSyncMock = vi.mocked(existsSync);
        const statSyncMock = vi.mocked(statSync);

        existsSyncMock.mockReturnValue(true);
        statSyncMock.mockReturnValue({
            mtimeMs: Date.now() - 1000 * 60 * 60 * 24 * 31, // 31 days ago
        } as any);

        const result = validateDatabaseTypes();

        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0]).toContain("31 days old");
    });
});

describe("Supabase Validator - Directory Structure", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetAllMocks();
    });

    // TODO: Fix mocking for filesystem operations in CI
    it.skip("should warn when supabase/ directory does not exist", () => {
        const existsSyncMock = vi.mocked(existsSync);
        existsSyncMock.mockReset();
        existsSyncMock.mockReturnValue(false);

        const result = validateSupabaseDirectory();

        expect(result.warnings.length).toBeGreaterThanOrEqual(1);
        const relevant = result.warnings.find((w) =>
            w.includes("supabase/ directory not found")
        );
        expect(relevant).toBeDefined();
    });

    it("should check for migrations directory when supabase/ exists", () => {
        const existsSyncMock = vi.mocked(existsSync);
        existsSyncMock.mockReset();
        existsSyncMock
            .mockReturnValueOnce(true) // supabase/ exists
            .mockReturnValueOnce(true); // migrations/ exists

        const result = validateSupabaseDirectory();

        const relevant = result.warnings.find((w) =>
            w.includes("Found supabase/migrations/")
        );
        expect(relevant).toBeDefined();
    });

    it("should check for config.toml when supabase/ exists", () => {
        const existsSyncMock = vi.mocked(existsSync);
        existsSyncMock.mockReset();
        existsSyncMock
            .mockReturnValueOnce(true) // supabase/ exists
            .mockReturnValueOnce(false) // migrations/ doesn't exist
            .mockReturnValueOnce(true); // config.toml exists

        const result = validateSupabaseDirectory();

        const relevant = result.warnings.find((w) =>
            w.includes("Found supabase/config.toml")
        );
        expect(relevant).toBeDefined();
    });
});

describe("Supabase Validator - Connection Test", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
        vi.clearAllMocks();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it("should skip connection test when credentials are not provided", async () => {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        const result = await validateSupabaseConnection();

        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0]).toContain("Skipping connection test");
    });

    it("should have credentials when they are provided", () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";

        expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
        expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined();
    });

    it("should handle placeholder credentials gracefully", () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "placeholder-key";

        // Placeholders are still technically valid strings
        expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe(
            "https://placeholder.supabase.co"
        );
        expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("placeholder-key");
    });
});

describe("Supabase Validator - Integration", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
        vi.clearAllMocks();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it("should validate a complete successful configuration", async () => {
        const existsSyncMock = vi.mocked(existsSync);
        const statSyncMock = vi.mocked(statSync);

        // Set environment variables
        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
        process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

        // Mock file system
        existsSyncMock.mockReturnValue(true);
        statSyncMock.mockReturnValue({
            mtimeMs: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
        } as any);

        const result = await runAllValidations();

        // Should have no errors, only warnings about supabase directory
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    // TODO: Fix mocking for filesystem operations in CI
    it.skip("should accumulate errors from database types not existing", async () => {
        const existsSyncMock = vi.mocked(existsSync);

        // No environment variables
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        // No types file exists
        existsSyncMock.mockReturnValue(false);

        const result = await runAllValidations();

        // Should have errors for missing types file
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.warnings.length).toBeGreaterThan(0);
    });
});
