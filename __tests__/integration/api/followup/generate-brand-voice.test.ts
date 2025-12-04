import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/followup/generate-brand-voice/route";
import {
    createMockRequest,
    parseJsonResponse,
} from "@/__tests__/helpers/api-test-helpers";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/logger", () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/lib/marketing/brand-voice-service", () => ({
    generateBrandVoiceGuidelines: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { generateBrandVoiceGuidelines } from "@/lib/marketing/brand-voice-service";

const mockUser = { id: "user-123", email: "test@example.com" };

describe("POST /api/followup/generate-brand-voice", () => {
    beforeEach(() => vi.clearAllMocks());

    it("should generate brand voice guidelines successfully", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
        };

        const mockBrandVoice =
            "## Brand Voice Guidelines\n\n**Tone:** Professional\n**Style:** Conversational\n**Voice Attributes:** Friendly, Authoritative";

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(generateBrandVoiceGuidelines).mockResolvedValue(
            mockBrandVoice
        );

        const request = createMockRequest({
            method: "POST",
            body: {
                businessContext: {
                    business_name: "Acme Corp",
                    industry: "Technology",
                },
                productKnowledge: {
                    product_name: "AI Platform",
                    description: "Enterprise AI solution",
                },
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.brandVoice).toEqual(mockBrandVoice);
    });

    it("should return 400 for missing businessContext", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                productKnowledge: { product_name: "Test" },
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe(
            "businessContext and productKnowledge are required"
        );
    });

    it("should return 400 for missing productKnowledge", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                businessContext: { business_name: "Test" },
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe(
            "businessContext and productKnowledge are required"
        );
    });

    it("should return 401 for unauthenticated users", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: null },
                    error: { message: "Unauthorized" },
                }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                businessContext: { business_name: "Test" },
                productKnowledge: { product_name: "Test" },
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Authentication required");
    });

    it("should return 500 when generation fails", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(generateBrandVoiceGuidelines).mockRejectedValue(
            new Error("Generation failed")
        );

        const request = createMockRequest({
            method: "POST",
            body: {
                businessContext: { business_name: "Test" },
                productKnowledge: { product_name: "Test" },
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to generate brand voice guidelines");
    });
});
