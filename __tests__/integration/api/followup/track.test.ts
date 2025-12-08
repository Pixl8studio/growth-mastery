import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/followup/track/route";
import {
    createMockRequest,
    parseJsonResponse,
} from "@/__tests__/helpers/api-test-helpers";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/logger", () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/lib/followup/engagement-service", () => ({
    trackEngagement: vi.fn(),
    trackVideoWatch: vi.fn(),
    trackOfferClick: vi.fn(),
}));

import { trackEngagement } from "@/lib/followup/engagement-service";

describe("POST /api/followup/track", () => {
    beforeEach(() => vi.clearAllMocks());

    it("should track engagement event", async () => {
        vi.mocked(trackEngagement).mockResolvedValue({
            success: true,
            event: { id: "evt-123" },
            score_updated: true,
            new_score: 85,
        } as any);

        const request = createMockRequest({
            method: "POST",
            body: { event_type: "email_open", prospect_id: "p-123" },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ success: boolean }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should return 400 for missing prospect_id", async () => {
        const request = createMockRequest({
            method: "POST",
            body: { event_type: "email_open" },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("prospect_id is required");
    });

    it("should return 400 for missing event_type", async () => {
        const request = createMockRequest({
            method: "POST",
            body: { prospect_id: "p-123" },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("event_type is required");
    });
});
