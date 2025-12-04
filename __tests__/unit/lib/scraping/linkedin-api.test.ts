import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
    logger: { info: vi.fn(), error: vi.fn() },
}));

global.fetch = vi.fn();

const {
    getLinkedInOAuthUrl,
    exchangeLinkedInCode,
    getLinkedInProfile,
    fetchLinkedInPosts,
    fetchLinkedInOrganizationPosts,
    extractTextFromLinkedInPosts,
} = await import("@/lib/scraping/linkedin-api");

describe("LinkedIn API Client", () => {
    const mockConfig = {
        clientId: "test-id",
        clientSecret: "test-secret",
        redirectUri: "https://example.com/callback",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getLinkedInOAuthUrl", () => {
        it("generates correct OAuth URL", () => {
            const url = getLinkedInOAuthUrl(mockConfig, "state");
            expect(url).toContain("linkedin.com");
            expect(url).toContain("client_id=test-id");
        });
    });

    describe("exchangeLinkedInCode", () => {
        it("exchanges code successfully", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ access_token: "token", expires_in: 3600 }),
            });
            const result = await exchangeLinkedInCode("code", mockConfig);
            expect(result.accessToken).toBe("token");
        });
    });

    describe("getLinkedInProfile", () => {
        it("fetches profile successfully", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    sub: "123",
                    given_name: "John",
                    family_name: "Doe",
                }),
            });
            const result = await getLinkedInProfile("token");
            expect(result.id).toBe("123");
        });
    });

    describe("fetchLinkedInPosts", () => {
        it("fetches posts successfully", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ elements: [] }),
            });
            const result = await fetchLinkedInPosts("token", "author");
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe("fetchLinkedInOrganizationPosts", () => {
        it("fetches org posts successfully", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ elements: [] }),
            });
            const result = await fetchLinkedInOrganizationPosts("token", "org");
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe("extractTextFromLinkedInPosts", () => {
        it("extracts text from posts", () => {
            const posts = [{
                id: "1",
                text: "This is a long enough post",
                createdAt: "2024-01-01",
                likeCount: 10,
                commentCount: 5,
                shareCount: 2,
                visibility: "PUBLIC",
                author: "author",
            }];
            const result = extractTextFromLinkedInPosts(posts);
            expect(result.length).toBeGreaterThan(0);
        });
    });
});
