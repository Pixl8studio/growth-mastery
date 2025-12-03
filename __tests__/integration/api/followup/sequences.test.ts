import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET } from "@/app/api/followup/sequences/route";
import {
    createMockRequest,
    parseJsonResponse,
} from "@/__tests__/helpers/api-test-helpers";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

vi.mock("@/lib/followup/sequence-service", () => ({
    createSequence: vi.fn(),
    listSequences: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { createSequence, listSequences } from "@/lib/followup/sequence-service";

describe("POST /api/followup/sequences", () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const mockAgentConfig = { user_id: "user-123" };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should create sequence with valid data", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi
                    .fn()
                    .mockResolvedValue({ data: mockAgentConfig, error: null }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(createSequence).mockResolvedValue({
            success: true,
            sequence: {
                id: "seq-123",
                name: "Welcome Sequence",
                agent_config_id: "config-123",
            },
        } as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                agent_config_id: "config-123",
                name: "Welcome Sequence",
                trigger_event: "lead_captured",
                total_messages: 3,
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.sequence).toBeDefined();
        expect(data.sequence.name).toBe("Welcome Sequence");
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
                name: "Test",
                agent_config_id: "config-123",
                trigger_event: "lead_captured",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Authentication required");
    });

    it("should return 400 for missing agent_config_id", async () => {
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
            body: { name: "Test", trigger_event: "lead_captured" },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("agent_config_id is required");
    });

    it("should return 400 for missing name", async () => {
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
            body: { agent_config_id: "config-123", trigger_event: "lead_captured" },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("name is required");
    });

    it("should return 400 for missing trigger_event", async () => {
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
            body: { agent_config_id: "config-123", name: "Test Sequence" },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("trigger_event is required");
    });

    it("should return 401 when user doesn't own agent config", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: { user_id: "other-user" },
                    error: null,
                }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                agent_config_id: "config-123",
                name: "Test",
                trigger_event: "lead_captured",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Access denied to agent config");
    });

    it("should return 500 when service fails", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi
                    .fn()
                    .mockResolvedValue({ data: mockAgentConfig, error: null }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(createSequence).mockResolvedValue({
            success: false,
            error: "Database connection failed",
        } as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                agent_config_id: "config-123",
                name: "Test",
                trigger_event: "lead_captured",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(500);
        expect(data.error).toBe("Database connection failed");
    });
});

describe("GET /api/followup/sequences", () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const mockAgentConfig = { user_id: "user-123" };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should list sequences for authenticated user", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi
                    .fn()
                    .mockResolvedValue({ data: mockAgentConfig, error: null }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(listSequences).mockResolvedValue({
            success: true,
            sequences: [
                { id: "seq-1", name: "Sequence 1" },
                { id: "seq-2", name: "Sequence 2" },
            ],
        } as any);

        const request = createMockRequest({
            url: "http://localhost:3000/api/followup/sequences?agent_config_id=config-123",
        });

        const response = await GET(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.sequences).toHaveLength(2);
        expect(data.count).toBe(2);
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
            url: "http://localhost:3000/api/followup/sequences?agent_config_id=config-123",
        });

        const response = await GET(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Authentication required");
    });

    it("should return 400 for missing agent_config_id parameter", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            url: "http://localhost:3000/api/followup/sequences",
        });

        const response = await GET(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("agent_config_id query parameter is required");
    });

    it("should return 401 when user doesn't own agent config", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: { user_id: "other-user" },
                    error: null,
                }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            url: "http://localhost:3000/api/followup/sequences?agent_config_id=config-123",
        });

        const response = await GET(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Access denied to agent config");
    });

    it("should return 500 when service fails", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi
                    .fn()
                    .mockResolvedValue({ data: mockAgentConfig, error: null }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(listSequences).mockResolvedValue({
            success: false,
            error: "Database error",
        } as any);

        const request = createMockRequest({
            url: "http://localhost:3000/api/followup/sequences?agent_config_id=config-123",
        });

        const response = await GET(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(500);
        expect(data.error).toBe("Database error");
    });
});
