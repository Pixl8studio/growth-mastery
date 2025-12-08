/**
 * Integration tests for funnel calendar integration routes
 * Tests OAuth connect and callback flows
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        child: vi.fn(() => ({
            info: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
        })),
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock auth
const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/auth", () => ({
    getCurrentUser: () => mockGetCurrentUser(),
}));

// Mock calendar integration
const mockGetCalendarAuthUrl = vi.fn();
const mockExchangeCodeForToken = vi.fn();
const mockListCalendars = vi.fn();
vi.mock("@/lib/integrations/calendar", () => ({
    getCalendarAuthUrl: (...args: any[]) => mockGetCalendarAuthUrl(...args),
    exchangeCodeForToken: (...args: any[]) => mockExchangeCodeForToken(...args),
    listCalendars: (...args: any[]) => mockListCalendars(...args),
}));

// Mock gmail getUserInfo
const mockGetUserInfo = vi.fn();
vi.mock("@/lib/integrations/gmail", () => ({
    getUserInfo: (...args: any[]) => mockGetUserInfo(...args),
}));

// Mock crypto
vi.mock("@/lib/integrations/crypto", () => ({
    encryptToken: vi.fn((token: string) => `encrypted_${token}`),
}));

// Mock Supabase
const mockUpsert = vi.fn();
const mockFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
        from: mockFrom,
    })),
}));

// Import after mocks
const { GET: connectGET } = await import(
    "@/app/api/funnel/[projectId]/integrations/calendar/connect/route"
);
const { GET: callbackGET } = await import(
    "@/app/api/funnel/[projectId]/integrations/calendar/callback/route"
);

describe("GET /api/funnel/[projectId]/integrations/calendar/connect", () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const projectId = "project-123";

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    });

    it("should return calendar auth URL for authenticated user", async () => {
        mockGetCurrentUser.mockResolvedValue(mockUser);
        mockGetCalendarAuthUrl.mockReturnValue(
            "https://accounts.google.com/o/oauth2/auth?client_id=..."
        );

        const request = new NextRequest(
            `http://localhost:3000/api/funnel/${projectId}/integrations/calendar/connect`
        );

        const response = await connectGET(request, {
            params: Promise.resolve({ projectId }),
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.url).toContain("accounts.google.com");
        expect(mockGetCalendarAuthUrl).toHaveBeenCalledWith(
            projectId,
            expect.stringContaining(
                `/api/funnel/${projectId}/integrations/calendar/callback`
            )
        );
    });

    it("should return 401 for unauthenticated user", async () => {
        mockGetCurrentUser.mockResolvedValue(null);

        const request = new NextRequest(
            `http://localhost:3000/api/funnel/${projectId}/integrations/calendar/connect`
        );

        const response = await connectGET(request, {
            params: Promise.resolve({ projectId }),
        });
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
    });

    it("should use custom redirect_uri if provided", async () => {
        mockGetCurrentUser.mockResolvedValue(mockUser);
        mockGetCalendarAuthUrl.mockReturnValue("https://accounts.google.com/...");

        const customRedirect = "http://custom.example.com/callback";
        const request = new NextRequest(
            `http://localhost:3000/api/funnel/${projectId}/integrations/calendar/connect?redirect_uri=${encodeURIComponent(customRedirect)}`
        );

        await connectGET(request, {
            params: Promise.resolve({ projectId }),
        });

        expect(mockGetCalendarAuthUrl).toHaveBeenCalledWith(projectId, customRedirect);
    });

    it("should return 500 on error", async () => {
        mockGetCurrentUser.mockResolvedValue(mockUser);
        mockGetCalendarAuthUrl.mockImplementation(() => {
            throw new Error("OAuth configuration error");
        });

        const request = new NextRequest(
            `http://localhost:3000/api/funnel/${projectId}/integrations/calendar/connect`
        );

        const response = await connectGET(request, {
            params: Promise.resolve({ projectId }),
        });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to initiate calendar connection");
    });
});

describe("GET /api/funnel/[projectId]/integrations/calendar/callback", () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const projectId = "project-123";

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
        mockFrom.mockReturnValue({ upsert: mockUpsert });
        mockUpsert.mockResolvedValue({ data: {}, error: null });
    });

    it("should handle successful OAuth callback", async () => {
        mockGetCurrentUser.mockResolvedValue(mockUser);
        mockExchangeCodeForToken.mockResolvedValue({
            access_token: "access_123",
            refresh_token: "refresh_123",
            expires_in: 3600,
        });
        mockListCalendars.mockResolvedValue([
            {
                id: "primary",
                summary: "Primary Calendar",
                primary: true,
                timezone: "UTC",
            },
        ]);
        mockGetUserInfo.mockResolvedValue({ email: "user@gmail.com" });

        const request = new NextRequest(
            `http://localhost:3000/api/funnel/${projectId}/integrations/calendar/callback?code=auth_code&state=${projectId}`
        );

        const response = await callbackGET(request, {
            params: Promise.resolve({ projectId }),
        });

        expect(response.status).toBe(307); // Redirect
        expect(response.headers.get("Location")).toContain(
            `/funnel-builder/${projectId}?tab=settings`
        );
        expect(mockFrom).toHaveBeenCalledWith("funnel_calendar_connections");
        expect(mockUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                funnel_project_id: projectId,
                user_id: mockUser.id,
                provider: "google",
                account_email: "user@gmail.com",
                calendar_id: "primary",
                is_active: true,
            })
        );
    });

    it("should redirect to login if user not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);

        const request = new NextRequest(
            `http://localhost:3000/api/funnel/${projectId}/integrations/calendar/callback?code=auth_code&state=${projectId}`
        );

        const response = await callbackGET(request, {
            params: Promise.resolve({ projectId }),
        });

        expect(response.status).toBe(307);
        expect(response.headers.get("Location")).toContain("/login");
    });

    it("should redirect with error for missing code", async () => {
        mockGetCurrentUser.mockResolvedValue(mockUser);

        const request = new NextRequest(
            `http://localhost:3000/api/funnel/${projectId}/integrations/calendar/callback?state=${projectId}`
        );

        const response = await callbackGET(request, {
            params: Promise.resolve({ projectId }),
        });

        expect(response.status).toBe(307);
        expect(response.headers.get("Location")).toContain(
            "error=calendar_connection_failed"
        );
    });

    it("should redirect with error for invalid state", async () => {
        mockGetCurrentUser.mockResolvedValue(mockUser);

        const request = new NextRequest(
            `http://localhost:3000/api/funnel/${projectId}/integrations/calendar/callback?code=auth_code&state=wrong-project`
        );

        const response = await callbackGET(request, {
            params: Promise.resolve({ projectId }),
        });

        expect(response.status).toBe(307);
        expect(response.headers.get("Location")).toContain(
            "error=calendar_connection_failed"
        );
    });

    it("should use first calendar if no primary", async () => {
        mockGetCurrentUser.mockResolvedValue(mockUser);
        mockExchangeCodeForToken.mockResolvedValue({
            access_token: "access_123",
            refresh_token: "refresh_123",
            expires_in: 3600,
        });
        mockListCalendars.mockResolvedValue([
            { id: "work", summary: "Work Calendar", primary: false, timezone: "UTC" },
        ]);
        mockGetUserInfo.mockResolvedValue({ email: "user@gmail.com" });

        const request = new NextRequest(
            `http://localhost:3000/api/funnel/${projectId}/integrations/calendar/callback?code=auth_code&state=${projectId}`
        );

        const response = await callbackGET(request, {
            params: Promise.resolve({ projectId }),
        });

        expect(response.status).toBe(307);
        expect(mockUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                calendar_id: "work",
                calendar_name: "Work Calendar",
            })
        );
    });

    it("should handle no calendars found", async () => {
        mockGetCurrentUser.mockResolvedValue(mockUser);
        mockExchangeCodeForToken.mockResolvedValue({
            access_token: "access_123",
        });
        mockListCalendars.mockResolvedValue([]);

        const request = new NextRequest(
            `http://localhost:3000/api/funnel/${projectId}/integrations/calendar/callback?code=auth_code&state=${projectId}`
        );

        const response = await callbackGET(request, {
            params: Promise.resolve({ projectId }),
        });

        expect(response.status).toBe(307);
        expect(response.headers.get("Location")).toContain(
            "error=calendar_connection_failed"
        );
    });
});
