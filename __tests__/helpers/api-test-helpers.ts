/**
 * API Test Helpers
 *
 * Utilities for testing Next.js API routes with proper request/response handling
 * and Supabase mocking.
 */

import { vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

// Re-export fixtures for convenience
export {
    createSupabaseMock,
    createAuthenticatedMock,
    createUnauthenticatedMock,
    createSupabaseServerMock,
} from "../fixtures/supabase-mock";

export {
    createTestUser,
    createTestFunnelProject,
    createTestOffer,
    createTestTranscript,
    createTestEnrollmentPage,
    createTestWatchPage,
    createTestRegistrationPage,
    createTestMarketingProfile,
    createTestContentBrief,
    createTestPostVariant,
    createTestMarketingAnalytics,
    createTestProspect,
    createTestSequence,
    createTestMessage,
    generateUUID,
    resetIdCounter,
} from "../fixtures/db-fixtures";

/**
 * Create a mock NextRequest for testing API routes
 */
export function createMockRequest({
    method = "GET",
    body = null,
    url = "http://localhost:3000/api/test",
    headers = {},
}: {
    method?: string;
    body?: unknown;
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

    if (body && method !== "GET") {
        requestInit.body = JSON.stringify(body);
    }

    return new Request(url, requestInit) as NextRequest;
}

/**
 * Create a mock request with query parameters
 */
export function createMockRequestWithParams(
    baseUrl: string,
    params: Record<string, string>,
    options: Omit<Parameters<typeof createMockRequest>[0], "url"> = {}
): NextRequest {
    const searchParams = new URLSearchParams(params);
    const url = `${baseUrl}?${searchParams.toString()}`;
    return createMockRequest({ ...options, url });
}

/**
 * Create a mock POST request with body
 */
export function createMockPostRequest(
    url: string,
    body: unknown,
    headers: Record<string, string> = {}
): NextRequest {
    return createMockRequest({
        method: "POST",
        url,
        body,
        headers,
    });
}

/**
 * Create a mock PUT request with body
 */
export function createMockPutRequest(
    url: string,
    body: unknown,
    headers: Record<string, string> = {}
): NextRequest {
    return createMockRequest({
        method: "PUT",
        url,
        body,
        headers,
    });
}

/**
 * Create a mock DELETE request
 */
export function createMockDeleteRequest(
    url: string,
    headers: Record<string, string> = {}
): NextRequest {
    return createMockRequest({
        method: "DELETE",
        url,
        headers,
    });
}

/**
 * Create a mock PATCH request with body
 */
export function createMockPatchRequest(
    url: string,
    body: unknown,
    headers: Record<string, string> = {}
): NextRequest {
    return createMockRequest({
        method: "PATCH",
        url,
        body,
        headers,
    });
}

/**
 * Parse JSON response from API route
 */
export async function parseJsonResponse<T = unknown>(response: Response): Promise<T> {
    const text = await response.text();
    try {
        return JSON.parse(text) as T;
    } catch {
        throw new Error(`Failed to parse JSON response: ${text}`);
    }
}

/**
 * Assert response status and return parsed body
 */
export async function assertResponse<T = unknown>(
    response: Response,
    expectedStatus: number
): Promise<T> {
    const data = await parseJsonResponse<T>(response);
    if (response.status !== expectedStatus) {
        throw new Error(
            `Expected status ${expectedStatus}, got ${response.status}. Response: ${JSON.stringify(data)}`
        );
    }
    return data;
}

/**
 * Assert successful response (200) and return data
 */
export async function assertSuccess<T = unknown>(response: Response): Promise<T> {
    return assertResponse<T>(response, 200);
}

/**
 * Assert created response (201) and return data
 */
export async function assertCreated<T = unknown>(response: Response): Promise<T> {
    return assertResponse<T>(response, 201);
}

/**
 * Assert bad request response (400)
 */
export async function assertBadRequest(
    response: Response,
    expectedError?: string
): Promise<{ error: string }> {
    const data = await assertResponse<{ error: string }>(response, 400);
    if (expectedError && data.error !== expectedError) {
        throw new Error(`Expected error "${expectedError}", got "${data.error}"`);
    }
    return data;
}

/**
 * Assert unauthorized response (401)
 */
export async function assertUnauthorized(
    response: Response
): Promise<{ error: string }> {
    return assertResponse<{ error: string }>(response, 401);
}

/**
 * Assert not found response (404)
 */
export async function assertNotFound(response: Response): Promise<{ error: string }> {
    return assertResponse<{ error: string }>(response, 404);
}

/**
 * Assert server error response (500)
 */
export async function assertServerError(
    response: Response
): Promise<{ error: string }> {
    return assertResponse<{ error: string }>(response, 500);
}

/**
 * Mock authenticated user state for a test
 */
export function mockAuthenticatedUser(
    userId = "test-user-id",
    email = "test@example.com"
) {
    return {
        data: {
            user: {
                id: userId,
                email,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
        },
        error: null,
    };
}

/**
 * Mock unauthenticated state for a test
 */
export function mockAuthError() {
    return {
        data: { user: null },
        error: { message: "Not authenticated" },
    };
}

/**
 * Mock service success response pattern
 */
export function mockServiceSuccess<T extends Record<string, unknown>>(data: T) {
    return {
        success: true,
        ...data,
    };
}

/**
 * Mock service error response pattern
 */
export function mockServiceError(error: string) {
    return {
        success: false,
        error,
    };
}

/**
 * Create a mock logger that captures all calls
 */
export function createMockLogger() {
    return {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        child: vi.fn().mockReturnThis(),
    };
}

/**
 * Silence console during test execution
 */
export function silenceConsole() {
    const originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn,
        info: console.info,
    };

    beforeEach(() => {
        console.log = vi.fn();
        console.error = vi.fn();
        console.warn = vi.fn();
        console.info = vi.fn();
    });

    afterEach(() => {
        console.log = originalConsole.log;
        console.error = originalConsole.error;
        console.warn = originalConsole.warn;
        console.info = originalConsole.info;
    });
}

/**
 * Wait for async operations to settle
 */
export function waitFor(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create context object for route handlers that need params
 */
export function createRouteContext<T extends Record<string, string>>(params: T) {
    return {
        params: Promise.resolve(params),
    };
}
