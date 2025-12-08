/**
 * Unit Tests: Supabase Server Client
 * Tests for lib/supabase/server.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Mock dependencies
vi.mock("@supabase/ssr", () => ({
    createServerClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
    cookies: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
    env: {
        NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    },
}));

describe("Supabase Server Client", () => {
    let mockCookieStore: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock cookie store
        mockCookieStore = {
            getAll: vi.fn().mockReturnValue([]),
            set: vi.fn(),
        };

        (cookies as any).mockResolvedValue(mockCookieStore);
    });

    describe("createClient", () => {
        it("should create a Supabase server client with valid environment variables", async () => {
            const mockClient = { from: vi.fn(), auth: vi.fn() };
            (createServerClient as any).mockReturnValue(mockClient);

            const client = await createClient();

            expect(createServerClient).toHaveBeenCalledWith(
                "https://test.supabase.co",
                "test-anon-key",
                expect.objectContaining({
                    cookies: expect.objectContaining({
                        getAll: expect.any(Function),
                        setAll: expect.any(Function),
                    }),
                })
            );
            expect(client).toBe(mockClient);
        });

        it("should throw error when environment variables are missing", async () => {
            // Reset modules to allow re-mocking
            vi.resetModules();

            vi.doMock("@/lib/env", () => ({
                env: {
                    NEXT_PUBLIC_SUPABASE_URL: undefined,
                    NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
                },
            }));

            vi.doMock("@supabase/ssr", () => ({
                createServerClient: vi.fn(),
            }));

            vi.doMock("next/headers", () => ({
                cookies: vi.fn().mockResolvedValue({
                    getAll: vi.fn().mockReturnValue([]),
                    set: vi.fn(),
                }),
            }));

            const { createClient: getClient } = await import("@/lib/supabase/server");

            await expect(getClient()).rejects.toThrow(
                "Missing Supabase environment variables"
            );
        });

        it("should call cookies() to get cookie store", async () => {
            const mockClient = { from: vi.fn() };
            (createServerClient as any).mockReturnValue(mockClient);

            await createClient();

            expect(cookies).toHaveBeenCalled();
        });

        it("should configure cookie handlers correctly", async () => {
            const mockClient = { from: vi.fn() };
            (createServerClient as any).mockReturnValue(mockClient);

            await createClient();

            const cookieConfig = (createServerClient as any).mock.calls[0][2];

            // Test getAll function
            const cookies = [{ name: "test", value: "value" }];
            mockCookieStore.getAll.mockReturnValue(cookies);
            expect(cookieConfig.cookies.getAll()).toEqual(cookies);

            // Test setAll function
            const cookiesToSet = [
                {
                    name: "session",
                    value: "token",
                    options: { httpOnly: true },
                },
            ];
            cookieConfig.cookies.setAll(cookiesToSet);
            expect(mockCookieStore.set).toHaveBeenCalledWith("session", "token", {
                httpOnly: true,
            });
        });

        it("should handle setAll errors gracefully", async () => {
            const mockClient = { from: vi.fn() };
            (createServerClient as any).mockReturnValue(mockClient);

            // Make set throw an error
            mockCookieStore.set.mockImplementation(() => {
                throw new Error("Cannot set cookies in Server Component");
            });

            await createClient();

            const cookieConfig = (createServerClient as any).mock.calls[0][2];

            // Should not throw when setAll fails
            expect(() => {
                cookieConfig.cookies.setAll([
                    { name: "test", value: "value", options: {} },
                ]);
            }).not.toThrow();
        });
    });
});
