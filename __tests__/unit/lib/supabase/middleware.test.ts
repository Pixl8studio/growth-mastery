/**
 * Unit Tests: Supabase Middleware
 * Tests for lib/supabase/middleware.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

// Mock dependencies
vi.mock("@supabase/ssr", () => ({
    createServerClient: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
    env: {
        NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    },
}));

describe("Supabase Middleware", () => {
    let mockRequest: NextRequest;
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();

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
            vi.doMock("@/lib/env", () => ({
                env: {
                    NEXT_PUBLIC_SUPABASE_URL: undefined,
                    NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
                },
            }));

            const { updateSession: update } = await import(
                "@/lib/supabase/middleware"
            );

            const response = await update(mockRequest);

            expect(response).toBeInstanceOf(NextResponse);
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
