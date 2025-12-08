import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/intake/upload/route";
import {
    createMockRequest,
    parseJsonResponse,
} from "@/__tests__/helpers/api-test-helpers";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/intake/processors", () => ({
    extractTextFromFile: vi.fn(),
    validateIntakeContent: vi.fn(() => ({ valid: true })),
}));

import { createClient } from "@/lib/supabase/server";
import { extractTextFromFile } from "@/lib/intake/processors";

describe("POST /api/intake/upload", () => {
    beforeEach(() => vi.clearAllMocks());

    it("should upload and process file successfully", async () => {
        vi.mocked(extractTextFromFile).mockResolvedValue("Extracted text from file");

        const mockSupabase = {
            storage: {
                from: vi.fn(() => ({
                    upload: vi.fn().mockResolvedValue({ error: null }),
                    getPublicUrl: vi.fn(() => ({
                        data: { publicUrl: "https://example.com/file.pdf" },
                    })),
                })),
            },
            from: vi.fn(() => ({
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi
                    .fn()
                    .mockResolvedValue({ data: { id: "intake-123" }, error: null }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const formData = new FormData();
        formData.append(
            "file",
            new File(["test"], "test.pdf", { type: "application/pdf" })
        );
        formData.append("projectId", "project-123");
        formData.append("userId", "user-123");

        const request = {
            formData: async () => formData,
        } as any;

        const response = await POST(request);
        const data = await parseJsonResponse<{ success: boolean }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should return 400 for missing fields", async () => {
        const formData = new FormData();
        const request = { formData: async () => formData } as any;

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("Missing required fields");
    });

    it("should return 400 for unsupported file type", async () => {
        const formData = new FormData();
        formData.append(
            "file",
            new File(["test"], "test.exe", { type: "application/exe" })
        );
        formData.append("projectId", "project-123");
        formData.append("userId", "user-123");

        const request = { formData: async () => formData } as any;

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("Unsupported file type");
    });

    it("should return 400 for file too large", async () => {
        const largeContent = "x".repeat(11 * 1024 * 1024);
        const formData = new FormData();
        formData.append(
            "file",
            new File([largeContent], "large.pdf", { type: "application/pdf" })
        );
        formData.append("projectId", "project-123");
        formData.append("userId", "user-123");

        const request = { formData: async () => formData } as any;

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("File too large (max 10MB)");
    });
});
