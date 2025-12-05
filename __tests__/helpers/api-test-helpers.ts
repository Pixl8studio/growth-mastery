import { vi } from "vitest";
import type { NextRequest } from "next/server";

/**
 * Mock Supabase client for testing
 */
export function createMockSupabaseClient(overrides: any = {}) {
    const mockClient = {
        auth: {
            getUser: vi.fn().mockResolvedValue({
                data: { user: { id: "test-user-id", email: "test@example.com" } },
                error: null,
            }),
            ...overrides.auth,
        },
        from: vi.fn((table: string) => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            ...overrides.from?.[table],
        })),
        ...overrides,
    };

    return mockClient;
}

/**
 * Create a mock NextRequest for testing
 */
export function createMockRequest({
    method = "GET",
    body = null,
    url = "http://localhost:3000/api/test",
    headers = {},
}: {
    method?: string;
    body?: any;
    url?: string;
    headers?: Record<string, string>;
} = {}): NextRequest {
    const requestInit: RequestInit = {
        method,
        headers: {
            "Content-Type": "application/json",
            ...headers,
        },
    };

    if (body) {
        requestInit.body = JSON.stringify(body);
    }

    return new Request(url, requestInit) as NextRequest;
}

/**
 * Mock authenticated user
 */
export function mockAuthenticatedUser(userId = "test-user-id") {
    return {
        data: {
            user: {
                id: userId,
                email: "test@example.com",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
        },
        error: null,
    };
}

/**
 * Mock authentication error
 */
export function mockAuthError() {
    return {
        data: { user: null },
        error: { message: "Invalid token" },
    };
}

/**
 * Mock service success response
 */
export function mockServiceSuccess<T>(data: T) {
    return {
        success: true,
        ...data,
    };
}

/**
 * Mock service error response
 */
export function mockServiceError(error: string) {
    return {
        success: false,
        error,
    };
}

/**
 * Helper to parse JSON response
 */
export async function parseJsonResponse(response: Response) {
    return JSON.parse(await response.text());
}
