/**
 * Auto-Generate All API Integration Tests
 * Tests the POST /api/generate/auto-generate-all endpoint
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/generate/auto-generate-all/route";
import { NextRequest } from "next/server";

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

// Mock orchestrator
vi.mock("@/lib/generators/auto-generation-orchestrator", () => ({
    generateAllFromIntake: vi.fn(),
    regenerateAllFromIntake: vi.fn(),
}));

// Mock logger
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

describe("POST /api/generate/auto-generate-all", () => {
    const mockUserId = "user-123";
    const mockProjectId = "project-123e4567-e89b-12d3-a456-426614174000";
    const mockIntakeId = "intake-123e4567-e89b-12d3-a456-426614174000";

    const mockProject = {
        id: mockProjectId,
        user_id: mockUserId,
        name: "Test Project",
        auto_generation_status: {
            is_generating: false,
        },
    };

    const mockIntake = {
        id: mockIntakeId,
        funnel_project_id: mockProjectId,
        user_id: mockUserId,
        transcript_text: "Sample intake transcript",
        call_status: "completed",
        intake_method: "vapi",
        session_name: "Initial Intake",
        created_at: new Date().toISOString(),
        metadata: {},
    };

    const mockGenerationResult = {
        success: true,
        completedSteps: [1, 2, 3],
        failedSteps: [],
        progress: [
            {
                step: 1,
                stepName: "Generate Offer",
                status: "completed" as const,
                completedAt: new Date().toISOString(),
            },
            {
                step: 2,
                stepName: "Generate Deck",
                status: "completed" as const,
                completedAt: new Date().toISOString(),
            },
        ],
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should generate all content successfully from intake", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        const { generateAllFromIntake } = await import(
            "@/lib/generators/auto-generation-orchestrator"
        );

        const mockSupabase = {
            auth: {
                getUser: vi.fn(() =>
                    Promise.resolve({
                        data: { user: { id: mockUserId, email: "test@example.com" } },
                        error: null,
                    })
                ),
            },
            from: vi.fn((table: string) => {
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn((fields: string) => {
                            if (fields === "id") {
                                return {
                                    eq: vi.fn(() => ({
                                        eq: vi.fn(() => ({
                                            single: vi.fn(() =>
                                                Promise.resolve({
                                                    data: mockProject,
                                                    error: null,
                                                })
                                            ),
                                        })),
                                    })),
                                };
                            }
                            if (fields === "auto_generation_status") {
                                return {
                                    eq: vi.fn(() => ({
                                        single: vi.fn(() =>
                                            Promise.resolve({
                                                data: mockProject,
                                                error: null,
                                            })
                                        ),
                                    })),
                                };
                            }
                            return {};
                        }),
                    };
                }
                if (table === "vapi_transcripts") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    eq: vi.fn(() => ({
                                        order: vi.fn(() =>
                                            Promise.resolve({
                                                data: [mockIntake],
                                                error: null,
                                            })
                                        ),
                                    })),
                                })),
                            })),
                        })),
                    };
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(generateAllFromIntake).mockResolvedValue(mockGenerationResult);

        const request = new NextRequest(
            "http://localhost/api/generate/auto-generate-all",
            {
                method: "POST",
                body: JSON.stringify({
                    projectId: mockProjectId,
                    regenerate: false,
                }),
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.completedSteps).toHaveLength(3);
        expect(data.failedSteps).toHaveLength(0);
        expect(generateAllFromIntake).toHaveBeenCalled();
    });

    it("should regenerate all content when regenerate flag is true", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        const { regenerateAllFromIntake } = await import(
            "@/lib/generators/auto-generation-orchestrator"
        );

        const mockSupabase = {
            auth: {
                getUser: vi.fn(() =>
                    Promise.resolve({
                        data: { user: { id: mockUserId } },
                        error: null,
                    })
                ),
            },
            from: vi.fn((table: string) => {
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn((fields: string) => {
                            if (fields === "id") {
                                return {
                                    eq: vi.fn(() => ({
                                        eq: vi.fn(() => ({
                                            single: vi.fn(() =>
                                                Promise.resolve({
                                                    data: mockProject,
                                                    error: null,
                                                })
                                            ),
                                        })),
                                    })),
                                };
                            }
                            if (fields === "auto_generation_status") {
                                return {
                                    eq: vi.fn(() => ({
                                        single: vi.fn(() =>
                                            Promise.resolve({
                                                data: mockProject,
                                                error: null,
                                            })
                                        ),
                                    })),
                                };
                            }
                            return {};
                        }),
                    };
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(regenerateAllFromIntake).mockResolvedValue(mockGenerationResult);

        const request = new NextRequest(
            "http://localhost/api/generate/auto-generate-all",
            {
                method: "POST",
                body: JSON.stringify({
                    projectId: mockProjectId,
                    regenerate: true,
                }),
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(regenerateAllFromIntake).toHaveBeenCalledWith(mockProjectId, mockUserId);
    });

    it("should return 401 for unauthenticated users", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const mockSupabase = {
            auth: {
                getUser: vi.fn(() =>
                    Promise.resolve({
                        data: { user: null },
                        error: null,
                    })
                ),
            },
            from: vi.fn(),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = new NextRequest(
            "http://localhost/api/generate/auto-generate-all",
            {
                method: "POST",
                body: JSON.stringify({
                    projectId: mockProjectId,
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(401);
    });

    it("should return 400 for missing projectId", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const mockSupabase = {
            auth: {
                getUser: vi.fn(() =>
                    Promise.resolve({
                        data: { user: { id: mockUserId } },
                        error: null,
                    })
                ),
            },
            from: vi.fn(),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = new NextRequest(
            "http://localhost/api/generate/auto-generate-all",
            {
                method: "POST",
                body: JSON.stringify({}),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe("projectId is required");
    });

    it("should return 400 when project not found", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const mockSupabase = {
            auth: {
                getUser: vi.fn(() =>
                    Promise.resolve({
                        data: { user: { id: mockUserId } },
                        error: null,
                    })
                ),
            },
            from: vi.fn((table: string) => {
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: null,
                                            error: { message: "Not found" },
                                        })
                                    ),
                                })),
                            })),
                        })),
                    };
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = new NextRequest(
            "http://localhost/api/generate/auto-generate-all",
            {
                method: "POST",
                body: JSON.stringify({
                    projectId: mockProjectId,
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe("Project not found or access denied");
    });

    it("should return 409 when generation already in progress", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const mockSupabase = {
            auth: {
                getUser: vi.fn(() =>
                    Promise.resolve({
                        data: { user: { id: mockUserId } },
                        error: null,
                    })
                ),
            },
            from: vi.fn((table: string) => {
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn((fields: string) => {
                            if (fields === "id") {
                                return {
                                    eq: vi.fn(() => ({
                                        eq: vi.fn(() => ({
                                            single: vi.fn(() =>
                                                Promise.resolve({
                                                    data: mockProject,
                                                    error: null,
                                                })
                                            ),
                                        })),
                                    })),
                                };
                            }
                            if (fields === "auto_generation_status") {
                                return {
                                    eq: vi.fn(() => ({
                                        single: vi.fn(() =>
                                            Promise.resolve({
                                                data: {
                                                    ...mockProject,
                                                    auto_generation_status: {
                                                        is_generating: true,
                                                    },
                                                },
                                                error: null,
                                            })
                                        ),
                                    })),
                                };
                            }
                            return {};
                        }),
                    };
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = new NextRequest(
            "http://localhost/api/generate/auto-generate-all",
            {
                method: "POST",
                body: JSON.stringify({
                    projectId: mockProjectId,
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(409);
        const data = await response.json();
        expect(data.error).toBe("Generation already in progress");
    });

    it("should return 400 when no intake records found", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const mockSupabase = {
            auth: {
                getUser: vi.fn(() =>
                    Promise.resolve({
                        data: { user: { id: mockUserId } },
                        error: null,
                    })
                ),
            },
            from: vi.fn((table: string) => {
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn((fields: string) => {
                            if (fields === "id") {
                                return {
                                    eq: vi.fn(() => ({
                                        eq: vi.fn(() => ({
                                            single: vi.fn(() =>
                                                Promise.resolve({
                                                    data: mockProject,
                                                    error: null,
                                                })
                                            ),
                                        })),
                                    })),
                                };
                            }
                            if (fields === "auto_generation_status") {
                                return {
                                    eq: vi.fn(() => ({
                                        single: vi.fn(() =>
                                            Promise.resolve({
                                                data: mockProject,
                                                error: null,
                                            })
                                        ),
                                    })),
                                };
                            }
                            return {};
                        }),
                    };
                }
                if (table === "vapi_transcripts") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    eq: vi.fn(() => ({
                                        order: vi.fn(() =>
                                            Promise.resolve({
                                                data: [],
                                                error: null,
                                            })
                                        ),
                                    })),
                                })),
                            })),
                        })),
                    };
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = new NextRequest(
            "http://localhost/api/generate/auto-generate-all",
            {
                method: "POST",
                body: JSON.stringify({
                    projectId: mockProjectId,
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toContain("No intake records found");
    });

    it("should handle partial generation failures and return failed steps", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        const { generateAllFromIntake } = await import(
            "@/lib/generators/auto-generation-orchestrator"
        );

        const mockSupabase = {
            auth: {
                getUser: vi.fn(() =>
                    Promise.resolve({
                        data: { user: { id: mockUserId } },
                        error: null,
                    })
                ),
            },
            from: vi.fn((table: string) => {
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn((fields: string) => {
                            if (fields === "id") {
                                return {
                                    eq: vi.fn(() => ({
                                        eq: vi.fn(() => ({
                                            single: vi.fn(() =>
                                                Promise.resolve({
                                                    data: mockProject,
                                                    error: null,
                                                })
                                            ),
                                        })),
                                    })),
                                };
                            }
                            if (fields === "auto_generation_status") {
                                return {
                                    eq: vi.fn(() => ({
                                        single: vi.fn(() =>
                                            Promise.resolve({
                                                data: mockProject,
                                                error: null,
                                            })
                                        ),
                                    })),
                                };
                            }
                            return {};
                        }),
                    };
                }
                if (table === "vapi_transcripts") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    eq: vi.fn(() => ({
                                        order: vi.fn(() =>
                                            Promise.resolve({
                                                data: [mockIntake],
                                                error: null,
                                            })
                                        ),
                                    })),
                                })),
                            })),
                        })),
                    };
                }
                return {};
            }),
        };

        const partialResult = {
            success: false,
            completedSteps: [1, 2],
            failedSteps: [{ step: 3, error: "AI generation failed" }],
            progress: [
                {
                    step: 1,
                    stepName: "Generate Offer",
                    status: "completed" as const,
                    completedAt: new Date().toISOString(),
                },
                {
                    step: 2,
                    stepName: "Generate Deck",
                    status: "completed" as const,
                    completedAt: new Date().toISOString(),
                },
                {
                    step: 3,
                    stepName: "Generate Copy",
                    status: "failed" as const,
                    error: "AI generation failed",
                },
            ],
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(generateAllFromIntake).mockResolvedValue(partialResult);

        const request = new NextRequest(
            "http://localhost/api/generate/auto-generate-all",
            {
                method: "POST",
                body: JSON.stringify({
                    projectId: mockProjectId,
                }),
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(false);
        expect(data.completedSteps).toHaveLength(2);
        expect(data.failedSteps).toHaveLength(1);
    });

    it("should return 500 when orchestrator throws error", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        const { generateAllFromIntake } = await import(
            "@/lib/generators/auto-generation-orchestrator"
        );

        const mockSupabase = {
            auth: {
                getUser: vi.fn(() =>
                    Promise.resolve({
                        data: { user: { id: mockUserId } },
                        error: null,
                    })
                ),
            },
            from: vi.fn((table: string) => {
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn((fields: string) => {
                            if (fields === "id") {
                                return {
                                    eq: vi.fn(() => ({
                                        eq: vi.fn(() => ({
                                            single: vi.fn(() =>
                                                Promise.resolve({
                                                    data: mockProject,
                                                    error: null,
                                                })
                                            ),
                                        })),
                                    })),
                                };
                            }
                            if (fields === "auto_generation_status") {
                                return {
                                    eq: vi.fn(() => ({
                                        single: vi.fn(() =>
                                            Promise.resolve({
                                                data: mockProject,
                                                error: null,
                                            })
                                        ),
                                    })),
                                };
                            }
                            return {};
                        }),
                    };
                }
                if (table === "vapi_transcripts") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    eq: vi.fn(() => ({
                                        order: vi.fn(() =>
                                            Promise.resolve({
                                                data: [mockIntake],
                                                error: null,
                                            })
                                        ),
                                    })),
                                })),
                            })),
                        })),
                    };
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(generateAllFromIntake).mockRejectedValue(
            new Error("Critical orchestrator error")
        );

        const request = new NextRequest(
            "http://localhost/api/generate/auto-generate-all",
            {
                method: "POST",
                body: JSON.stringify({
                    projectId: mockProjectId,
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.error).toContain("Failed to generate content");
    });
});
