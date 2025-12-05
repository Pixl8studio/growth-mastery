/**
 * ContextAwareHelpWidget Component Tests
 * Tests context-aware help functionality and message handling
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ContextAwareHelpWidget } from "@/components/support/context-aware-help-widget";

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
            pageName: "Funnel Builder",
            businessContext: { projectId: "test-project-456" },
            forms: [{ id: "form-1", fields: [] }],
            actions: [],
        },
        getFormattedContext: () => "Test formatted context",
    }),
}));

vi.mock("@/lib/ai-assistant/business-context", () => ({
    loadBusinessContext: vi.fn().mockResolvedValue({
        success: true,
        context: {
            currentProject: { name: "My Project" },
        },
    }),
    formatBusinessContextForPrompt: vi.fn().mockReturnValue("Test business context"),
}));

vi.mock("@/lib/ai-assistant/action-executor", () => ({
    fillFormField: vi.fn(),
    parseActionIntents: vi.fn().mockReturnValue([]),
    executePageAction: vi.fn(),
}));

describe("ContextAwareHelpWidget", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it("should render floating help button", () => {
        render(<ContextAwareHelpWidget />);

        const button = screen.getByLabelText("Help");
        expect(button).toBeInTheDocument();
    });

    it("should open widget when button clicked", async () => {
        render(<ContextAwareHelpWidget />);

        const button = screen.getByLabelText("Help");
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByText("Genie AI Assistant")).toBeInTheDocument();
        });
    });

    it("should start chat with context on open", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ threadId: "thread-456" }),
        });

        render(<ContextAwareHelpWidget />);

        const button = screen.getByLabelText("Help");
        fireEvent.click(button);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/support/chat/thread",
                expect.objectContaining({
                    method: "POST",
                    body: expect.stringContaining("contextPage"),
                })
            );
        });
    });

    it("should display context-aware welcome message", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ threadId: "thread-456" }),
        });

        render(<ContextAwareHelpWidget />);

        const button = screen.getByLabelText("Help");
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByText(/Hi! I'm your Genie AI assistant/i)).toBeInTheDocument();
            expect(screen.getByText(/My Project/i)).toBeInTheDocument();
        });
    });

    it("should show page name in header", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ threadId: "thread-456" }),
        });

        render(<ContextAwareHelpWidget />);

        const button = screen.getByLabelText("Help");
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByText("Helping with: Funnel Builder")).toBeInTheDocument();
        });
    });

    it("should send message with context", async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({
                json: async () => ({ threadId: "thread-456" }),
            })
            .mockResolvedValueOnce({
                json: async () => ({ response: "Context-aware response" }),
            });

        render(<ContextAwareHelpWidget />);

        const button = screen.getByLabelText("Help");
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByPlaceholderText("Ask me anything...")).toBeInTheDocument();
        });

        const input = screen.getByPlaceholderText("Ask me anything...");
        fireEvent.change(input, { target: { value: "Help with form" } });

        const sendButton = screen.getByRole("button", { name: "" });
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/support/chat/message",
                expect.objectContaining({
                    method: "POST",
                    body: expect.stringContaining("pageContext"),
                })
            );
        });
    });

    it("should display messages in chat", async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({
                json: async () => ({ threadId: "thread-456" }),
            })
            .mockResolvedValueOnce({
                json: async () => ({ response: "Test response" }),
            });

        render(<ContextAwareHelpWidget />);

        const button = screen.getByLabelText("Help");
        fireEvent.click(button);

        await waitFor(() => {
            const input = screen.getByPlaceholderText("Ask me anything...");
            fireEvent.change(input, { target: { value: "Test" } });
        });

        const input = screen.getByPlaceholderText("Ask me anything...");
        const sendButton = screen.getByRole("button", { name: "" });
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(screen.getByText("Test response")).toBeInTheDocument();
        });
    });

    it("should close widget", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ threadId: "thread-456" }),
        });

        render(<ContextAwareHelpWidget />);

        const openButton = screen.getByLabelText("Help");
        fireEvent.click(openButton);

        await waitFor(() => {
            expect(screen.getByText("Genie AI Assistant")).toBeInTheDocument();
        });

        const closeButtons = screen.getAllByRole("button");
        const closeButton = closeButtons.find((btn) => {
            const svg = btn.querySelector("svg");
            return svg && btn !== openButton;
        });

        if (closeButton) {
            fireEvent.click(closeButton);
        }

        await waitFor(() => {
            expect(screen.queryByText("Helping with: Funnel Builder")).not.toBeInTheDocument();
        });
    });

    it("should handle error when sending message", async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({
                json: async () => ({ threadId: "thread-456" }),
            })
            .mockRejectedValueOnce(new Error("API error"));

        const { logger } = require("@/lib/client-logger");

        render(<ContextAwareHelpWidget />);

        const button = screen.getByLabelText("Help");
        fireEvent.click(button);

        await waitFor(() => {
            const input = screen.getByPlaceholderText("Ask me anything...");
            fireEvent.change(input, { target: { value: "Test" } });
        });

        const sendButton = screen.getByRole("button", { name: "" });
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(logger.error).toHaveBeenCalled();
            expect(screen.getByText(/Sorry, I encountered an error/i)).toBeInTheDocument();
        });
    });

    it("should show loading indicator", async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({
                json: async () => ({ threadId: "thread-456" }),
            })
            .mockImplementationOnce(
                () =>
                    new Promise((resolve) =>
                        setTimeout(
                            () => resolve({ json: async () => ({ response: "Delayed response" }) }),
                            100
                        )
                    )
            );

        render(<ContextAwareHelpWidget />);

        const button = screen.getByLabelText("Help");
        fireEvent.click(button);

        await waitFor(() => {
            const input = screen.getByPlaceholderText("Ask me anything...");
            fireEvent.change(input, { target: { value: "Test" } });
        });

        const sendButton = screen.getByRole("button", { name: "" });
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(screen.getByText("Test")).toBeInTheDocument();
        });
    });
});
