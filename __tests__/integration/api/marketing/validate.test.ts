/**
 * Validate API Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/marketing/validate/route";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
        auth: {
            getUser: vi.fn(() => ({
                data: { user: { id: "user-123" } },
                error: null,
            })),
        },
    })),
}));

describe("POST /api/marketing/validate", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("validates content successfully", async () => {
        const request = new NextRequest("http://localhost/api/marketing/validate", {
            method: "POST",
            body: JSON.stringify({
                content: "Test content",
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.validation_result).toBeDefined();
        expect(data.validation_result.passed).toBe(true);
    });

    it("returns 401 for unauthenticated requests", async () => {
        vi.mocked(createClient).mockReturnValue({
            auth: {
                getUser: vi.fn(() => ({
                    data: { user: null },
                    error: null,
                })),
            },
        } as any);

        const request = new NextRequest("http://localhost/api/marketing/validate", {
            method: "POST",
            body: JSON.stringify({}),
        });

        const response = await POST(request);

        expect(response.status).toBe(401);
    });
});
