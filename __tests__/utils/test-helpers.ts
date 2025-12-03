import { vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a mock Supabase client for testing
 */
export function createMockSupabaseClient(overrides = {}) {
    const mockClient = {
        auth: {
            getUser: vi.fn().mockResolvedValue({
                data: {
                    user: {
                        id: "test-user-id",
                        email: "test@example.com",
                    },
                },
                error: null,
            }),
        },
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        ...overrides,
    };

    return mockClient as unknown as SupabaseClient;
}

/**
 * Creates a mock Next.js request
 */
export function createMockRequest(
    options: {
        method?: string;
        url?: string;
        body?: any;
        headers?: Record<string, string>;
    } = {}
) {
    const {
        method = "GET",
        url = "http://localhost:3000",
        body = null,
        headers = {},
    } = options;

    return {
        method,
        url,
        headers: new Headers(headers),
        json: vi.fn().mockResolvedValue(body),
        nextUrl: {
            searchParams: new URLSearchParams(new URL(url).search),
        },
    } as any;
}

/**
 * Creates a mock route context for dynamic routes
 */
export function createMockContext(params: Record<string, string> = {}) {
    return {
        params: Promise.resolve(params),
    };
}

/**
 * Mock logger to prevent console noise in tests
 */
export const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
};
