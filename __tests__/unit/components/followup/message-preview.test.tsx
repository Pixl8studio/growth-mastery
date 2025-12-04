/**
 * MessagePreview Component Tests
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessagePreview } from "@/components/followup/message-preview";

describe("MessagePreview", () => {
    const mockMessage = {
        id: "msg-1",
        subject: "Quick question about your goals",
        body: "Hi {{first_name}},\n\nI noticed you watched {{watch_percentage}}% of the webinar...",
        channel: "email" as const,
        sequence_position: 1,
    };

    const mockProspect = {
        first_name: "John",
        email: "john@example.com",
        watch_percentage: 75,
        segment: "hot",
        intent_score: 85,
    };

    it("should render without crashing", () => {
        render(<MessagePreview message={mockMessage} prospect={mockProspect} />);
        expect(screen.getByText(/Quick question about your goals/)).toBeInTheDocument();
    });

    it("should display email subject", () => {
        render(<MessagePreview message={mockMessage} prospect={mockProspect} />);
        expect(screen.getByText("Quick question about your goals")).toBeInTheDocument();
    });

    it("should personalize message with prospect data", () => {
        render(<MessagePreview message={mockMessage} prospect={mockProspect} />);
        expect(screen.getByText(/I noticed you watched 75% of the webinar/)).toBeInTheDocument();
    });

    it("should display channel badge", () => {
        render(<MessagePreview message={mockMessage} prospect={mockProspect} />);
        expect(screen.getByText("Email")).toBeInTheDocument();
    });

    it("should display sequence position", () => {
        render(<MessagePreview message={mockMessage} prospect={mockProspect} />);
        expect(screen.getByText("Touch #1")).toBeInTheDocument();
    });

    it("should handle SMS channel", () => {
        const smsMessage = {
            ...mockMessage,
            channel: "sms" as const,
            subject: "",
        };

        render(<MessagePreview message={smsMessage} prospect={mockProspect} />);
        expect(screen.getByText("SMS")).toBeInTheDocument();
    });

    it("should not display subject line for SMS", () => {
        const smsMessage = {
            ...mockMessage,
            channel: "sms" as const,
            subject: "",
        };

        render(<MessagePreview message={smsMessage} prospect={mockProspect} />);
        expect(screen.queryByText("Subject:")).not.toBeInTheDocument();
    });

    it("should preserve line breaks in message body", () => {
        const multilineMessage = {
            ...mockMessage,
            body: "Line 1\n\nLine 2\n\nLine 3",
        };

        render(<MessagePreview message={multilineMessage} prospect={mockProspect} />);
        const body = screen.getByText(/Line 1/);
        expect(body).toBeInTheDocument();
    });

    it("should handle missing prospect data gracefully", () => {
        const incompleteProspect = {
            first_name: "",
            email: "test@example.com",
            watch_percentage: 0,
            segment: "no_show",
            intent_score: 0,
        };

        render(<MessagePreview message={mockMessage} prospect={incompleteProspect} />);
        expect(screen.getByText(/Quick question about your goals/)).toBeInTheDocument();
    });

    it("should replace {{first_name}} placeholder", () => {
        render(<MessagePreview message={mockMessage} prospect={mockProspect} />);
        expect(screen.getByText(/John/)).toBeInTheDocument();
        expect(screen.queryByText(/{{first_name}}/)).not.toBeInTheDocument();
    });

    it("should replace {{watch_percentage}} placeholder", () => {
        render(<MessagePreview message={mockMessage} prospect={mockProspect} />);
        expect(screen.getByText(/75%/)).toBeInTheDocument();
    });

    it("should display From section for email", () => {
        render(<MessagePreview message={mockMessage} prospect={mockProspect} />);
        expect(screen.getByText(/From:/)).toBeInTheDocument();
    });

    it("should display To section with prospect email", () => {
        render(<MessagePreview message={mockMessage} prospect={mockProspect} />);
        expect(screen.getByText(/To:/)).toBeInTheDocument();
        expect(screen.getByText(/john@example.com/)).toBeInTheDocument();
    });

    it("should show message preview header", () => {
        render(<MessagePreview message={mockMessage} prospect={mockProspect} />);
        expect(screen.getByText("Message Preview")).toBeInTheDocument();
    });

    it("should apply proper styling to email preview", () => {
        const { container } = render(
            <MessagePreview message={mockMessage} prospect={mockProspect} />
        );
        const previewContainer = container.querySelector(".border");
        expect(previewContainer).toBeInTheDocument();
    });

    it("should handle long message bodies", () => {
        const longMessage = {
            ...mockMessage,
            body: "A".repeat(1000),
        };

        render(<MessagePreview message={longMessage} prospect={mockProspect} />);
        expect(screen.getByText(/AAA/)).toBeInTheDocument();
    });

    it("should display sequence position badge", () => {
        const message3 = {
            ...mockMessage,
            sequence_position: 3,
        };

        render(<MessagePreview message={message3} prospect={mockProspect} />);
        expect(screen.getByText("Touch #3")).toBeInTheDocument();
    });

    it("should render with minimal message data", () => {
        const minimalMessage = {
            id: "min-1",
            subject: "",
            body: "Simple message",
            channel: "email" as const,
            sequence_position: 1,
        };

        render(<MessagePreview message={minimalMessage} prospect={mockProspect} />);
        expect(screen.getByText("Simple message")).toBeInTheDocument();
    });
});
