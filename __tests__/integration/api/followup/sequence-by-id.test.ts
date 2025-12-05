import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/followup/sequences/[sequenceId]/route";
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
    getSequence: vi.fn(),
    updateSequence: vi.fn(),
    deleteSequence: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import {
    getSequence,
    updateSequence,
    deleteSequence,
} from "@/lib/followup/sequence-service";

const mockUser = { id: "user-123", email: "test@example.com" };
const mockAgentConfig = { user_id: "user-123" };
const mockSequence = {
    id: "seq-123",
    name: "Test Sequence",
    agent_config_id: "config-123",
};

describe("GET /api/followup/sequences/[sequenceId]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should get sequence by id", async () => {
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
        vi.mocked(getSequence).mockResolvedValue({
            success: true,
            sequence: mockSequence,
        } as any);

        const request = createMockRequest();
        const context = { params: Promise.resolve({ sequenceId: "seq-123" }) };

        const response = await GET(request, context);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.sequence.id).toBe("seq-123");
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

        const request = createMockRequest();
        const context = { params: Promise.resolve({ sequenceId: "seq-123" }) };

        const response = await GET(request, context);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Authentication required");
    });

    it("should return 404 when sequence not found", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(getSequence).mockResolvedValue({
            success: false,
            sequence: null,
        } as any);

        const request = createMockRequest();
        const context = { params: Promise.resolve({ sequenceId: "seq-999" }) };

        const response = await GET(request, context);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(404);
        expect(data.error).toContain("not found");
    });

    it("should return 401 when user doesn't own sequence", async () => {
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
        vi.mocked(getSequence).mockResolvedValue({
            success: true,
            sequence: mockSequence,
        } as any);

        const request = createMockRequest();
        const context = { params: Promise.resolve({ sequenceId: "seq-123" }) };

        const response = await GET(request, context);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Access denied to this sequence");
    });
});

describe("PUT /api/followup/sequences/[sequenceId]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should update sequence", async () => {
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
        vi.mocked(updateSequence).mockResolvedValue({
            success: true,
            sequence: { ...mockSequence, name: "Updated Sequence" },
        } as any);

        const request = createMockRequest({
            method: "PUT",
            body: { name: "Updated Sequence" },
        });
        const context = { params: Promise.resolve({ sequenceId: "seq-123" }) };

        const response = await PUT(request, context);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.sequence.name).toBe("Updated Sequence");
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
            method: "PUT",
            body: { name: "Updated" },
        });
        const context = { params: Promise.resolve({ sequenceId: "seq-123" }) };

        const response = await PUT(request, context);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Authentication required");
    });
});

describe("DELETE /api/followup/sequences/[sequenceId]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should delete sequence", async () => {
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
        vi.mocked(deleteSequence).mockResolvedValue({
            success: true,
        } as any);

        const request = createMockRequest({ method: "DELETE" });
        const context = { params: Promise.resolve({ sequenceId: "seq-123" }) };

        const response = await DELETE(request, context);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
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

        const request = createMockRequest({ method: "DELETE" });
        const context = { params: Promise.resolve({ sequenceId: "seq-123" }) };

        const response = await DELETE(request, context);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Authentication required");
    });

    it("should return 404 when sequence not found", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({ method: "DELETE" });
        const context = { params: Promise.resolve({ sequenceId: "seq-999" }) };

        const response = await DELETE(request, context);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(404);
        expect(data.error).toContain("not found");
    });
});
