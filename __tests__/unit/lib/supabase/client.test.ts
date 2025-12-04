/**
 * Unit Tests: Supabase Client (Browser)
 * Tests for lib/supabase/client.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { createBrowserClient } from "@supabase/ssr";

// Mock the @supabase/ssr module
vi.mock("@supabase/ssr", () => ({
    createBrowserClient: vi.fn(),
}));

describe("Supabase Client (Browser)", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset process.env before each test
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        // Restore original environment
        process.env = originalEnv;
    });

    describe("createClient", () => {
        it("should create a Supabase browser client with valid environment variables", () => {
            // Set up environment variables
            process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

            const mockClient = { from: vi.fn(), auth: vi.fn() };
            (createBrowserClient as any).mockReturnValue(mockClient);

            const client = createClient();

            expect(createBrowserClient).toHaveBeenCalledWith(
                "https://test.supabase.co",
                "test-anon-key"
            );
            expect(client).toBe(mockClient);
        });

        it("should throw error when NEXT_PUBLIC_SUPABASE_URL is missing", () => {
            // Remove the URL from environment
            delete process.env.NEXT_PUBLIC_SUPABASE_URL;
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

            expect(() => createClient()).toThrow(
                "Missing Supabase environment variables"
            );
        });

        it("should throw error when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing", () => {
            // Remove the anon key from environment
            process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
            delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            expect(() => createClient()).toThrow(
                "Missing Supabase environment variables"
            );
        });

        it("should throw error when both environment variables are missing", () => {
            // Remove both from environment
            delete process.env.NEXT_PUBLIC_SUPABASE_URL;
            delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            expect(() => createClient()).toThrow(
                "Missing Supabase environment variables"
            );
        });

        it("should create client with correct configuration", () => {
            process.env.NEXT_PUBLIC_SUPABASE_URL = "https://prod.supabase.co";
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "prod-anon-key";

            const mockClient = { from: vi.fn(), auth: vi.fn() };
            (createBrowserClient as any).mockReturnValue(mockClient);

            createClient();

            expect(createBrowserClient).toHaveBeenCalledTimes(1);
            expect(createBrowserClient).toHaveBeenCalledWith(
                "https://prod.supabase.co",
                "prod-anon-key"
            );
        });
    });
});
