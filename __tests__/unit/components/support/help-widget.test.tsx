/**
 * HelpWidget Component Tests
 * Tests help menu, chat functionality, and navigation options
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { HelpWidget } from "@/components/support/help-widget";

// Mock dependencies
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

describe("HelpWidget", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
        global.alert = vi.fn();
        window.open = vi.fn();
    });

    it("should render floating button", () => {
        render(<HelpWidget />);

        const button = screen.getByLabelText("Toggle help menu");
        expect(button).toBeInTheDocument();
    });

    it("should open help menu when button clicked", () => {
        render(<HelpWidget />);

        const button = screen.getByLabelText("Toggle help menu");
        fireEvent.click(button);

        expect(screen.getByText("💬 Need help?")).toBeInTheDocument();
    });

    it("should display all menu options", () => {
        render(<HelpWidget />);

        const button = screen.getByLabelText("Toggle help menu");
        fireEvent.click(button);

        expect(screen.getByText("Chat with Genie")).toBeInTheDocument();
        expect(screen.getByText("Talk to Voice AI")).toBeInTheDocument();
        expect(screen.getByText("Open Docs")).toBeInTheDocument();
    });

    it("should start chat when 'Chat with Genie' clicked", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ threadId: "thread-789" }),
        });

        render(<HelpWidget />);

        const button = screen.getByLabelText("Toggle help menu");
        fireEvent.click(button);

        const chatButton = screen.getByText("Chat with Genie");
        fireEvent.click(chatButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/support/chat/thread",
                expect.objectContaining({
                    method: "POST",
                })
            );
        });

        await waitFor(() => {
            expect(screen.getByText("Chat with Genie")).toBeInTheDocument();
            expect(screen.getByText(/Hi! I'm your Genie AI assistant/i)).toBeInTheDocument();
        });
    });

    it("should show voice AI alert", () => {
        render(<HelpWidget />);

        const button = screen.getByLabelText("Toggle help menu");
        fireEvent.click(button);

        const voiceButton = screen.getByText("Talk to Voice AI");
        fireEvent.click(voiceButton);

        expect(global.alert).toHaveBeenCalledWith("Voice help coming soon!");
    });

    it("should open docs in new tab", () => {
        render(<HelpWidget />);

        const button = screen.getByLabelText("Toggle help menu");
        fireEvent.click(button);

        const docsButton = screen.getByText("Open Docs");
        fireEvent.click(docsButton);

        expect(window.open).toHaveBeenCalledWith("/docs", "_blank");
    });

    it("should send message in chat", async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({
                json: async () => ({ threadId: "thread-789" }),
            })
            .mockResolvedValueOnce({
                json: async () => ({ response: "AI response" }),
            });

        render(<HelpWidget />);

        const button = screen.getByLabelText("Toggle help menu");
        fireEvent.click(button);

        const chatButton = screen.getByText("Chat with Genie");
        fireEvent.click(chatButton);

        await waitFor(() => {
            expect(screen.getByPlaceholderText("Type your message...")).toBeInTheDocument();
        });

        const input = screen.getByPlaceholderText("Type your message...");
        fireEvent.change(input, { target: { value: "Test message" } });

        const sendButton = screen.getByRole("button", { name: "" });
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/support/chat/message",
                expect.objectContaining({
                    method: "POST",
                    body: expect.stringContaining("Test message"),
                })
            );
        });
    });

    it("should display user and assistant messages", async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({
                json: async () => ({ threadId: "thread-789" }),
            })
            .mockResolvedValueOnce({
                json: async () => ({ response: "AI response" }),
            });

        render(<HelpWidget />);

        const button = screen.getByLabelText("Toggle help menu");
        fireEvent.click(button);

        const chatButton = screen.getByText("Chat with Genie");
        fireEvent.click(chatButton);

        await waitFor(() => {
            expect(screen.getByPlaceholderText("Type your message...")).toBeInTheDocument();
        });

        const input = screen.getByPlaceholderText("Type your message...");
        fireEvent.change(input, { target: { value: "Hello" } });

        const sendButton = screen.getByRole("button", { name: "" });
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(screen.getByText("Hello")).toBeInTheDocument();
            expect(screen.getByText("AI response")).toBeInTheDocument();
        });
    });

    it("should handle Enter key to send message", async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({
                json: async () => ({ threadId: "thread-789" }),
            })
            .mockResolvedValueOnce({
                json: async () => ({ response: "AI response" }),
            });

        render(<HelpWidget />);

        const button = screen.getByLabelText("Toggle help menu");
        fireEvent.click(button);

        const chatButton = screen.getByText("Chat with Genie");
        fireEvent.click(chatButton);

        await waitFor(() => {
            expect(screen.getByPlaceholderText("Type your message...")).toBeInTheDocument();
        });

        const input = screen.getByPlaceholderText("Type your message...");
        fireEvent.change(input, { target: { value: "Test" } });
        fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/support/chat/message",
                expect.any(Object)
            );
        });
    });

    it("should close chat and return to menu", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ threadId: "thread-789" }),
        });

        render(<HelpWidget />);

        const button = screen.getByLabelText("Toggle help menu");
        fireEvent.click(button);

        const chatButton = screen.getByText("Chat with Genie");
        fireEvent.click(chatButton);

        await waitFor(() => {
            expect(screen.getByLabelText("Close chat")).toBeInTheDocument();
        });

        const closeButton = screen.getByLabelText("Close chat");
        fireEvent.click(closeButton);

        await waitFor(() => {
            expect(screen.getByText("💬 Need help?")).toBeInTheDocument();
        });
    });

    it("should show loading state when sending message", async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({
                json: async () => ({ threadId: "thread-789" }),
            })
            .mockImplementationOnce(
                () =>
                    new Promise((resolve) =>
                        setTimeout(
                            () => resolve({ json: async () => ({ response: "Delayed" }) }),
                            100
                        )
                    )
            );

        render(<HelpWidget />);

        const button = screen.getByLabelText("Toggle help menu");
        fireEvent.click(button);

        const chatButton = screen.getByText("Chat with Genie");
        fireEvent.click(chatButton);

        await waitFor(() => {
            const input = screen.getByPlaceholderText("Type your message...");
            fireEvent.change(input, { target: { value: "Test" } });
        });

        const sendButton = screen.getByRole("button", { name: "" });
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(screen.getByText("Thinking...")).toBeInTheDocument();
        });
    });

    it("should handle error when starting chat", async () => {
        (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

        const { logger } = require("@/lib/client-logger");

        render(<HelpWidget />);

        const button = screen.getByLabelText("Toggle help menu");
        fireEvent.click(button);

        const chatButton = screen.getByText("Chat with Genie");
        fireEvent.click(chatButton);

        await waitFor(() => {
            expect(logger.error).toHaveBeenCalled();
        });
    });
});
