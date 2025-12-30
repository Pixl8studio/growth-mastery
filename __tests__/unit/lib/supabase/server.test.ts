/**
 * Unit Tests: Supabase Server Client
 * Tests for lib/supabase/server.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { resetEnvCache } from "@/lib/env";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

vi.mock("@supabase/ssr", () => ({
    createServerClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
    cookies: vi.fn(),
}));

const originalEnv = { ...process.env };

describe("Supabase Server Client", () => {
    let mockCookieStore: {
        getAll: ReturnType<typeof vi.fn>;
        set: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        vi.clearAllMocks();
        resetEnvCache();

        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

        mockCookieStore = {
            getAll: vi.fn().mockReturnValue([]),
            set: vi.fn(),
        };

        (cookies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCookieStore);
    });

    afterEach(() => {
        process.env = { ...originalEnv };
        resetEnvCache();
    });

    describe("createClient", () => {
        it("creates a server client and returns it", async () => {
            const mockClient = { from: vi.fn(), auth: vi.fn() };
            (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue(
                mockClient
            );

            const client = await createClient();

            expect(createServerClient).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                expect.objectContaining({
                    cookies: expect.objectContaining({
                        getAll: expect.any(Function),
                        setAll: expect.any(Function),
                    }),
                })
            );
            expect(client).toBe(mockClient);
        });

        it("handles cookie set errors gracefully in Server Components", async () => {
            const mockClient = { from: vi.fn() };
            (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue(
                mockClient
            );

            mockCookieStore.set.mockImplementation(() => {
                throw new Error("Cannot set cookies in Server Component");
            });

            await createClient();

            const cookieConfig = (createServerClient as ReturnType<typeof vi.fn>).mock
                .calls[0][2];

            // Should not throw when setAll fails (graceful handling)
            expect(() => {
                cookieConfig.cookies.setAll([
                    { name: "test", value: "value", options: {} },
                ]);
            }).not.toThrow();
        });
    });
});
