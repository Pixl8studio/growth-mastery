import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/marketing/experiments/route";
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

describe("POST /api/marketing/experiments", () => {
    let mockSupabase: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabaseClient();
        const { createClient } = await import("@/lib/supabase/server");
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    });

    it("should create experiment for authenticated user", async () => {
        const experimentData = {
            name: "A/B Test - Headlines",
            funnel_project_id: "funnel-1",
            experiment_type: "ab_test",
            variant_a_id: "variant-1",
            config: {
                duration_days: 7,
            },
        };

        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/experiments",
            body: experimentData,
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.experiment).toBeDefined();
        expect(data.experiment.name).toBe(experimentData.name);
        expect(data.experiment.user_id).toBe("test-user-id");
        expect(data.experiment.status).toBe("draft");
    });

    it("should return 401 for unauthenticated user", async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: null },
            error: null,
        });

        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/experiments",
            body: {
                name: "Test Experiment",
            },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Unauthorized");
    });

    it("should include experiment configuration", async () => {
        const config = {
            duration_days: 14,
            confidence_threshold: 0.95,
        };

        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/experiments",
            body: {
                name: "Test Experiment",
                experiment_type: "multivariate",
                config,
            },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.experiment.config).toEqual(config);
    });

    it("should set variant_a_id from request body", async () => {
        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/experiments",
            body: {
                name: "Test Experiment",
                variant_a_id: "variant-123",
            },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.experiment.variant_a_id).toBe("variant-123");
    });

    it("should initialize variant_b_id as null", async () => {
        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/experiments",
            body: {
                name: "Test Experiment",
            },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.experiment.variant_b_id).toBeNull();
    });

    it("should handle missing request body gracefully", async () => {
        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/experiments",
            body: {},
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should generate unique experiment ID", async () => {
        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/experiments",
            body: {
                name: "Test Experiment",
            },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.experiment.id).toMatch(/^exp_\d+$/);
    });
});
