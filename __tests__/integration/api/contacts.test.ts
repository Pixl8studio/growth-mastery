/**
 * Contacts API Integration Tests
 * Test contact management endpoints
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/contacts/route";
import { NextRequest } from "next/server";

// Mock Supabase client
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
        auth: {
            getUser: vi.fn(() => ({
                data: { user: { id: "test-user-id", email: "test@example.com" } },
            })),
        },
        from: vi.fn((table) => {
            if (table === "contacts") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            or: vi.fn(() => ({
                                range: vi.fn(() => ({
                                    order: vi.fn(() => ({
                                        data: [
                                            {
                                                id: "contact-1",
                                                email: "lead@example.com",
                                                name: "Test Lead",
                                                current_stage: "registered",
                                            },
                                        ],
                                        count: 1,
                                        error: null,
                                    })),
                                })),
                            })),
                        })),
                    })),
                    upsert: vi.fn(() => ({
                        select: vi.fn(() => ({
                            single: vi.fn(() => ({
                                data: {
                                    id: "new-contact-id",
                                    email: "new@example.com",
                                    name: "New Lead",
                                },
                                error: null,
                            })),
                        })),
                    })),
                };
            }
            if (table === "funnel_projects") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: vi.fn(() => ({
                                data: { user_id: "test-user-id" },
                                error: null,
                            })),
                        })),
                    })),
                };
            }
            return {};
        }),
    })),
}));

describe("GET /api/contacts", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should fetch contacts successfully", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/contacts?page=1&pageSize=20"
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.contacts).toBeDefined();
        expect(data.pagination).toBeDefined();
    });
});

describe("POST /api/contacts", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should create contact successfully", async () => {
        const request = new NextRequest("http://localhost:3000/api/contacts", {
            method: "POST",
            body: JSON.stringify({
                email: "new@example.com",
                name: "New Lead",
                funnelProjectId: "test-project-id",
                registrationPageId: "test-page-id",
                visitorId: "visitor-123",
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.contact).toBeDefined();
    });
});
