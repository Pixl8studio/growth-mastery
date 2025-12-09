import { vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a chainable mock for Supabase query builders
 * All methods return the mock itself for chaining, except terminal methods
 */
export function createChainableMock(defaultData: any = null, defaultError: any = null) {
    const mock: any = {
        // Terminal methods - return data
        single: vi.fn().mockResolvedValue({ data: defaultData, error: defaultError }),
        maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: defaultData, error: defaultError }),
        execute: vi.fn().mockResolvedValue({
            data: defaultData ? [defaultData] : [],
            error: defaultError,
        }),
        then: vi.fn().mockResolvedValue({
            data: defaultData ? [defaultData] : [],
            error: defaultError,
        }),
        // Configure default resolved value for non-terminal chain end
        _defaultResolve: {
            data: defaultData ? [defaultData] : [],
            error: defaultError,
        },
    };

    // Chainable methods - return the mock for chaining
    const chainableMethods = [
        "from",
        "select",
        "insert",
        "update",
        "delete",
        "upsert",
        "eq",
        "neq",
        "gt",
        "gte",
        "lt",
        "lte",
        "like",
        "ilike",
        "is",
        "in",
        "contains",
        "containedBy",
        "range",
        "order",
        "limit",
        "offset",
        "filter",
        "match",
        "not",
        "or",
        "and",
        "textSearch",
    ];

    chainableMethods.forEach((method) => {
        mock[method] = vi.fn().mockReturnValue(mock);
    });

    // Make mock thenable for await usage
    mock[Symbol.toStringTag] = "Promise";
    mock.then = (resolve: any) => Promise.resolve(mock._defaultResolve).then(resolve);

    return mock;
}

/**
 * Creates a mock Supabase client for testing
 * Supports proper method chaining like: supabase.from('table').select('*').eq('id', 1).single()
 */
export function createMockSupabaseClient(
    overrides: {
        data?: any;
        error?: any;
        user?: any;
    } = {}
) {
    const { data = null, error = null, user } = overrides;
    const queryMock = createChainableMock(data, error);

    const mockClient = {
        auth: {
            getUser: vi.fn().mockResolvedValue({
                data: {
                    user: user ?? {
                        id: "test-user-id",
                        email: "test@example.com",
                    },
                },
                error: null,
            }),
            getSession: vi.fn().mockResolvedValue({
                data: {
                    session: {
                        user: user ?? { id: "test-user-id", email: "test@example.com" },
                    },
                },
                error: null,
            }),
            signOut: vi.fn().mockResolvedValue({ error: null }),
        },
        from: vi.fn().mockReturnValue(queryMock),
        rpc: vi.fn().mockResolvedValue({ data, error }),
        storage: {
            from: vi.fn().mockReturnValue({
                upload: vi
                    .fn()
                    .mockResolvedValue({ data: { path: "test-path" }, error: null }),
                download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
                remove: vi.fn().mockResolvedValue({ data: null, error: null }),
                getPublicUrl: vi.fn().mockReturnValue({
                    data: { publicUrl: "https://example.com/file" },
                }),
            }),
        },
        // Expose query mock for test assertions
        _queryMock: queryMock,
    };

    return mockClient as unknown as SupabaseClient & { _queryMock: typeof queryMock };
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
