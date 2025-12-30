/**
 * Unit Tests: Supabase Middleware
 * Tests for lib/supabase/middleware.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@supabase/ssr", () => ({
    createServerClient: vi.fn(),
}));

describe("Supabase Middleware", () => {
    let mockRequest: NextRequest;
    let mockSupabase: {
        auth: {
            getUser: ReturnType<typeof vi.fn>;
        };
    };
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        vi.clearAllMocks();

        originalEnv = { ...process.env };

        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

        mockRequest = {
            cookies: {
                getAll: vi.fn().mockReturnValue([]),
                set: vi.fn(),
            },
        } as unknown as NextRequest;

        mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
            },
        };

        (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe("updateSession", () => {
        it("refreshes the user session and returns a response", async () => {
            const response = await updateSession(mockRequest);

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

            expect(mockSupabase.auth.getUser).toHaveBeenCalled();
            expect(response).toBeInstanceOf(NextResponse);
        });

        it("returns user data when user is authenticated", async () => {
            const mockUser = { id: "user-123", email: "test@example.com" };
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: mockUser },
            });

            await updateSession(mockRequest);

            expect(mockSupabase.auth.getUser).toHaveBeenCalled();
        });
    });
});
