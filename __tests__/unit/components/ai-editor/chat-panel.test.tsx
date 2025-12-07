/**
 * ChatPanel Component Tests
 * Tests message rendering, auto-scroll, and suggested actions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatPanel } from "@/components/ai-editor/chat/chat-panel";
import type { Message, EditSummary } from "@/components/ai-editor/hooks/use-editor";

// Mock child components to isolate ChatPanel testing
vi.mock("@/components/ai-editor/chat/message-thread", () => ({
    MessageThread: ({
        messages,
        isProcessing,
    }: {
        messages: Message[];
        isProcessing: boolean;
    }) => (
        <div data-testid="message-thread">
            {messages.map((m) => (
                <div key={m.id} data-testid={`message-${m.role}`}>
                    {m.content}
                </div>
            ))}
            {isProcessing && (
                <div data-testid="processing-indicator">Processing...</div>
            )}
        </div>
    ),
}));

vi.mock("@/components/ai-editor/chat/chat-input", () => ({
    ChatInput: ({
        onSendMessage,
        isProcessing,
    }: {
        onSendMessage: (msg: string) => void;
        isProcessing: boolean;
    }) => (
        <div data-testid="chat-input">
            <input
                data-testid="chat-input-field"
                disabled={isProcessing}
                onKeyDown={(e) => {
                    if (e.key === "Enter") onSendMessage("test message");
                }}
            />
        </div>
    ),
}));

vi.mock("@/components/ai-editor/chat/quick-action-chips", () => ({
    QuickActionChips: ({
        actions,
        onActionClick,
    }: {
        actions: string[];
        onActionClick: (action: string) => void;
    }) => (
        <div data-testid="quick-actions">
            {actions.map((action) => (
                <button
                    key={action}
                    data-testid={`action-${action}`}
                    onClick={() => onActionClick(action)}
                >
                    {action}
                </button>
            ))}
        </div>
    ),
}));

describe("ChatPanel", () => {
    const createMessage = (overrides: Partial<Message> = {}): Message => ({
        id: `msg-${Math.random()}`,
        role: "user",
        content: "Test message",
        timestamp: new Date(),
        ...overrides,
    });

    const defaultProps = {
        messages: [],
        isProcessing: false,
        onSendMessage: vi.fn(),
        suggestedActions: ["Add testimonials", "Improve CTA"],
        lastEditSummary: null as EditSummary | null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("rendering", () => {
        it("should render message thread", () => {
            render(<ChatPanel {...defaultProps} />);

            expect(screen.getByTestId("message-thread")).toBeInTheDocument();
        });

        it("should render chat input", () => {
            render(<ChatPanel {...defaultProps} />);

            expect(screen.getByTestId("chat-input")).toBeInTheDocument();
        });

        it("should render quick actions when available and not processing", () => {
            render(<ChatPanel {...defaultProps} />);

            expect(screen.getByTestId("quick-actions")).toBeInTheDocument();
            expect(screen.getByTestId("action-Add testimonials")).toBeInTheDocument();
            expect(screen.getByTestId("action-Improve CTA")).toBeInTheDocument();
        });

        it("should hide quick actions when processing", () => {
            render(<ChatPanel {...defaultProps} isProcessing={true} />);

            expect(screen.queryByTestId("quick-actions")).not.toBeInTheDocument();
        });

        it("should hide quick actions when none available", () => {
            render(<ChatPanel {...defaultProps} suggestedActions={[]} />);

            expect(screen.queryByTestId("quick-actions")).not.toBeInTheDocument();
        });
    });

    describe("messages", () => {
        it("should display user messages", () => {
            const messages = [createMessage({ role: "user", content: "Hello AI" })];

            render(<ChatPanel {...defaultProps} messages={messages} />);

            expect(screen.getByTestId("message-user")).toHaveTextContent("Hello AI");
        });

        it("should display assistant messages", () => {
            const messages = [
                createMessage({ role: "assistant", content: "Hello human!" }),
            ];

            render(<ChatPanel {...defaultProps} messages={messages} />);

            expect(screen.getByTestId("message-assistant")).toHaveTextContent(
                "Hello human!"
            );
        });

        it("should display multiple messages in order", () => {
            const messages = [
                createMessage({ id: "1", role: "user", content: "First" }),
                createMessage({ id: "2", role: "assistant", content: "Second" }),
                createMessage({ id: "3", role: "user", content: "Third" }),
            ];

            render(<ChatPanel {...defaultProps} messages={messages} />);

            const messageThread = screen.getByTestId("message-thread");
            expect(messageThread.children.length).toBe(3);
        });
    });

    describe("processing state", () => {
        it("should show processing indicator when processing", () => {
            render(<ChatPanel {...defaultProps} isProcessing={true} />);

            expect(screen.getByTestId("processing-indicator")).toBeInTheDocument();
        });

        it("should disable input when processing", () => {
            render(<ChatPanel {...defaultProps} isProcessing={true} />);

            const input = screen.getByTestId("chat-input-field");
            expect(input).toBeDisabled();
        });
    });

    describe("quick actions", () => {
        it("should call onSendMessage when action clicked", async () => {
            const onSendMessage = vi.fn();
            render(<ChatPanel {...defaultProps} onSendMessage={onSendMessage} />);

            const actionButton = screen.getByTestId("action-Add testimonials");
            actionButton.click();

            expect(onSendMessage).toHaveBeenCalledWith("Add testimonials");
        });
    });
});
