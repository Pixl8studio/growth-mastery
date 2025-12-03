/**
 * Tests for LinkedIn Integration
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock environment variables
vi.mock("@/lib/env", () => ({
    env: {
        LINKEDIN_CLIENT_ID: "test-linkedin-client-id",
        LINKEDIN_CLIENT_SECRET: "test-linkedin-client-secret",
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
    getLinkedInAuthUrl,
    exchangeCodeForToken,
    getUserInfo,
    createPost,
    refreshAccessToken,
} = await import("@/lib/integrations/linkedin");

describe("LinkedIn Integration", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getLinkedInAuthUrl", () => {
        it("generates OAuth authorization URL", () => {
            const url = getLinkedInAuthUrl("state-123", "https://example.com/callback");

            expect(url).toContain("https://www.linkedin.com/oauth/v2/authorization");
            expect(url).toContain("client_id=test-linkedin-client-id");
            expect(url).toContain("redirect_uri=https%3A%2F%2Fexample.com%2Fcallback");
            expect(url).toContain("state=state-123");
            expect(url).toContain("scope=w_member_social+r_basicprofile+r_liteprofile");
            expect(url).toContain("response_type=code");
        });
    });

    describe("exchangeCodeForToken", () => {
        it("exchanges authorization code for access token", async () => {
            const mockToken = {
                access_token: "linkedin-token-123",
                expires_in: 5184000,
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockToken,
            });

            const result = await exchangeCodeForToken(
                "auth-code-123",
                "https://example.com/callback"
            );

            expect(result.access_token).toBe("linkedin-token-123");
            expect(result.expires_in).toBe(5184000);
            expect(mockFetch).toHaveBeenCalledWith(
                "https://www.linkedin.com/oauth/v2/accessToken",
                expect.objectContaining({
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                })
            );
        });

        it("throws error when token exchange fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                text: async () => "Invalid authorization code",
            });

            await expect(
                exchangeCodeForToken("invalid-code", "https://example.com/callback")
            ).rejects.toThrow("LinkedIn token exchange failed");
        });
    });

    describe("getUserInfo", () => {
        it("fetches LinkedIn user profile", async () => {
            const mockUser = {
                id: "user-123",
                localizedFirstName: "John",
                localizedLastName: "Doe",
                profilePicture: {
                    displayImage: "https://example.com/pic.jpg",
                },
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockUser,
            });

            const result = await getUserInfo("access-token-123");

            expect(result.id).toBe("user-123");
            expect(result.firstName).toBe("John");
            expect(result.lastName).toBe("Doe");
            expect(result.profilePicture).toBe("https://example.com/pic.jpg");
            expect(mockFetch).toHaveBeenCalledWith(
                "https://api.linkedin.com/v2/me",
                expect.objectContaining({
                    headers: {
                        Authorization: "Bearer access-token-123",
                    },
                })
            );
        });

        it("handles missing profile picture", async () => {
            const mockUser = {
                id: "user-456",
                localizedFirstName: "Jane",
                localizedLastName: "Smith",
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockUser,
            });

            const result = await getUserInfo("access-token-123");

            expect(result.profilePicture).toBeUndefined();
        });

        it("throws error when fetching user info fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
            });

            await expect(getUserInfo("invalid-token")).rejects.toThrow(
                "Failed to fetch LinkedIn user info"
            );
        });
    });

    describe("createPost", () => {
        it("creates a text-only post", async () => {
            const mockResponse = {
                id: "post-123",
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await createPost(
                "access-token-123",
                "urn:li:person:user-123",
                {
                    text: "This is my LinkedIn post!",
                }
            );

            expect(result.id).toBe("post-123");
            expect(result.url).toContain("post-123");
            expect(mockFetch).toHaveBeenCalledWith(
                "https://api.linkedin.com/v2/ugcPosts",
                expect.objectContaining({
                    method: "POST",
                    headers: expect.objectContaining({
                        Authorization: "Bearer access-token-123",
                        "Content-Type": "application/json",
                        "X-Restli-Protocol-Version": "2.0.0",
                    }),
                })
            );
        });

        it("creates a post with media", async () => {
            const mockResponse = {
                id: "post-456",
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await createPost(
                "access-token-123",
                "urn:li:person:user-123",
                {
                    text: "Check out this image!",
                    mediaUrl: "https://example.com/image.jpg",
                }
            );

            expect(result.id).toBe("post-456");

            const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
            expect(
                callBody.specificContent["com.linkedin.ugc.ShareContent"]
                    .shareMediaCategory
            ).toBe("IMAGE");
        });

        it("throws error when post creation fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                text: async () => "Unauthorized",
            });

            await expect(
                createPost("invalid-token", "urn:li:person:user-123", { text: "Test" })
            ).rejects.toThrow("LinkedIn post creation failed");
        });
    });

    describe("refreshAccessToken", () => {
        it("refreshes access token using refresh token", async () => {
            const mockToken = {
                access_token: "new-linkedin-token-789",
                expires_in: 5184000,
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockToken,
            });

            const result = await refreshAccessToken("refresh-token-123");

            expect(result.access_token).toBe("new-linkedin-token-789");
            expect(mockFetch).toHaveBeenCalledWith(
                "https://www.linkedin.com/oauth/v2/accessToken",
                expect.objectContaining({
                    method: "POST",
                })
            );
        });

        it("throws error when token refresh fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
            });

            await expect(refreshAccessToken("invalid-refresh-token")).rejects.toThrow(
                "LinkedIn token refresh failed"
            );
        });
    });
});
