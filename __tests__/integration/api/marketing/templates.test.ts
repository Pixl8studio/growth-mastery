import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/marketing/templates/route";
import {
    createMockSupabaseClient,
    createMockRequest,
} from "@/__tests__/utils/test-helpers";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

describe("GET /api/marketing/templates", () => {
    let mockSupabase: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabaseClient();
        const { createClient } = await import("@/lib/supabase/server");
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    });

    it("should return templates for authenticated user", async () => {
        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/templates",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(Array.isArray(data.templates)).toBe(true);
        expect(data.templates.length).toBeGreaterThan(0);
    });

    it("should return 401 for unauthenticated user", async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: null },
            error: null,
        });

        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/templates",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Unauthorized");
    });

    it("should accept funnel_project_id parameter", async () => {
        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/templates?funnel_project_id=funnel-1",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should return default templates", async () => {
        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/templates",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        const defaultTemplates = data.templates.filter((t: any) => t.is_default);
        expect(defaultTemplates.length).toBeGreaterThan(0);
    });

    it("should include template metadata", async () => {
        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/templates",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.templates[0]).toHaveProperty("id");
        expect(data.templates[0]).toHaveProperty("name");
        expect(data.templates[0]).toHaveProperty("description");
        expect(data.templates[0]).toHaveProperty("is_default");
        expect(data.templates[0]).toHaveProperty("is_favorite");
    });

    it("should log templates request", async () => {
        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/templates",
        });

        await GET(request);

        expect(mockLogger.info).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: "test-user-id",
            }),
            "Templates requested"
        );
    });
});

describe("POST /api/marketing/templates", () => {
    let mockSupabase: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabaseClient();
        const { createClient } = await import("@/lib/supabase/server");
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    });

    it("should create template for authenticated user", async () => {
        const templateData = {
            name: "Custom Template",
            description: "My custom template",
            config: {
                tone: "professional",
                length: "medium",
            },
        };

        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/templates",
            body: templateData,
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.template).toBeDefined();
        expect(data.template.name).toBe(templateData.name);
        expect(data.template.description).toBe(templateData.description);
        expect(data.template.user_id).toBe("test-user-id");
    });

    it("should return 401 for unauthenticated user", async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: null },
            error: null,
        });

        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/templates",
            body: {
                name: "Test Template",
            },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Unauthorized");
    });

    it("should set custom templates as non-default", async () => {
        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/templates",
            body: {
                name: "Custom Template",
            },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.template.is_default).toBe(false);
    });

    it("should set new templates as non-favorite", async () => {
        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/templates",
            body: {
                name: "Custom Template",
            },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.template.is_favorite).toBe(false);
    });

    it("should generate unique template ID", async () => {
        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/templates",
            body: {
                name: "Test Template",
            },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.template.id).toMatch(/^tmpl_\d+$/);
    });

    it("should include config in created template", async () => {
        const config = {
            tone: "casual",
            length: "short",
            include_emoji: true,
        };

        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/templates",
            body: {
                name: "Test Template",
                config,
            },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.template.config).toEqual(config);
    });

    it("should log template creation", async () => {
        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/templates",
            body: {
                name: "Test Template",
            },
        });

        await POST(request);

        expect(mockLogger.info).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: "test-user-id",
                templateName: "Test Template",
            }),
            "Template creation requested"
        );
    });
});
