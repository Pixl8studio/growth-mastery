/**
 * Integration Tests: Gamma Export API
 * Tests for app/api/gamma/export/route.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/gamma/export/route";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/gamma/client", () => ({
    generateDeck: vi.fn(),
    deckStructureToMarkdown: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

describe("POST /api/gamma/export", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should export deck successfully", async () => {
        const { generateDeck } = await import("@/lib/gamma/client");
        (generateDeck as any).mockResolvedValue({
            sessionId: "session-123",
            deckId: "deck-456",
            deckUrl: "https://gamma.app/docs/deck-456",
            editUrl: "https://gamma.app/docs/deck-456/edit",
            status: "ready",
        });

        const request = new NextRequest("http://localhost:3000/api/gamma/export", {
            method: "POST",
            body: JSON.stringify({
                text: "# Slide 1\nContent",
                theme: "alpine",
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty("deckUrl");
    });

    it("should handle generation errors", async () => {
        const { generateDeck } = await import("@/lib/gamma/client");
        (generateDeck as any).mockRejectedValue(new Error("Generation failed"));

        const request = new NextRequest("http://localhost:3000/api/gamma/export", {
            method: "POST",
            body: JSON.stringify({ text: "" }),
        });

        const response = await POST(request);

        expect(response.status).toBeGreaterThanOrEqual(400);
    });
});
