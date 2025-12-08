/**
 * Integration tests for app/api/admin/referral-codes/route.ts
 * Tests admin referral code management API endpoints
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        child: vi.fn(() => ({
            info: vi.fn(),
            error: vi.fn(),
        })),
    },
}));

// Mock Supabase client
const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
        auth: {
            getUser: mockGetUser,
        },
        from: mockFrom,
    })),
}));

// Import after mocks are set up
const { GET, POST, PATCH } = await import("@/app/api/admin/referral-codes/route");

describe("GET /api/admin/referral-codes", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFrom.mockReturnValue({ select: mockSelect });
        mockSelect.mockReturnValue({ order: mockOrder });
    });

    it("should return referral codes for authenticated user", async () => {
        const mockUser = { id: "user-123", email: "admin@example.com" };
        const mockCodes = [
            {
                id: "code-1",
                code: "WELCOME",
                is_active: true,
                current_uses: 10,
                max_uses: 100,
            },
            {
                id: "code-2",
                code: "PROMO50",
                is_active: true,
                current_uses: 50,
                max_uses: 100,
            },
        ];

        mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
        mockOrder.mockResolvedValue({ data: mockCodes, error: null });

        const request = new NextRequest(
            "http://localhost:3000/api/admin/referral-codes",
            {
                method: "GET",
            }
        );

        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(mockFrom).toHaveBeenCalledWith("referral_codes");
        expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });

        const body = await response.json();
        expect(body).toEqual({ referralCodes: mockCodes });
    });

    it("should return 401 when user is not authenticated", async () => {
        mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

        const request = new NextRequest(
            "http://localhost:3000/api/admin/referral-codes",
            {
                method: "GET",
            }
        );

        const response = await GET(request);

        expect(response.status).toBe(401);

        const body = await response.json();
        expect(body).toEqual({ error: "Authentication required" });
    });

    it("should return 500 when database query fails", async () => {
        const mockUser = { id: "user-123", email: "admin@example.com" };

        mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
        mockOrder.mockResolvedValue({
            data: null,
            error: new Error("Database error"),
        });

        const request = new NextRequest(
            "http://localhost:3000/api/admin/referral-codes",
            {
                method: "GET",
            }
        );

        const response = await GET(request);

        expect(response.status).toBe(500);

        const body = await response.json();
        expect(body).toEqual({ error: "Failed to list referral codes" });
    });
});

describe("POST /api/admin/referral-codes", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFrom.mockReturnValue({ insert: mockInsert });
        mockInsert.mockReturnValue({ select: mockSelect });
        mockSelect.mockReturnValue({ single: mockSingle });
    });

    it("should create referral code successfully", async () => {
        const mockUser = { id: "user-123", email: "admin@example.com" };
        const newCode = {
            id: "code-new",
            code: "NEWCODE",
            description: "Test code",
            max_uses: 50,
            is_active: true,
        };

        mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
        mockSingle.mockResolvedValue({ data: newCode, error: null });

        const request = new NextRequest(
            "http://localhost:3000/api/admin/referral-codes",
            {
                method: "POST",
                body: JSON.stringify({
                    code: "newcode",
                    description: "Test code",
                    max_uses: 50,
                }),
            }
        );

        const response = await POST(request);

        expect(response.status).toBe(201);
        expect(mockInsert).toHaveBeenCalledWith({
            code: "NEWCODE",
            description: "Test code",
            max_uses: 50,
            is_active: true,
        });

        const body = await response.json();
        expect(body).toEqual({ referralCode: newCode });
    });

    it("should return 401 when user is not authenticated", async () => {
        mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

        const request = new NextRequest(
            "http://localhost:3000/api/admin/referral-codes",
            {
                method: "POST",
                body: JSON.stringify({ code: "NEWCODE" }),
            }
        );

        const response = await POST(request);

        expect(response.status).toBe(401);

        const body = await response.json();
        expect(body).toEqual({ error: "Authentication required" });
    });

    it("should return 400 when code is missing", async () => {
        const mockUser = { id: "user-123", email: "admin@example.com" };

        mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

        const request = new NextRequest(
            "http://localhost:3000/api/admin/referral-codes",
            {
                method: "POST",
                body: JSON.stringify({}),
            }
        );

        const response = await POST(request);

        expect(response.status).toBe(400);

        const body = await response.json();
        expect(body).toEqual({ error: "Code is required" });
    });

    it("should return 400 for invalid code format", async () => {
        const mockUser = { id: "user-123", email: "admin@example.com" };

        mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

        const request = new NextRequest(
            "http://localhost:3000/api/admin/referral-codes",
            {
                method: "POST",
                body: JSON.stringify({ code: "invalid-code!" }),
            }
        );

        const response = await POST(request);

        expect(response.status).toBe(400);

        const body = await response.json();
        expect(body).toEqual({
            error: "Code must contain only alphanumeric characters",
        });
    });

    it("should return 400 for code that is too short", async () => {
        const mockUser = { id: "user-123", email: "admin@example.com" };

        mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

        const request = new NextRequest(
            "http://localhost:3000/api/admin/referral-codes",
            {
                method: "POST",
                body: JSON.stringify({ code: "AB" }),
            }
        );

        const response = await POST(request);

        expect(response.status).toBe(400);

        const body = await response.json();
        expect(body).toEqual({ error: "Code must be between 3 and 50 characters" });
    });

    it("should return 400 for code that is too long", async () => {
        const mockUser = { id: "user-123", email: "admin@example.com" };

        mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

        const request = new NextRequest(
            "http://localhost:3000/api/admin/referral-codes",
            {
                method: "POST",
                body: JSON.stringify({ code: "A".repeat(51) }),
            }
        );

        const response = await POST(request);

        expect(response.status).toBe(400);

        const body = await response.json();
        expect(body).toEqual({ error: "Code must be between 3 and 50 characters" });
    });

    it("should return 400 when code already exists", async () => {
        const mockUser = { id: "user-123", email: "admin@example.com" };

        mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
        mockSingle.mockResolvedValue({
            data: null,
            error: { code: "23505" }, // Unique violation
        });

        const request = new NextRequest(
            "http://localhost:3000/api/admin/referral-codes",
            {
                method: "POST",
                body: JSON.stringify({ code: "DUPLICATE" }),
            }
        );

        const response = await POST(request);

        expect(response.status).toBe(400);

        const body = await response.json();
        expect(body).toEqual({ error: "This referral code already exists" });
    });

    it("should trim and uppercase the code", async () => {
        const mockUser = { id: "user-123", email: "admin@example.com" };
        const newCode = {
            id: "code-new",
            code: "TRIMMED",
            is_active: true,
        };

        mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
        mockSingle.mockResolvedValue({ data: newCode, error: null });

        const request = new NextRequest(
            "http://localhost:3000/api/admin/referral-codes",
            {
                method: "POST",
                body: JSON.stringify({ code: "  trimmed  " }),
            }
        );

        const response = await POST(request);

        expect(mockInsert).toHaveBeenCalledWith(
            expect.objectContaining({
                code: "TRIMMED",
            })
        );
        expect(response.status).toBe(201);
    });
});

describe("PATCH /api/admin/referral-codes", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFrom.mockReturnValue({ update: mockUpdate });
        mockUpdate.mockReturnValue({ eq: mockEq });
        mockEq.mockReturnValue({ select: mockSelect });
        mockSelect.mockReturnValue({ single: mockSingle });
    });

    it("should update referral code successfully", async () => {
        const mockUser = { id: "user-123", email: "admin@example.com" };
        const updatedCode = {
            id: "code-123",
            code: "UPDATED",
            is_active: false,
            max_uses: 200,
        };

        mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
        mockSingle.mockResolvedValue({ data: updatedCode, error: null });

        const request = new NextRequest(
            "http://localhost:3000/api/admin/referral-codes",
            {
                method: "PATCH",
                body: JSON.stringify({
                    id: "code-123",
                    is_active: false,
                    max_uses: 200,
                }),
            }
        );

        const response = await PATCH(request);

        expect(response.status).toBe(200);
        expect(mockUpdate).toHaveBeenCalledWith({
            is_active: false,
            max_uses: 200,
        });
        expect(mockEq).toHaveBeenCalledWith("id", "code-123");

        const body = await response.json();
        expect(body).toEqual({ referralCode: updatedCode });
    });

    it("should return 401 when user is not authenticated", async () => {
        mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

        const request = new NextRequest(
            "http://localhost:3000/api/admin/referral-codes",
            {
                method: "PATCH",
                body: JSON.stringify({ id: "code-123", is_active: false }),
            }
        );

        const response = await PATCH(request);

        expect(response.status).toBe(401);

        const body = await response.json();
        expect(body).toEqual({ error: "Authentication required" });
    });

    it("should return 400 when id is missing", async () => {
        const mockUser = { id: "user-123", email: "admin@example.com" };

        mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

        const request = new NextRequest(
            "http://localhost:3000/api/admin/referral-codes",
            {
                method: "PATCH",
                body: JSON.stringify({ is_active: false }),
            }
        );

        const response = await PATCH(request);

        expect(response.status).toBe(400);

        const body = await response.json();
        expect(body).toEqual({ error: "Code ID is required" });
    });

    it("should update only is_active field", async () => {
        const mockUser = { id: "user-123", email: "admin@example.com" };
        const updatedCode = { id: "code-123", is_active: false };

        mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
        mockSingle.mockResolvedValue({ data: updatedCode, error: null });

        const request = new NextRequest(
            "http://localhost:3000/api/admin/referral-codes",
            {
                method: "PATCH",
                body: JSON.stringify({
                    id: "code-123",
                    is_active: false,
                }),
            }
        );

        const response = await PATCH(request);

        expect(mockUpdate).toHaveBeenCalledWith({ is_active: false });
        expect(response.status).toBe(200);
    });

    it("should handle null max_uses", async () => {
        const mockUser = { id: "user-123", email: "admin@example.com" };
        const updatedCode = { id: "code-123", max_uses: null };

        mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
        mockSingle.mockResolvedValue({ data: updatedCode, error: null });

        const request = new NextRequest(
            "http://localhost:3000/api/admin/referral-codes",
            {
                method: "PATCH",
                body: JSON.stringify({
                    id: "code-123",
                    max_uses: null,
                }),
            }
        );

        const response = await PATCH(request);

        expect(mockUpdate).toHaveBeenCalledWith({ max_uses: null });
        expect(response.status).toBe(200);
    });

    it("should return 500 when database update fails", async () => {
        const mockUser = { id: "user-123", email: "admin@example.com" };

        mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
        mockSingle.mockResolvedValue({
            data: null,
            error: new Error("Database error"),
        });

        const request = new NextRequest(
            "http://localhost:3000/api/admin/referral-codes",
            {
                method: "PATCH",
                body: JSON.stringify({
                    id: "code-123",
                    is_active: false,
                }),
            }
        );

        const response = await PATCH(request);

        expect(response.status).toBe(500);

        const body = await response.json();
        expect(body).toEqual({ error: "Failed to update referral code" });
    });
});
