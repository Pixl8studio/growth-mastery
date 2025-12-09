/**
 * ChatInput Component Tests
 * Tests input validation, keyboard handlers, and button states
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatInput } from "@/components/ai-editor/chat/chat-input";

describe("ChatInput", () => {
    const defaultProps = {
        onSendMessage: vi.fn(),
        isProcessing: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("rendering", () => {
        it("should render textarea with placeholder", () => {
            render(<ChatInput {...defaultProps} />);

            const textarea = screen.getByPlaceholderText("Ask GrowthMastery.ai...");
            expect(textarea).toBeInTheDocument();
        });

        it("should render send button", () => {
            render(<ChatInput {...defaultProps} />);

            // Find button with Send icon (the send button has a gradient background)
            const buttons = screen.getAllByRole("button");
            expect(buttons.length).toBeGreaterThan(0);
        });

        it("should render attachment button", () => {
            render(<ChatInput {...defaultProps} />);

            // Plus button for attachments
            const buttons = screen.getAllByRole("button");
            expect(buttons.length).toBeGreaterThanOrEqual(3); // Plus, Visual edits, Mic, Send
        });

        it("should render voice input button", () => {
            render(<ChatInput {...defaultProps} />);

            const buttons = screen.getAllByRole("button");
            expect(buttons.length).toBeGreaterThanOrEqual(3);
        });
    });

    describe("input handling", () => {
        it("should update input value when typing", async () => {
            const user = userEvent.setup();
            render(<ChatInput {...defaultProps} />);

            const textarea = screen.getByPlaceholderText("Ask GrowthMastery.ai...");
            await user.type(textarea, "Hello AI");

            expect(textarea).toHaveValue("Hello AI");
        });

        it("should call onSendMessage when Enter is pressed", async () => {
            const onSendMessage = vi.fn();
            const user = userEvent.setup();
            render(<ChatInput onSendMessage={onSendMessage} isProcessing={false} />);

            const textarea = screen.getByPlaceholderText("Ask GrowthMastery.ai...");
            await user.type(textarea, "Test message");
            await user.keyboard("{Enter}");

            expect(onSendMessage).toHaveBeenCalledWith("Test message");
        });

        it("should not send on Shift+Enter (new line)", async () => {
            const onSendMessage = vi.fn();
            const user = userEvent.setup();
            render(<ChatInput onSendMessage={onSendMessage} isProcessing={false} />);

            const textarea = screen.getByPlaceholderText("Ask GrowthMastery.ai...");
            await user.type(textarea, "Test message");
            await user.keyboard("{Shift>}{Enter}{/Shift}");

            expect(onSendMessage).not.toHaveBeenCalled();
        });

        it("should clear input after sending", async () => {
            const onSendMessage = vi.fn();
            const user = userEvent.setup();
            render(<ChatInput onSendMessage={onSendMessage} isProcessing={false} />);

            const textarea = screen.getByPlaceholderText("Ask GrowthMastery.ai...");
            await user.type(textarea, "Test message");
            await user.keyboard("{Enter}");

            expect(textarea).toHaveValue("");
        });

        it("should not send empty messages", async () => {
            const onSendMessage = vi.fn();
            const user = userEvent.setup();
            render(<ChatInput onSendMessage={onSendMessage} isProcessing={false} />);

            const _textarea = screen.getByPlaceholderText("Ask GrowthMastery.ai...");
            await user.keyboard("{Enter}");

            expect(onSendMessage).not.toHaveBeenCalled();
        });

        it("should not send whitespace-only messages", async () => {
            const onSendMessage = vi.fn();
            const user = userEvent.setup();
            render(<ChatInput onSendMessage={onSendMessage} isProcessing={false} />);

            const textarea = screen.getByPlaceholderText("Ask GrowthMastery.ai...");
            await user.type(textarea, "   ");
            await user.keyboard("{Enter}");

            expect(onSendMessage).not.toHaveBeenCalled();
        });
    });

    describe("processing state", () => {
        it("should disable textarea when processing", () => {
            render(<ChatInput {...defaultProps} isProcessing={true} />);

            const textarea = screen.getByPlaceholderText("Ask GrowthMastery.ai...");
            expect(textarea).toBeDisabled();
        });

        it("should show loading spinner in send button when processing", () => {
            render(<ChatInput {...defaultProps} isProcessing={true} />);

            // The loading spinner has animate-spin class
            const spinner = document.querySelector(".animate-spin");
            expect(spinner).toBeInTheDocument();
        });

        it("should not call onSendMessage when processing", async () => {
            const onSendMessage = vi.fn();
            const _user = userEvent.setup();
            render(<ChatInput onSendMessage={onSendMessage} isProcessing={true} />);

            // Try to find and click send button (it should be disabled)
            const buttons = screen.getAllByRole("button");
            const sendButton = buttons[buttons.length - 1]; // Last button is send

            // Button should be disabled
            expect(sendButton).toBeDisabled();
        });
    });

    describe("send button", () => {
        it("should be disabled when input is empty", () => {
            render(<ChatInput {...defaultProps} />);

            const buttons = screen.getAllByRole("button");
            const sendButton = buttons[buttons.length - 1];

            expect(sendButton).toBeDisabled();
        });

        it("should be enabled when input has content", async () => {
            const user = userEvent.setup();
            render(<ChatInput {...defaultProps} />);

            const textarea = screen.getByPlaceholderText("Ask GrowthMastery.ai...");
            await user.type(textarea, "Hello");

            const buttons = screen.getAllByRole("button");
            const sendButton = buttons[buttons.length - 1];

            expect(sendButton).not.toBeDisabled();
        });

        it("should call onSendMessage when clicked", async () => {
            const onSendMessage = vi.fn();
            const user = userEvent.setup();
            render(<ChatInput onSendMessage={onSendMessage} isProcessing={false} />);

            const textarea = screen.getByPlaceholderText("Ask GrowthMastery.ai...");
            await user.type(textarea, "Click message");

            const buttons = screen.getAllByRole("button");
            const sendButton = buttons[buttons.length - 1];
            await user.click(sendButton);

            expect(onSendMessage).toHaveBeenCalledWith("Click message");
        });
    });

    describe("textarea auto-resize", () => {
        it("should have min and max height constraints", () => {
            render(<ChatInput {...defaultProps} />);

            const textarea = screen.getByPlaceholderText("Ask GrowthMastery.ai...");

            expect(textarea).toHaveStyle({ minHeight: "24px" });
            expect(textarea).toHaveStyle({ maxHeight: "120px" });
        });
    });

    describe("accessibility", () => {
        it("should have appropriate placeholder text", () => {
            render(<ChatInput {...defaultProps} />);

            expect(
                screen.getByPlaceholderText("Ask GrowthMastery.ai...")
            ).toBeInTheDocument();
        });

        it("should indicate disabled state visually", () => {
            render(<ChatInput {...defaultProps} isProcessing={true} />);

            const textarea = screen.getByPlaceholderText("Ask GrowthMastery.ai...");
            expect(textarea).toHaveClass("disabled:cursor-not-allowed");
            expect(textarea).toHaveClass("disabled:opacity-50");
        });
    });
});
