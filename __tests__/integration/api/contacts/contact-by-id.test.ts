import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH } from "@/app/api/contacts/[contactId]/route";
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
        child: vi.fn(() => ({
            info: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
        })),
        info: vi.fn(),
        error: vi.fn(),
    },
}));

import { createClient } from "@/lib/supabase/server";

describe("GET /api/contacts/[contactId]", () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const mockContact = {
        id: "contact-123",
        email: "contact@example.com",
        name: "Test Contact",
        user_id: "user-123",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return contact detail with events", async () => {
        const mockEvents = [
            { id: "event-1", event_type: "registration", created_at: new Date().toISOString() },
            { id: "event-2", event_type: "video_view", created_at: new Date().toISOString() },
        ];

        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "contacts") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: mockContact,
                            error: null,
                        }),
                    };
                }
                if (table === "contact_events") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        order: vi.fn().mockReturnThis(),
                        limit: vi.fn().mockResolvedValue({
                            data: mockEvents,
                            error: null,
                        }),
                    };
                }
                return {
                    select: vi.fn().mockReturnThis(),
                };
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            url: "http://localhost:3000/api/contacts/contact-123",
        });

        const response = await GET(request, {
            params: Promise.resolve({ contactId: "contact-123" }),
        });
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.contact).toBeDefined();
        expect(data.contact.id).toBe("contact-123");
        expect(data.events).toHaveLength(2);
    });

    it("should return 401 for unauthenticated users", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({
                        data: { user: null },
                        error: { message: "Unauthorized" },
                    }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            url: "http://localhost:3000/api/contacts/contact-123",
        });

        const response = await GET(request, {
            params: Promise.resolve({ contactId: "contact-123" }),
        });
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when contact not found", async () => {
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
                    data: null,
                    error: { message: "Not found" },
                }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            url: "http://localhost:3000/api/contacts/nonexistent",
        });

        const response = await GET(request, {
            params: Promise.resolve({ contactId: "nonexistent" }),
        });
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(404);
        expect(data.error).toBe("Contact not found");
    });

    it("should return 404 when contact belongs to different user", async () => {
        const otherUserContact = {
            ...mockContact,
            user_id: "other-user",
        };

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
                    data: null,
                    error: { message: "Not found" },
                }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            url: "http://localhost:3000/api/contacts/contact-123",
        });

        const response = await GET(request, {
            params: Promise.resolve({ contactId: "contact-123" }),
        });
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(404);
        expect(data.error).toBe("Contact not found");
    });

    it("should return 500 on database error", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockRejectedValue(new Error("Database error")),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            url: "http://localhost:3000/api/contacts/contact-123",
        });

        const response = await GET(request, {
            params: Promise.resolve({ contactId: "contact-123" }),
        });
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to fetch contact");
    });
});

describe("PATCH /api/contacts/[contactId]", () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const mockContact = {
        id: "contact-123",
        email: "contact@example.com",
        name: "Test Contact",
        notes: "Updated notes",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should update contact notes and tags", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn(() => ({
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: mockContact,
                    error: null,
                }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "PATCH",
            body: {
                notes: "Updated notes",
                tags: ["vip", "interested"],
            },
        });

        const response = await PATCH(request, {
            params: Promise.resolve({ contactId: "contact-123" }),
        });
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.contact).toBeDefined();
    });

    it("should return 401 for unauthenticated users", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({
                        data: { user: null },
                        error: { message: "Unauthorized" },
                    }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "PATCH",
            body: { notes: "Test" },
        });

        const response = await PATCH(request, {
            params: Promise.resolve({ contactId: "contact-123" }),
        });
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
    });

    it("should update only notes when only notes provided", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn(() => ({
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: { ...mockContact, notes: "Only notes" },
                    error: null,
                }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "PATCH",
            body: { notes: "Only notes" },
        });

        const response = await PATCH(request, {
            params: Promise.resolve({ contactId: "contact-123" }),
        });
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should update only tags when only tags provided", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn(() => ({
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: { ...mockContact, tags: ["tag1", "tag2"] },
                    error: null,
                }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "PATCH",
            body: { tags: ["tag1", "tag2"] },
        });

        const response = await PATCH(request, {
            params: Promise.resolve({ contactId: "contact-123" }),
        });
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should return 500 on database error", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn(() => ({
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: "Database error" },
                }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "PATCH",
            body: { notes: "Test" },
        });

        const response = await PATCH(request, {
            params: Promise.resolve({ contactId: "contact-123" }),
        });
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to update contact");
    });
});
