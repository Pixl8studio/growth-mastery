import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET } from "@/app/api/followup/prospects/route";
import {
    createMockRequest,
    parseJsonResponse,
} from "@/__tests__/helpers/api-test-helpers";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/logger", () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/lib/followup/prospect-service", () => ({
    createProspect: vi.fn(),
    listProspects: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { createProspect, listProspects } from "@/lib/followup/prospect-service";

const mockUser = { id: "user-123", email: "test@example.com" };

describe("POST /api/followup/prospects", () => {
    beforeEach(() => vi.clearAllMocks());

    it("should create prospect with valid data", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(createProspect).mockResolvedValue({
            success: true,
            prospect: { id: "p-123", email: "prospect@test.com" },
        } as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                email: "prospect@test.com",
                funnel_project_id: "project-123",
                first_name: "John",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{
            success: boolean;
            prospect: { email: string };
        }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.prospect.email).toBe("prospect@test.com");
    });

    it("should return 400 for missing email", async () => {
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
            body: { funnel_project_id: "project-123" },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("Email is required");
    });

    it("should return 400 for missing funnel_project_id", async () => {
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
            body: { email: "test@example.com" },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("Funnel project ID is required");
    });
});

describe("GET /api/followup/prospects", () => {
    beforeEach(() => vi.clearAllMocks());

    it("should list prospects with filters", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(listProspects).mockResolvedValue({
            success: true,
            prospects: [{ id: "p-1" }, { id: "p-2" }],
        } as any);

        const request = createMockRequest({
            url: "http://localhost:3000/api/followup/prospects?funnel_project_id=project-123&segment=hot",
        });

        const response = await GET(request);
        const data = await parseJsonResponse<{ prospects: Array<unknown> }>(response);

        expect(response.status).toBe(200);
        expect(data.prospects).toHaveLength(2);
    });

    it("should return 400 for missing funnel_project_id", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            url: "http://localhost:3000/api/followup/prospects",
        });

        const response = await GET(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("funnel_project_id query parameter is required");
    });
});
