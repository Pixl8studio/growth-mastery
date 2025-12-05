/**
 * AdvancedAIAssistant Component Tests
 * Tests AI assistant functionality, context awareness, and message handling
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdvancedAIAssistant } from "@/components/support/advanced-ai-assistant";

// Mock dependencies
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock("@/lib/ai-assistant/page-context", () => ({
    usePageContext: () => ({
        context: {
            pageName: "Test Page",
            step: 2,
            businessContext: { projectId: "test-project-123" },
            forms: [],
            actions: [],
        },
        getFormattedContext: () => "Test formatted context",
    }),
}));

vi.mock("@/lib/ai-assistant/business-context", () => ({
    loadBusinessContext: vi.fn().mockResolvedValue({
        success: true,
        context: {
            currentProject: { name: "Test Project" },
        },
    }),
    formatBusinessContextForPrompt: vi.fn().mockReturnValue("Test business context"),
}));

vi.mock("@/lib/ai-assistant/action-executor", () => ({
    fillFormField: vi.fn(),
    parseActionIntents: vi.fn().mockReturnValue([]),
    executePageAction: vi.fn(),
}));

vi.mock("react-markdown", () => ({
    default: ({ children }: any) => <div data-testid="markdown">{children}</div>,
}));

describe("AdvancedAIAssistant", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it("should render floating button", () => {
        render(<AdvancedAIAssistant />);

        const button = screen.getByLabelText("AI Assistant");
        expect(button).toBeInTheDocument();
    });

    it("should open chat panel when button clicked", async () => {
        render(<AdvancedAIAssistant />);

        const button = screen.getByLabelText("AI Assistant");
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByText("Genie AI Assistant")).toBeInTheDocument();
        });
    });

    it("should start chat session on open", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ threadId: "thread-123" }),
        });

        render(<AdvancedAIAssistant />);

        const button = screen.getByLabelText("AI Assistant");
        fireEvent.click(button);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/support/chat/thread",
                expect.objectContaining({
                    method: "POST",
                })
            );
        });
    });

    it("should display welcome message with context", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ threadId: "thread-123" }),
        });

        render(<AdvancedAIAssistant />);

        const button = screen.getByLabelText("AI Assistant");
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByText(/Hi! I'm your Genie AI assistant/i)).toBeInTheDocument();
        });
    });

    it("should display progress bar when on a step", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ threadId: "thread-123" }),
        });

        render(<AdvancedAIAssistant />);

        const button = screen.getByLabelText("AI Assistant");
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByText("Funnel Progress")).toBeInTheDocument();
            expect(screen.getByText("Step 2 of 13")).toBeInTheDocument();
        });
    });

    it("should send message to assistant", async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({
                json: async () => ({ threadId: "thread-123" }),
            })
            .mockResolvedValueOnce({
                json: async () => ({ response: "Test response" }),
            });

        render(<AdvancedAIAssistant />);

        const button = screen.getByLabelText("AI Assistant");
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByPlaceholderText("Ask me anything...")).toBeInTheDocument();
        });

        const input = screen.getByPlaceholderText("Ask me anything...");
        fireEvent.change(input, { target: { value: "Test message" } });

        const sendButton = screen.getByRole("button", { name: "" });
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/support/chat/message",
                expect.objectContaining({
                    method: "POST",
                })
            );
        });
    });

    it("should handle keyboard enter key for sending messages", async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({
                json: async () => ({ threadId: "thread-123" }),
            })
            .mockResolvedValueOnce({
                json: async () => ({ response: "Test response" }),
            });

        render(<AdvancedAIAssistant />);

        const button = screen.getByLabelText("AI Assistant");
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByPlaceholderText("Ask me anything...")).toBeInTheDocument();
        });

        const input = screen.getByPlaceholderText("Ask me anything...");
        fireEvent.change(input, { target: { value: "Test message" } });
        fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/support/chat/message",
                expect.objectContaining({
                    method: "POST",
                })
            );
        });
    });

    it("should toggle expand/collapse", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ threadId: "thread-123" }),
        });

        render(<AdvancedAIAssistant />);

        const button = screen.getByLabelText("AI Assistant");
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByTitle("Collapse")).toBeInTheDocument();
        });

        const toggleButton = screen.getByTitle("Collapse");
        fireEvent.click(toggleButton);

        await waitFor(() => {
            expect(screen.getByTitle("Expand")).toBeInTheDocument();
        });
    });

    it("should close chat panel", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ threadId: "thread-123" }),
        });

        render(<AdvancedAIAssistant />);

        const openButton = screen.getByLabelText("AI Assistant");
        fireEvent.click(openButton);

        await waitFor(() => {
            expect(screen.getByText("Genie AI Assistant")).toBeInTheDocument();
        });

        const closeButtons = screen.getAllByRole("button");
        const closeButton = closeButtons.find((btn) =>
            btn.querySelector("svg")
        );
        if (closeButton) {
            fireEvent.click(closeButton);
        }

        await waitFor(() => {
            expect(screen.queryByText("Genie AI Assistant")).not.toBeInTheDocument();
        });
    });

    it("should handle error when starting chat", async () => {
        (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

        const { logger } = require("@/lib/client-logger");

        render(<AdvancedAIAssistant />);

        const button = screen.getByLabelText("AI Assistant");
        fireEvent.click(button);

        await waitFor(() => {
            expect(logger.error).toHaveBeenCalled();
        });
    });

    it("should show loading state when sending message", async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({
                json: async () => ({ threadId: "thread-123" }),
            })
            .mockImplementationOnce(
                () =>
                    new Promise((resolve) =>
                        setTimeout(
                            () => resolve({ json: async () => ({ response: "Test response" }) }),
                            100
                        )
                    )
            );

        render(<AdvancedAIAssistant />);

        const button = screen.getByLabelText("AI Assistant");
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByPlaceholderText("Ask me anything...")).toBeInTheDocument();
        });

        const input = screen.getByPlaceholderText("Ask me anything...");
        fireEvent.change(input, { target: { value: "Test message" } });

        const sendButton = screen.getByRole("button", { name: "" });
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(screen.getByText("Thinking...")).toBeInTheDocument();
        });
    });
});
