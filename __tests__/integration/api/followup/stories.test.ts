import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET } from "@/app/api/followup/stories/route";
import {
    createMockRequest,
    parseJsonResponse,
} from "@/__tests__/helpers/api-test-helpers";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/logger", () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/lib/followup/story-library-service", () => ({
    createStory: vi.fn(),
    listStories: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { createStory, listStories } from "@/lib/followup/story-library-service";

const mockUser = { id: "user-123", email: "test@example.com" };

describe("POST /api/followup/stories", () => {
    beforeEach(() => vi.clearAllMocks());

    it("should create story with valid data", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(createStory).mockResolvedValue({
            success: true,
            story: { id: "s-123", title: "Success Story" },
        } as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                title: "Success Story",
                story_type: "testimonial",
                content: "Amazing results!",
                objection_category: "price",
                business_niche: ["coaching"],
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should return 400 for missing required fields", async () => {
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
            body: { title: "Story" },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(400);
        expect(data.error).toContain("required");
    });
});

describe("GET /api/followup/stories", () => {
    beforeEach(() => vi.clearAllMocks());

    it("should list stories with filters", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(listStories).mockResolvedValue({
            success: true,
            stories: [{ id: "s-1" }],
        } as any);

        const request = createMockRequest({
            url: "http://localhost:3000/api/followup/stories?story_type=testimonial",
        });

        const response = await GET(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.stories).toHaveLength(1);
    });
});
