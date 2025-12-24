/**
 * Unit Tests: Supabase Middleware
 * Tests for lib/supabase/middleware.ts
 *
 * Note: This file tests Edge Runtime code that uses process.env directly
 * instead of the Zod-validated env module. See lib/supabase/middleware.ts
 * for details on Edge Runtime constraints.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

// Mock dependencies
vi.mock("@supabase/ssr", () => ({
    createServerClient: vi.fn(),
}));

describe("Supabase Middleware", () => {
    let mockRequest: NextRequest;
    let mockSupabase: any;
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        vi.clearAllMocks();

        // Store original env values
        originalEnv = { ...process.env };

        // Set up process.env for tests (Edge Runtime uses process.env directly)
        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

        // Mock NextRequest
        mockRequest = {
            cookies: {
                getAll: vi.fn().mockReturnValue([]),
                set: vi.fn(),
            },
        } as any;

        // Mock Supabase client
        mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
            },
        };

        (createServerClient as any).mockReturnValue(mockSupabase);
    });

    afterEach(() => {
        // Restore original env values
        process.env = originalEnv;
    });

    describe("updateSession", () => {
        it("should create a Supabase client and refresh the session", async () => {
            const response = await updateSession(mockRequest);

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

            expect(mockSupabase.auth.getUser).toHaveBeenCalled();
            expect(response).toBeInstanceOf(NextResponse);
        });

        it("should return early when environment variables are missing", async () => {
            // Clear the environment variables
            delete process.env.NEXT_PUBLIC_SUPABASE_URL;
            delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            const response = await updateSession(mockRequest);

            expect(response).toBeInstanceOf(NextResponse);
            expect(createServerClient).not.toHaveBeenCalled();
        });

        it("should return early when only SUPABASE_URL is missing", async () => {
            delete process.env.NEXT_PUBLIC_SUPABASE_URL;

            const response = await updateSession(mockRequest);

            expect(response).toBeInstanceOf(NextResponse);
            expect(createServerClient).not.toHaveBeenCalled();
        });

        it("should return early when only SUPABASE_ANON_KEY is missing", async () => {
            delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            const response = await updateSession(mockRequest);

            expect(response).toBeInstanceOf(NextResponse);
            expect(createServerClient).not.toHaveBeenCalled();
        });

        it("should configure cookie handlers correctly", async () => {
            await updateSession(mockRequest);

            const cookieConfig = (createServerClient as any).mock.calls[0][2];

            // Test getAll function
            const cookies = [{ name: "session", value: "token" }];
            mockRequest.cookies.getAll = vi.fn().mockReturnValue(cookies);
            expect(cookieConfig.cookies.getAll()).toEqual(cookies);
        });

        it("should handle cookie setting through setAll", async () => {
            await updateSession(mockRequest);

            const cookieConfig = (createServerClient as any).mock.calls[0][2];

            // Test setAll function
            const cookiesToSet = [
                {
                    name: "sb-session",
                    value: "token-value",
                    options: { httpOnly: true },
                },
            ];

            cookieConfig.cookies.setAll(cookiesToSet);

            expect(mockRequest.cookies.set).toHaveBeenCalledWith(
                "sb-session",
                "token-value"
            );
        });

        it("should refresh user session", async () => {
            const mockUser = { id: "user-123", email: "test@example.com" };
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: mockUser },
            });

            await updateSession(mockRequest);

            expect(mockSupabase.auth.getUser).toHaveBeenCalled();
        });
    });
});
