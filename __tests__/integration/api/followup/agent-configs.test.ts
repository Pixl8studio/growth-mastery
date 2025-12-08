import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET } from "@/app/api/followup/agent-configs/route";
import {
    createMockRequest,
    parseJsonResponse,
} from "@/__tests__/helpers/api-test-helpers";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/logger", () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/lib/followup/agent-config-service", () => ({
    createAgentConfig: vi.fn(),
    listAgentConfigs: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import {
    createAgentConfig,
    listAgentConfigs,
} from "@/lib/followup/agent-config-service";

const mockUser = { id: "user-123", email: "test@example.com" };
const mockProject = { user_id: "user-123" };

describe("POST /api/followup/agent-configs", () => {
    beforeEach(() => vi.clearAllMocks());

    it("should create agent config with valid data", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockProject, error: null }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(createAgentConfig).mockResolvedValue({
            success: true,
            config: { id: "c-123", name: "My Agent" },
        } as any);

        const request = createMockRequest({
            method: "POST",
            body: { funnel_project_id: "project-123", name: "My Agent" },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ success: boolean }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
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
            body: { name: "My Agent" },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("funnel_project_id is required");
    });
});

describe("GET /api/followup/agent-configs", () => {
    beforeEach(() => vi.clearAllMocks());

    it("should list agent configs", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockProject, error: null }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(listAgentConfigs).mockResolvedValue({
            success: true,
            configs: [{ id: "c-1" }],
        } as any);

        const request = createMockRequest({
            url: "http://localhost:3000/api/followup/agent-configs?funnel_project_id=project-123",
        });

        const response = await GET(request);
        const data = await parseJsonResponse<{ configs: Array<{ id: string }> }>(
            response
        );

        expect(response.status).toBe(200);
        expect(data.configs).toHaveLength(1);
    });
});
