/**
 * MessageTemplateEditor Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MessageTemplateEditor } from "@/components/followup/message-template-editor";

// Mock dependencies
vi.mock("@/components/ui/use-toast", () => ({
    useToast: () => ({
        toast: vi.fn(),
    }),
}));

vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

describe("MessageTemplateEditor", () => {
    const mockMessage = {
        id: "msg-1",
        sequence_id: "seq-1",
        name: "Welcome Email",
        message_order: 1,
        channel: "email" as const,
        send_delay_hours: 24,
        subject_line: "Test Subject",
        body_content: "Test message body with {first_name}",
        primary_cta: {
            text: "Take Action",
            url: "https://example.com",
            tracking_enabled: true,
        },
        ab_test_variant: null,
    };

    const mockSequence = {
        id: "seq-1",
        name: "Test Sequence",
        sequence_type: "engagement",
    };

    const mockOnCreateMessage = vi.fn().mockResolvedValue(undefined);
    const mockOnUpdateMessage = vi.fn().mockResolvedValue(undefined);
    const mockOnDeleteMessage = vi.fn().mockResolvedValue(undefined);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render without crashing", () => {
        render(
            <MessageTemplateEditor
                sequenceId="seq-1"
                messages={[mockMessage]}
                onCreateMessage={mockOnCreateMessage}
                onUpdateMessage={mockOnUpdateMessage}
                onDeleteMessage={mockOnDeleteMessage}
            />
        );
        expect(screen.getByText("Message Templates")).toBeInTheDocument();
    });

    it("should display message in list", () => {
        render(
            <MessageTemplateEditor
                sequenceId="seq-1"
                messages={[mockMessage]}
                onCreateMessage={mockOnCreateMessage}
                onUpdateMessage={mockOnUpdateMessage}
                onDeleteMessage={mockOnDeleteMessage}
            />
        );
        expect(screen.getByText("Welcome Email")).toBeInTheDocument();
        expect(screen.getByText("Test Subject")).toBeInTheDocument();
    });

    it("should show New Message button", () => {
        render(
            <MessageTemplateEditor
                sequenceId="seq-1"
                messages={[]}
                onCreateMessage={mockOnCreateMessage}
                onUpdateMessage={mockOnUpdateMessage}
                onDeleteMessage={mockOnDeleteMessage}
            />
        );
        expect(screen.getByText("New Message")).toBeInTheDocument();
    });

    it("should show create form when New Message is clicked", () => {
        render(
            <MessageTemplateEditor
                sequenceId="seq-1"
                messages={[]}
                onCreateMessage={mockOnCreateMessage}
                onUpdateMessage={mockOnUpdateMessage}
                onDeleteMessage={mockOnDeleteMessage}
            />
        );

        const newButton = screen.getByText("New Message");
        fireEvent.click(newButton);

        expect(screen.getByText("Create Message Template")).toBeInTheDocument();
    });

    it("should show edit form when Edit button is clicked", () => {
        render(
            <MessageTemplateEditor
                sequenceId="seq-1"
                messages={[mockMessage]}
                onCreateMessage={mockOnCreateMessage}
                onUpdateMessage={mockOnUpdateMessage}
                onDeleteMessage={mockOnDeleteMessage}
            />
        );

        const editButton = screen.getByText("Edit");
        fireEvent.click(editButton);

        expect(screen.getByText("Edit Message Template")).toBeInTheDocument();
    });

    it("should populate form fields when editing", () => {
        render(
            <MessageTemplateEditor
                sequenceId="seq-1"
                messages={[mockMessage]}
                onCreateMessage={mockOnCreateMessage}
                onUpdateMessage={mockOnUpdateMessage}
                onDeleteMessage={mockOnDeleteMessage}
            />
        );

        const editButton = screen.getByText("Edit");
        fireEvent.click(editButton);

        const nameInput = screen.getByDisplayValue("Welcome Email");
        expect(nameInput).toBeInTheDocument();

        const subjectInput = screen.getByDisplayValue("Test Subject");
        expect(subjectInput).toBeInTheDocument();
    });

    it("should call onUpdateMessage when saving edits", async () => {
        render(
            <MessageTemplateEditor
                sequenceId="seq-1"
                messages={[mockMessage]}
                onCreateMessage={mockOnCreateMessage}
                onUpdateMessage={mockOnUpdateMessage}
                onDeleteMessage={mockOnDeleteMessage}
            />
        );

        const editButton = screen.getByText("Edit");
        fireEvent.click(editButton);

        const saveButton = screen.getByText("Save Changes");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockOnUpdateMessage).toHaveBeenCalledWith(
                "msg-1",
                expect.any(Object)
            );
        });
    });

    it("should call onCreateMessage when creating new message", async () => {
        render(
            <MessageTemplateEditor
                sequenceId="seq-1"
                messages={[]}
                onCreateMessage={mockOnCreateMessage}
                onUpdateMessage={mockOnUpdateMessage}
                onDeleteMessage={mockOnDeleteMessage}
            />
        );

        const newButton = screen.getByText("New Message");
        fireEvent.click(newButton);

        // Fill in required fields
        const nameInput = screen.getByPlaceholderText("Welcome Email");
        fireEvent.change(nameInput, { target: { value: "Test Message" } });

        const bodyTextarea = screen.getByPlaceholderText(/Hey {first_name}/);
        fireEvent.change(bodyTextarea, { target: { value: "Test body" } });

        const createButton = screen.getByText("Create Message");
        fireEvent.click(createButton);

        await waitFor(() => {
            expect(mockOnCreateMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "Test Message",
                    body_content: "Test body",
                })
            );
        });
    });

    it("should hide subject field for SMS channel", () => {
        const smsMessage = {
            ...mockMessage,
            channel: "sms" as const,
            subject_line: undefined,
        };

        render(
            <MessageTemplateEditor
                sequenceId="seq-1"
                messages={[smsMessage]}
                onCreateMessage={mockOnCreateMessage}
                onUpdateMessage={mockOnUpdateMessage}
                onDeleteMessage={mockOnDeleteMessage}
            />
        );

        const editButton = screen.getByText("Edit");
        fireEvent.click(editButton);

        expect(screen.queryByLabelText("Subject Line")).not.toBeInTheDocument();
    });

    it("should display available tokens section", () => {
        render(
            <MessageTemplateEditor
                sequenceId="seq-1"
                messages={[]}
                onCreateMessage={mockOnCreateMessage}
                onUpdateMessage={mockOnUpdateMessage}
                onDeleteMessage={mockOnDeleteMessage}
            />
        );

        const newButton = screen.getByText("New Message");
        fireEvent.click(newButton);

        expect(screen.getByText("Available Tokens")).toBeInTheDocument();
    });

    it("should show preview button in form", () => {
        render(
            <MessageTemplateEditor
                sequenceId="seq-1"
                messages={[]}
                onCreateMessage={mockOnCreateMessage}
                onUpdateMessage={mockOnUpdateMessage}
                onDeleteMessage={mockOnDeleteMessage}
            />
        );

        const newButton = screen.getByText("New Message");
        fireEvent.click(newButton);

        expect(screen.getByText("Preview")).toBeInTheDocument();
    });

    it("should display message order badge", () => {
        render(
            <MessageTemplateEditor
                sequenceId="seq-1"
                messages={[mockMessage]}
                onCreateMessage={mockOnCreateMessage}
                onUpdateMessage={mockOnUpdateMessage}
                onDeleteMessage={mockOnDeleteMessage}
            />
        );

        expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("should display channel badge for email", () => {
        render(
            <MessageTemplateEditor
                sequenceId="seq-1"
                messages={[mockMessage]}
                onCreateMessage={mockOnCreateMessage}
                onUpdateMessage={mockOnUpdateMessage}
                onDeleteMessage={mockOnDeleteMessage}
            />
        );

        expect(screen.getByText("email")).toBeInTheDocument();
    });

    it("should display delay badge", () => {
        render(
            <MessageTemplateEditor
                sequenceId="seq-1"
                messages={[mockMessage]}
                onCreateMessage={mockOnCreateMessage}
                onUpdateMessage={mockOnUpdateMessage}
                onDeleteMessage={mockOnDeleteMessage}
            />
        );

        expect(screen.getByText("+24h")).toBeInTheDocument();
    });

    it("should show empty state when no messages", () => {
        render(
            <MessageTemplateEditor
                sequenceId="seq-1"
                messages={[]}
                onCreateMessage={mockOnCreateMessage}
                onUpdateMessage={mockOnUpdateMessage}
                onDeleteMessage={mockOnDeleteMessage}
            />
        );

        expect(screen.getByText("No Messages Yet")).toBeInTheDocument();
    });

    it("should show filters when sequences provided", () => {
        render(
            <MessageTemplateEditor
                sequenceId="seq-1"
                messages={[mockMessage]}
                sequences={[mockSequence]}
                onCreateMessage={mockOnCreateMessage}
                onUpdateMessage={mockOnUpdateMessage}
                onDeleteMessage={mockOnDeleteMessage}
            />
        );

        expect(screen.getByText("Sequence:")).toBeInTheDocument();
        expect(screen.getByText("Channel:")).toBeInTheDocument();
    });

    it("should allow canceling edit", () => {
        render(
            <MessageTemplateEditor
                sequenceId="seq-1"
                messages={[mockMessage]}
                onCreateMessage={mockOnCreateMessage}
                onUpdateMessage={mockOnUpdateMessage}
                onDeleteMessage={mockOnDeleteMessage}
            />
        );

        const editButton = screen.getByText("Edit");
        fireEvent.click(editButton);

        expect(screen.getByText("Edit Message Template")).toBeInTheDocument();

        const cancelButton = screen.getByText("Cancel");
        fireEvent.click(cancelButton);

        expect(screen.queryByText("Edit Message Template")).not.toBeInTheDocument();
    });
});
