/**
 * Supabase Mock Factory
 *
 * Provides a comprehensive, chainable mock for Supabase client that properly
 * handles the common query patterns used throughout the codebase.
 *
 * Usage:
 *   const mock = createSupabaseMock({
 *     user: { id: 'user-123', email: 'test@example.com' },
 *     tables: {
 *       users: { data: [{ id: 'user-123' }], error: null },
 *     }
 *   });
 */

import { vi } from "vitest";

export interface MockUser {
    id: string;
    email?: string;
    created_at?: string;
    updated_at?: string;
}

export interface TableMockConfig {
    data?: unknown;
    error?: { message: string } | null;
}

export interface SupabaseMockConfig {
    user?: MockUser | null;
    authError?: { message: string } | null;
    tables?: Record<string, TableMockConfig>;
}

/**
 * Creates a chainable query builder mock that supports all common Supabase patterns:
 * - .select().eq().single()
 * - .select().eq().eq().single()
 * - .insert().select().single()
 * - .update().eq().select().single()
 * - .delete().eq()
 * - .select().in()
 * - .select().order().limit()
 */
function createQueryBuilder(config: TableMockConfig = {}) {
    const defaultResponse = { data: config.data ?? null, error: config.error ?? null };

    const builder: Record<string, unknown> = {};

    // Terminal methods - return the mock response
    const terminalMethods = ["single", "maybeSingle"];
    terminalMethods.forEach((method) => {
        builder[method] = vi.fn().mockResolvedValue(defaultResponse);
    });

    // Chainable methods - return the builder
    const chainableMethods = [
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
        "overlaps",
        "textSearch",
        "match",
        "not",
        "or",
        "filter",
        "order",
        "limit",
        "offset",
        "returning",
    ];

    chainableMethods.forEach((method) => {
        builder[method] = vi.fn().mockReturnValue(builder);
    });

    // Make chainable methods also resolve to the default response when awaited
    // This handles cases like: await supabase.from('table').select().eq('id', '123')
    chainableMethods.forEach((method) => {
        const originalFn = builder[method] as ReturnType<typeof vi.fn>;
        builder[method] = vi.fn().mockImplementation((...args) => {
            const result = {
                ...builder,
                then: (resolve: (value: unknown) => void) => resolve(defaultResponse),
            };
            return result;
        });
    });

    return builder;
}

/**
 * Creates a mock Supabase client with configurable table responses and auth state
 */
export function createSupabaseMock(config: SupabaseMockConfig = {}) {
    const {
        user = { id: "test-user-id", email: "test@example.com" },
        authError = null,
        tables = {},
    } = config;

    const mockClient = {
        auth: {
            getUser: vi.fn().mockResolvedValue({
                data: { user },
                error: authError,
            }),
            getSession: vi.fn().mockResolvedValue({
                data: { session: user ? { user } : null },
                error: authError,
            }),
            signOut: vi.fn().mockResolvedValue({ error: null }),
            signInWithPassword: vi.fn().mockResolvedValue({
                data: { user, session: { user } },
                error: authError,
            }),
        },
        from: vi.fn((tableName: string) => {
            const tableConfig = tables[tableName] || { data: null, error: null };
            return createQueryBuilder(tableConfig);
        }),
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
        storage: {
            from: vi.fn().mockReturnValue({
                upload: vi
                    .fn()
                    .mockResolvedValue({ data: { path: "test-path" }, error: null }),
                download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
                getPublicUrl: vi
                    .fn()
                    .mockReturnValue({
                        data: { publicUrl: "https://example.com/test" },
                    }),
                remove: vi.fn().mockResolvedValue({ data: null, error: null }),
                list: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
        },
    };

    return mockClient;
}

/**
 * Creates a mock for the createClient function from @/lib/supabase/server
 */
export function createSupabaseServerMock(config: SupabaseMockConfig = {}) {
    const mockClient = createSupabaseMock(config);
    return vi.fn().mockResolvedValue(mockClient);
}

/**
 * Pre-configured mock for authenticated user scenarios
 */
export function createAuthenticatedMock(
    userId = "test-user-id",
    email = "test@example.com"
) {
    return createSupabaseMock({
        user: { id: userId, email },
    });
}

/**
 * Pre-configured mock for unauthenticated scenarios
 */
export function createUnauthenticatedMock() {
    return createSupabaseMock({
        user: null,
        authError: { message: "Not authenticated" },
    });
}

/**
 * Mock factory that allows dynamic table configuration per test
 */
export function createDynamicSupabaseMock() {
    const tableConfigs: Record<string, TableMockConfig> = {};
    let userConfig: MockUser | null = { id: "test-user-id", email: "test@example.com" };
    let authErrorConfig: { message: string } | null = null;

    const mock = {
        setUser: (user: MockUser | null) => {
            userConfig = user;
        },
        setAuthError: (error: { message: string } | null) => {
            authErrorConfig = error;
        },
        setTableResponse: (tableName: string, config: TableMockConfig) => {
            tableConfigs[tableName] = config;
        },
        getClient: () =>
            createSupabaseMock({
                user: userConfig,
                authError: authErrorConfig,
                tables: tableConfigs,
            }),
        reset: () => {
            Object.keys(tableConfigs).forEach((key) => delete tableConfigs[key]);
            userConfig = { id: "test-user-id", email: "test@example.com" };
            authErrorConfig = null;
        },
    };

    return mock;
}
