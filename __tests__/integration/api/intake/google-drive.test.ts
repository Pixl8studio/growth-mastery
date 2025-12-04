import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET } from "@/app/api/intake/google-drive/route";
import { createMockRequest, parseJsonResponse } from "@/__tests__/helpers/api-test-helpers";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock("@/lib/intake/processors", () => ({
    extractTextFromFile: vi.fn(),
    validateIntakeContent: vi.fn(() => ({ valid: true })),
}));

global.fetch = vi.fn();

import { createClient } from "@/lib/supabase/server";
import { extractTextFromFile } from "@/lib/intake/processors";

describe("POST /api/intake/google-drive", () => {
    beforeEach(() => vi.clearAllMocks());

    it("should process Google Drive files successfully", async () => {
        vi.mocked(extractTextFromFile).mockResolvedValue("Extracted text from Google Drive file");

        vi.mocked(global.fetch).mockImplementation((url: any) => {
            if (url.includes("alt=media")) {
                return Promise.resolve({ ok: true, blob: async () => new Blob(["test"]) } as any);
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({ name: "document.pdf", mimeType: "application/pdf", size: 1024 }),
            } as any);
        });

        const mockSupabase = {
            from: vi.fn(() => ({
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: "intake-123" }, error: null }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                projectId: "project-123",
                userId: "user-123",
                accessToken: "token-123",
                fileIds: ["file-1"],
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should return 400 for missing fields", async () => {
        const request = createMockRequest({
            method: "POST",
            body: { projectId: "project-123" },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("Missing required fields");
    });
});

describe("GET /api/intake/google-drive", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.GOOGLE_DRIVE_CLIENT_ID = "client-123";
        process.env.GOOGLE_DRIVE_REDIRECT_URI = "http://localhost:3000/callback";
    });

    it("should return auth URL", async () => {
        const request = createMockRequest({ url: "http://localhost:3000/api/intake/google-drive?action=auth" });

        const response = await GET(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.authUrl).toContain("accounts.google.com");
    });

    it("should return 500 when not configured", async () => {
        delete process.env.GOOGLE_DRIVE_CLIENT_ID;

        const request = createMockRequest({ url: "http://localhost:3000/api/intake/google-drive?action=auth" });

        const response = await GET(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(500);
        expect(data.error).toBe("Google Drive not configured");
    });
});
