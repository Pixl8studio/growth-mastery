/**
 * Tests for Google Calendar Integration
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock environment variables
vi.mock("@/lib/env", () => ({
    env: {
        GOOGLE_CLIENT_ID: "test-google-client-id",
        GOOGLE_CLIENT_SECRET: "test-google-client-secret",
    },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocks are defined
const {
    getCalendarAuthUrl,
    exchangeCodeForToken,
    refreshAccessToken,
    listCalendars,
    verifyToken,
    createEvent,
} = await import("@/lib/integrations/calendar");

describe("Google Calendar Integration", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getCalendarAuthUrl", () => {
        it("generates Google OAuth URL with Calendar scopes", () => {
            const url = getCalendarAuthUrl(
                "project-123",
                "https://example.com/callback"
            );

            expect(url).toContain("https://accounts.google.com/o/oauth2/v2/auth");
            expect(url).toContain("client_id=test-google-client-id");
            expect(url).toContain("redirect_uri=https%3A%2F%2Fexample.com%2Fcallback");
            expect(url).toContain("state=project-123");
            expect(url).toContain("calendar");
            expect(url).toContain("calendar.events");
            expect(url).toContain("access_type=offline");
            expect(url).toContain("prompt=consent");
        });
    });

    describe("exchangeCodeForToken", () => {
        it("exchanges authorization code for access token", async () => {
            const mockToken = {
                access_token: "calendar-token-123",
                refresh_token: "refresh-token-123",
                expires_in: 3600,
                token_type: "Bearer",
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockToken,
            });

            const result = await exchangeCodeForToken(
                "auth-code-123",
                "https://example.com/callback"
            );

            expect(result.access_token).toBe("calendar-token-123");
            expect(result.refresh_token).toBe("refresh-token-123");
            expect(mockFetch).toHaveBeenCalledWith(
                "https://oauth2.googleapis.com/token",
                expect.objectContaining({
                    method: "POST",
                })
            );
        });

        it("throws error when token exchange fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error_description: "Invalid authorization code",
                }),
            });

            await expect(
                exchangeCodeForToken("invalid-code", "https://example.com/callback")
            ).rejects.toThrow("Calendar token exchange failed");
        });
    });

    describe("refreshAccessToken", () => {
        it("refreshes access token using refresh token", async () => {
            const mockToken = {
                access_token: "new-calendar-token-456",
                expires_in: 3600,
                token_type: "Bearer",
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockToken,
            });

            const result = await refreshAccessToken("refresh-token-123");

            expect(result.access_token).toBe("new-calendar-token-456");
            expect(mockFetch).toHaveBeenCalledWith(
                "https://oauth2.googleapis.com/token",
                expect.objectContaining({
                    method: "POST",
                })
            );
        });

        it("throws error when token refresh fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error_description: "Invalid refresh token",
                }),
            });

            await expect(refreshAccessToken("invalid-refresh-token")).rejects.toThrow(
                "Calendar token refresh failed"
            );
        });
    });

    describe("listCalendars", () => {
        it("fetches list of user calendars", async () => {
            const mockCalendars = [
                {
                    id: "primary",
                    summary: "Primary Calendar",
                    timeZone: "America/New_York",
                    accessRole: "owner",
                },
                {
                    id: "calendar-2",
                    summary: "Work Calendar",
                    timeZone: "America/New_York",
                    accessRole: "writer",
                },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ items: mockCalendars }),
            });

            const result = await listCalendars("access-token-123");

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe("primary");
            expect(result[1].id).toBe("calendar-2");
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining("/users/me/calendarList"),
                expect.objectContaining({
                    headers: {
                        Authorization: "Bearer access-token-123",
                    },
                })
            );
        });

        it("returns empty array when no calendars found", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ items: null }),
            });

            const result = await listCalendars("access-token-123");

            expect(result).toEqual([]);
        });

        it("throws error when listing calendars fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error: { message: "Unauthorized" },
                }),
            });

            await expect(listCalendars("invalid-token")).rejects.toThrow(
                "Failed to list calendars"
            );
        });
    });

    describe("verifyToken", () => {
        it("returns true for valid token", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ items: [] }),
            });

            const result = await verifyToken("valid-token");

            expect(result).toBe(true);
        });

        it("returns false for invalid token", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
            });

            const result = await verifyToken("invalid-token");

            expect(result).toBe(false);
        });

        it("returns false when fetch throws error", async () => {
            mockFetch.mockRejectedValueOnce(new Error("Network error"));

            const result = await verifyToken("some-token");

            expect(result).toBe(false);
        });
    });

    describe("createEvent", () => {
        it("creates calendar event successfully", async () => {
            const event = {
                summary: "Team Meeting",
                description: "Weekly team sync",
                start: {
                    dateTime: "2024-01-15T10:00:00",
                    timeZone: "America/New_York",
                },
                end: {
                    dateTime: "2024-01-15T11:00:00",
                    timeZone: "America/New_York",
                },
                attendees: [
                    { email: "attendee1@example.com" },
                    { email: "attendee2@example.com" },
                ],
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    id: "event-123",
                    ...event,
                }),
            });

            await createEvent("access-token-123", "primary", event);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining("/calendars/primary/events"),
                expect.objectContaining({
                    method: "POST",
                    headers: {
                        Authorization: "Bearer access-token-123",
                        "Content-Type": "application/json",
                    },
                })
            );
        });

        it("creates event without attendees", async () => {
            const event = {
                summary: "Personal Task",
                start: {
                    dateTime: "2024-01-15T14:00:00",
                    timeZone: "America/New_York",
                },
                end: {
                    dateTime: "2024-01-15T15:00:00",
                    timeZone: "America/New_York",
                },
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    id: "event-456",
                    ...event,
                }),
            });

            await createEvent("access-token-123", "primary", event);

            const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
            expect(callBody.attendees).toBeUndefined();
        });

        it("throws error when event creation fails", async () => {
            const event = {
                summary: "Test Event",
                start: {
                    dateTime: "2024-01-15T10:00:00",
                    timeZone: "America/New_York",
                },
                end: {
                    dateTime: "2024-01-15T11:00:00",
                    timeZone: "America/New_York",
                },
            };

            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error: { message: "Invalid calendar ID" },
                }),
            });

            await expect(
                createEvent("invalid-token", "invalid-calendar", event)
            ).rejects.toThrow("Failed to create event");
        });
    });
});
