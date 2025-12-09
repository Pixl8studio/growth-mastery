/**
 * useEditor Hook Tests
 * Tests AI editor state management, message handling, undo, and save functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEditor } from "@/components/ai-editor/hooks/use-editor";

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
    addBreadcrumb: vi.fn(),
    startSpan: vi.fn((options, callback) =>
        callback({
            setAttribute: vi.fn(),
            setStatus: vi.fn(),
        })
    ),
    captureException: vi.fn(),
}));

// Mock client logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useEditor", () => {
    const defaultOptions = {
        pageId: "test-page-123",
        projectId: "test-project-456",
        pageType: "registration" as const,
        initialHtml: "<h1>Initial Content</h1>",
        initialTitle: "Test Page",
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockFetch.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("initialization", () => {
        it("should initialize with default values", () => {
            const { result } = renderHook(() => useEditor(defaultOptions));

            expect(result.current.html).toBe(defaultOptions.initialHtml);
            expect(result.current.title).toBe(defaultOptions.initialTitle);
            expect(result.current.status).toBe("draft");
            expect(result.current.version).toBe(1);
            expect(result.current.messages).toEqual([]);
            expect(result.current.isProcessing).toBe(false);
            expect(result.current.canUndo).toBe(false);
        });

        it("should have default suggested actions", () => {
            const { result } = renderHook(() => useEditor(defaultOptions));

            expect(result.current.suggestedActions).toEqual([
                "Make the headline more compelling",
                "Add social proof",
                "Improve the CTA button",
            ]);
        });
    });

    describe("sendMessage", () => {
        it("should add user message and set processing state", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    explanation: "Done!",
                    updatedHtml: "<h1>Updated</h1>",
                    edits: [],
                    suggestedActions: [],
                }),
            });

            const { result } = renderHook(() => useEditor(defaultOptions));

            await act(async () => {
                await result.current.sendMessage("Make the title bigger");
            });

            // User message should be added
            expect(result.current.messages.length).toBe(2); // user + assistant
            expect(result.current.messages[0].role).toBe("user");
            expect(result.current.messages[0].content).toBe("Make the title bigger");
        });

        it("should update HTML on successful response", async () => {
            const newHtml = "<h1>New Updated Content</h1>";

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    explanation: "Updated the title",
                    updatedHtml: newHtml,
                    edits: [{ type: "text", description: "Changed title" }],
                    suggestedActions: ["Add more content"],
                }),
            });

            const { result } = renderHook(() => useEditor(defaultOptions));

            await act(async () => {
                await result.current.sendMessage("Update the title");
            });

            expect(result.current.html).toBe(newHtml);
            expect(result.current.version).toBe(2);
        });

        it("should handle API errors gracefully", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: async () => "Internal Server Error",
            });

            const { result } = renderHook(() => useEditor(defaultOptions));

            await act(async () => {
                await result.current.sendMessage("This will fail");
            });

            // Should add error message to chat
            const lastMessage =
                result.current.messages[result.current.messages.length - 1];
            expect(lastMessage.role).toBe("assistant");
            expect(lastMessage.content).toContain("error");
            expect(result.current.isProcessing).toBe(false);
        });

        it("should not send empty messages", async () => {
            const { result } = renderHook(() => useEditor(defaultOptions));

            // Attempting to send empty message should throw ValidationError
            await expect(async () => {
                await act(async () => {
                    await result.current.sendMessage("   ");
                });
            }).rejects.toThrow("Message content cannot be empty");

            expect(mockFetch).not.toHaveBeenCalled();
        });

        it("should update suggested actions from response", async () => {
            const newSuggestions = ["Add testimonials", "Improve CTA"];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    explanation: "Done",
                    updatedHtml: "<h1>Updated</h1>",
                    edits: [],
                    suggestedActions: newSuggestions,
                }),
            });

            const { result } = renderHook(() => useEditor(defaultOptions));

            await act(async () => {
                await result.current.sendMessage("Update page");
            });

            expect(result.current.suggestedActions).toEqual(newSuggestions);
        });

        it("should track edit summary", async () => {
            // API returns editsApplied count, not full edits array
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    response: "Made changes",
                    updatedHtml: "<h1>Updated</h1>",
                    editsApplied: 2,
                    suggestions: [],
                }),
            });

            const { result } = renderHook(() => useEditor(defaultOptions));

            await act(async () => {
                await result.current.sendMessage("Make changes");
            });

            expect(result.current.lastEditSummary).toBeTruthy();
            expect(result.current.lastEditSummary?.timestamp).toBeDefined();
            // API no longer returns full edit details, just count
            expect(result.current.lastEditSummary?.edits).toEqual([]);
        });
    });

    describe("undo functionality", () => {
        it("should allow undo after edit", async () => {
            const originalHtml = defaultOptions.initialHtml;
            const updatedHtml = "<h1>After Edit</h1>";

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    explanation: "Done",
                    updatedHtml,
                    edits: [],
                    suggestedActions: [],
                }),
            });

            const { result } = renderHook(() => useEditor(defaultOptions));

            // Initially cannot undo
            expect(result.current.canUndo).toBe(false);

            await act(async () => {
                await result.current.sendMessage("Make a change");
            });

            // After edit, should be able to undo
            expect(result.current.html).toBe(updatedHtml);
            expect(result.current.canUndo).toBe(true);

            // Perform undo
            act(() => {
                result.current.undo();
            });

            expect(result.current.html).toBe(originalHtml);
            expect(result.current.canUndo).toBe(false);
        });

        it("should not undo when at initial state", () => {
            const { result } = renderHook(() => useEditor(defaultOptions));

            expect(result.current.canUndo).toBe(false);

            // Calling undo should not change anything
            act(() => {
                result.current.undo();
            });

            expect(result.current.html).toBe(defaultOptions.initialHtml);
        });
    });

    describe("save functionality", () => {
        it("should save page successfully", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true }),
            });

            const { result } = renderHook(() => useEditor(defaultOptions));

            await act(async () => {
                await result.current.save();
            });

            expect(mockFetch).toHaveBeenCalledWith(
                `/api/ai-editor/pages/${defaultOptions.pageId}`,
                expect.objectContaining({
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                })
            );
            expect(result.current.status).toBe("draft");
        });

        it("should handle save errors", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: async () => "Save failed",
            });

            const { result } = renderHook(() => useEditor(defaultOptions));

            await expect(async () => {
                await act(async () => {
                    await result.current.save();
                });
            }).rejects.toThrow();

            expect(result.current.status).toBe("draft");
        });

        it("should set status to saving during save", async () => {
            let resolvePromise: (value: any) => void;
            const savePromise = new Promise((resolve) => {
                resolvePromise = resolve;
            });

            mockFetch.mockImplementationOnce(() => savePromise);

            const { result } = renderHook(() => useEditor(defaultOptions));

            // Start save
            act(() => {
                result.current.save().catch(() => {});
            });

            // Should be saving
            expect(result.current.status).toBe("saving");

            // Complete the save
            await act(async () => {
                resolvePromise!({
                    ok: true,
                    json: async () => ({ success: true }),
                });
            });
        });
    });

    describe("title management", () => {
        it("should update title", () => {
            const { result } = renderHook(() => useEditor(defaultOptions));

            act(() => {
                result.current.setTitle("New Title");
            });

            expect(result.current.title).toBe("New Title");
        });
    });

    describe("html management", () => {
        it("should update html directly", () => {
            const { result } = renderHook(() => useEditor(defaultOptions));
            const newHtml = "<div>Direct update</div>";

            act(() => {
                result.current.setHtml(newHtml);
            });

            expect(result.current.html).toBe(newHtml);
        });
    });
});
