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
    const mockTemplate = {
        id: "template-1",
        sequence_id: "seq-1",
        channel: "email" as const,
        subject: "Test Subject",
        body: "Test message body with {{first_name}}",
        sequence_position: 1,
        delay_hours: 24,
    };

    const mockOnSave = vi.fn().mockResolvedValue(undefined);
    const mockOnDelete = vi.fn().mockResolvedValue(undefined);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render without crashing", () => {
        render(<MessageTemplateEditor template={mockTemplate} onSave={mockOnSave} />);
        expect(screen.getByText("Edit Message Template")).toBeInTheDocument();
    });

    it("should display subject input for email", () => {
        render(<MessageTemplateEditor template={mockTemplate} onSave={mockOnSave} />);
        const subjectInput = screen.getByLabelText("Subject Line");
        expect(subjectInput).toHaveValue("Test Subject");
    });

    it("should display message body textarea", () => {
        render(<MessageTemplateEditor template={mockTemplate} onSave={mockOnSave} />);
        const bodyTextarea = screen.getByLabelText("Message Body");
        expect(bodyTextarea).toHaveValue("Test message body with {{first_name}}");
    });

    it("should display channel selector", () => {
        render(<MessageTemplateEditor template={mockTemplate} onSave={mockOnSave} />);
        expect(screen.getByLabelText("Channel")).toBeInTheDocument();
    });

    it("should display delay hours input", () => {
        render(<MessageTemplateEditor template={mockTemplate} onSave={mockOnSave} />);
        const delayInput = screen.getByLabelText("Delay (hours)");
        expect(delayInput).toHaveValue(24);
    });

    it("should handle subject change", () => {
        render(<MessageTemplateEditor template={mockTemplate} onSave={mockOnSave} />);
        const subjectInput = screen.getByLabelText("Subject Line");
        fireEvent.change(subjectInput, { target: { value: "New Subject" } });
        expect(subjectInput).toHaveValue("New Subject");
    });

    it("should handle body change", () => {
        render(<MessageTemplateEditor template={mockTemplate} onSave={mockOnSave} />);
        const bodyTextarea = screen.getByLabelText("Message Body");
        fireEvent.change(bodyTextarea, { target: { value: "New body text" } });
        expect(bodyTextarea).toHaveValue("New body text");
    });

    it("should call onSave when save button is clicked", async () => {
        render(<MessageTemplateEditor template={mockTemplate} onSave={mockOnSave} />);

        const saveButton = screen.getByText("Save Changes");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalled();
        });
    });

    it("should call onDelete when delete button is clicked", async () => {
        render(
            <MessageTemplateEditor
                template={mockTemplate}
                onSave={mockOnSave}
                onDelete={mockOnDelete}
            />
        );

        const deleteButton = screen.getByText("Delete");
        fireEvent.click(deleteButton);

        await waitFor(() => {
            expect(mockOnDelete).toHaveBeenCalled();
        });
    });

    it("should hide subject field for SMS channel", () => {
        const smsTemplate = {
            ...mockTemplate,
            channel: "sms" as const,
        };

        render(<MessageTemplateEditor template={smsTemplate} onSave={mockOnSave} />);
        expect(screen.queryByLabelText("Subject Line")).not.toBeInTheDocument();
    });

    it("should display merge tags helper", () => {
        render(<MessageTemplateEditor template={mockTemplate} onSave={mockOnSave} />);
        expect(screen.getByText("Available merge tags:")).toBeInTheDocument();
        expect(screen.getByText("{{first_name}}")).toBeInTheDocument();
        expect(screen.getByText("{{email}}")).toBeInTheDocument();
        expect(screen.getByText("{{watch_percentage}}")).toBeInTheDocument();
    });

    it("should insert merge tag when clicked", () => {
        render(<MessageTemplateEditor template={mockTemplate} onSave={mockOnSave} />);

        const bodyTextarea = screen.getByLabelText("Message Body");
        fireEvent.change(bodyTextarea, { target: { value: "" } });

        const firstNameTag = screen.getByText("{{first_name}}");
        fireEvent.click(firstNameTag);

        expect(bodyTextarea).toHaveValue("{{first_name}}");
    });

    it("should disable save button when saving", async () => {
        const slowSave = vi.fn(
            () => new Promise((resolve) => setTimeout(resolve, 100))
        );

        render(<MessageTemplateEditor template={mockTemplate} onSave={slowSave} />);

        const saveButton = screen.getByText("Save Changes");
        fireEvent.click(saveButton);

        expect(screen.getByText("Saving...")).toBeInTheDocument();
        expect(screen.getByText("Saving...")).toBeDisabled();
    });

    it("should validate required fields", async () => {
        render(<MessageTemplateEditor template={mockTemplate} onSave={mockOnSave} />);

        const bodyTextarea = screen.getByLabelText("Message Body");
        fireEvent.change(bodyTextarea, { target: { value: "" } });

        const saveButton = screen.getByText("Save Changes");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockOnSave).not.toHaveBeenCalled();
        });
    });

    it("should update delay hours", () => {
        render(<MessageTemplateEditor template={mockTemplate} onSave={mockOnSave} />);

        const delayInput = screen.getByLabelText("Delay (hours)");
        fireEvent.change(delayInput, { target: { value: "48" } });
        expect(delayInput).toHaveValue(48);
    });

    it("should display sequence position", () => {
        render(<MessageTemplateEditor template={mockTemplate} onSave={mockOnSave} />);
        expect(screen.getByText("Position #1")).toBeInTheDocument();
    });

    it("should show character count for message body", () => {
        render(<MessageTemplateEditor template={mockTemplate} onSave={mockOnSave} />);
        // Body is "Test message body with {{first_name}}" - 37 characters
        expect(screen.getByText(/37 characters/)).toBeInTheDocument();
    });

    it("should handle channel switch", () => {
        render(<MessageTemplateEditor template={mockTemplate} onSave={mockOnSave} />);

        const channelSelect = screen.getByLabelText("Channel");
        fireEvent.change(channelSelect, { target: { value: "sms" } });

        expect(screen.queryByLabelText("Subject Line")).not.toBeInTheDocument();
    });

    it("should display preview button", () => {
        render(<MessageTemplateEditor template={mockTemplate} onSave={mockOnSave} />);
        expect(screen.getByText("Preview")).toBeInTheDocument();
    });

    it("should create new template when template is null", () => {
        render(
            <MessageTemplateEditor
                template={null}
                onSave={mockOnSave}
                sequenceId="seq-1"
            />
        );
        expect(screen.getByText("Create Message Template")).toBeInTheDocument();
    });

    it("should initialize with defaults for new template", () => {
        render(
            <MessageTemplateEditor
                template={null}
                onSave={mockOnSave}
                sequenceId="seq-1"
            />
        );

        const channelSelect = screen.getByLabelText("Channel");
        expect(channelSelect).toHaveValue("email");
    });
});
