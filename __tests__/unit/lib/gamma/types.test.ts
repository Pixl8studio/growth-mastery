/**
 * Unit Tests: Gamma Types
 * Tests for lib/gamma/types.ts
 */

import { describe, it, expect } from "vitest";
import type {
    GammaTheme,
    GammaDeckRequest,
    GammaDeckResponse,
    GammaSession,
} from "@/lib/gamma/types";
import { GAMMA_THEMES } from "@/lib/gamma/types";

describe("Gamma Types", () => {
    describe("GammaTheme", () => {
        it("should have correct structure", () => {
            const theme: GammaTheme = {
                id: "alpine",
                name: "Alpine",
                description: "Clean and modern with blue tones",
                thumbnailUrl: "/gamma-themes/alpine.png",
                category: "professional",
            };

            expect(theme).toHaveProperty("id");
            expect(theme).toHaveProperty("name");
            expect(theme).toHaveProperty("description");
            expect(theme).toHaveProperty("thumbnailUrl");
        });

        it("should allow optional category", () => {
            const theme: GammaTheme = {
                id: "custom",
                name: "Custom Theme",
                description: "A custom theme",
                thumbnailUrl: "/custom.png",
            };

            expect(theme.category).toBeUndefined();
        });
    });

    describe("GAMMA_THEMES", () => {
        it("should contain 20 themes", () => {
            expect(GAMMA_THEMES).toHaveLength(20);
        });

        it("should have all themes with required fields", () => {
            GAMMA_THEMES.forEach((theme) => {
                expect(theme).toHaveProperty("id");
                expect(theme).toHaveProperty("name");
                expect(theme).toHaveProperty("description");
                expect(theme).toHaveProperty("thumbnailUrl");
                expect(typeof theme.id).toBe("string");
                expect(typeof theme.name).toBe("string");
            });
        });

        it("should have unique theme IDs", () => {
            const ids = GAMMA_THEMES.map((theme) => theme.id);
            const uniqueIds = new Set(ids);

            expect(uniqueIds.size).toBe(GAMMA_THEMES.length);
        });

        it("should include expected themes", () => {
            const themeIds = GAMMA_THEMES.map((t) => t.id);

            expect(themeIds).toContain("alpine");
            expect(themeIds).toContain("aurora");
            expect(themeIds).toContain("minimal");
            expect(themeIds).toContain("corporate");
        });

        it("should categorize themes correctly", () => {
            const professionalThemes = GAMMA_THEMES.filter(
                (t) => t.category === "professional"
            );
            const creativeThemes = GAMMA_THEMES.filter(
                (t) => t.category === "creative"
            );

            expect(professionalThemes.length).toBeGreaterThan(0);
            expect(creativeThemes.length).toBeGreaterThan(0);
        });
    });

    describe("GammaDeckRequest", () => {
        it("should have correct structure with all fields", () => {
            const request: GammaDeckRequest = {
                text: "# Slide 1\n\nContent",
                theme: "alpine",
                title: "Test Presentation",
            };

            expect(request).toHaveProperty("text");
            expect(request.theme).toBe("alpine");
            expect(request.title).toBe("Test Presentation");
        });

        it("should allow minimal request with just text", () => {
            const request: GammaDeckRequest = {
                text: "Content only",
            };

            expect(request.text).toBe("Content only");
            expect(request.theme).toBeUndefined();
            expect(request.title).toBeUndefined();
        });
    });

    describe("GammaDeckResponse", () => {
        it("should have correct structure for successful generation", () => {
            const response: GammaDeckResponse = {
                sessionId: "session-123",
                deckId: "deck-456",
                deckUrl: "https://gamma.app/docs/deck-456",
                editUrl: "https://gamma.app/docs/deck-456/edit",
                status: "ready",
            };

            expect(response).toHaveProperty("sessionId");
            expect(response).toHaveProperty("deckId");
            expect(response).toHaveProperty("deckUrl");
            expect(response).toHaveProperty("editUrl");
            expect(["generating", "ready", "failed"]).toContain(response.status);
        });

        it("should handle generating status", () => {
            const response: GammaDeckResponse = {
                sessionId: "session-123",
                deckId: "deck-456",
                deckUrl: "https://gamma.app/docs/deck-456",
                editUrl: "https://gamma.app/docs/deck-456/edit",
                status: "generating",
            };

            expect(response.status).toBe("generating");
        });

        it("should handle failed status", () => {
            const response: GammaDeckResponse = {
                sessionId: "session-123",
                deckId: "deck-456",
                deckUrl: "https://gamma.app/docs/deck-456",
                editUrl: "https://gamma.app/docs/deck-456/edit",
                status: "failed",
            };

            expect(response.status).toBe("failed");
        });

        it("should include optional thumbnail URL", () => {
            const response: GammaDeckResponse = {
                sessionId: "session-123",
                deckId: "deck-456",
                deckUrl: "https://gamma.app/docs/deck-456",
                editUrl: "https://gamma.app/docs/deck-456/edit",
                thumbnailUrl: "https://gamma.app/thumbs/deck-456.png",
                status: "ready",
            };

            expect(response.thumbnailUrl).toBeDefined();
        });
    });

    describe("GammaSession", () => {
        it("should have correct structure for active session", () => {
            const session: GammaSession = {
                sessionId: "session-123",
                status: "active",
                createdAt: "2025-01-01T00:00:00Z",
            };

            expect(session.sessionId).toBeDefined();
            expect(session.status).toBe("active");
            expect(session.createdAt).toBeDefined();
        });

        it("should have correct structure for expired session", () => {
            const session: GammaSession = {
                sessionId: "session-123",
                status: "expired",
                createdAt: "2025-01-01T00:00:00Z",
                expiresAt: "2025-01-02T00:00:00Z",
            };

            expect(session.status).toBe("expired");
            expect(session.expiresAt).toBeDefined();
        });

        it("should accept valid status values", () => {
            const activeSession: GammaSession = {
                sessionId: "123",
                status: "active",
                createdAt: "2025-01-01T00:00:00Z",
            };

            const expiredSession: GammaSession = {
                sessionId: "456",
                status: "expired",
                createdAt: "2025-01-01T00:00:00Z",
            };

            expect(["active", "expired"]).toContain(activeSession.status);
            expect(["active", "expired"]).toContain(expiredSession.status);
        });
    });
});
