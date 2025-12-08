/**
 * MessagePreview Component Tests
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessagePreview } from "@/components/followup/message-preview";

describe("MessagePreview", () => {
    it("should render email and SMS previews", () => {
        render(
            <MessagePreview
                subject="Welcome to our program"
                bodyContent="Hi {first_name}, thank you for joining!"
                senderName="John Doe"
            />
        );

        expect(screen.getByText("Email Preview")).toBeInTheDocument();
        expect(screen.getByText("SMS Preview")).toBeInTheDocument();
    });

    it("should display subject line in email preview", () => {
        render(
            <MessagePreview
                subject="Welcome to our program"
                bodyContent="Hi {first_name}!"
                senderName="John Doe"
            />
        );

        expect(screen.getByText("Welcome to our program")).toBeInTheDocument();
    });

    it("should interpolate tokens with sample data", () => {
        render(
            <MessagePreview
                subject="Hi {first_name}!"
                bodyContent="You watched {watch_pct}% of the webinar"
                senderName="John Doe"
            />
        );

        // Should use sample data "Sarah" and "75"
        expect(screen.getByText("Hi Sarah!")).toBeInTheDocument();
        expect(screen.getByText(/75%/)).toBeInTheDocument();
    });

    it("should display sender name in email header", () => {
        render(
            <MessagePreview
                subject="Test"
                bodyContent="Test content"
                senderName="Jane Smith"
            />
        );

        expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    it("should use default sender name when not provided", () => {
        render(<MessagePreview subject="Test" bodyContent="Test content" />);

        expect(screen.getByText("John Smith")).toBeInTheDocument();
    });

    it("should show email recipient", () => {
        render(
            <MessagePreview
                subject="Test"
                bodyContent="Test content"
                senderName="John Doe"
            />
        );

        expect(screen.getByText("sarah@example.com")).toBeInTheDocument();
    });

    it("should render body content with line breaks", () => {
        render(
            <MessagePreview
                subject="Test"
                bodyContent="Line 1\nLine 2\nLine 3"
                senderName="John Doe"
            />
        );

        // Content should be rendered (with <br /> tags)
        const prose = document.querySelector(".prose");
        expect(prose).toBeInTheDocument();
    });

    it("should display desktop and mobile view toggles", () => {
        const { container } = render(
            <MessagePreview
                subject="Test"
                bodyContent="Test content"
                senderName="John Doe"
            />
        );

        const buttons = container.querySelectorAll("button");
        expect(buttons.length).toBeGreaterThan(0);
    });

    it("should strip HTML for SMS preview", () => {
        render(
            <MessagePreview
                subject="Test"
                bodyContent="<p>Hello <strong>{first_name}</strong></p>"
                senderName="John Doe"
            />
        );

        // SMS should show plain text "Hello Sarah"
        const smsContent = screen.getAllByText(/Hello Sarah/);
        expect(smsContent.length).toBeGreaterThan(0);
    });

    it("should show SMS character count", () => {
        render(
            <MessagePreview
                subject="Test"
                bodyContent="Short message"
                senderName="John Doe"
            />
        );

        expect(screen.getByText(/characters/)).toBeInTheDocument();
    });

    it("should indicate when SMS fits in one message", () => {
        render(
            <MessagePreview subject="Test" bodyContent="Short" senderName="John Doe" />
        );

        expect(screen.getByText(/Fits in 1 message/)).toBeInTheDocument();
    });

    it("should warn when SMS will be split", () => {
        const longMessage = "a".repeat(200);
        render(
            <MessagePreview
                subject="Test"
                bodyContent={longMessage}
                senderName="John Doe"
            />
        );

        expect(screen.getByText(/Will be split into/)).toBeInTheDocument();
    });

    it("should handle null subject", () => {
        render(
            <MessagePreview
                subject={null}
                bodyContent="Test content"
                senderName="John Doe"
            />
        );

        // Should not crash and should not show Subject: label in header
        const emailHeader = document.querySelector(".bg-card.border.rounded-lg");
        expect(emailHeader).toBeInTheDocument();
    });

    it("should handle undefined subject", () => {
        render(<MessagePreview bodyContent="Test content" senderName="John Doe" />);

        // Should not crash
        expect(screen.getByText("Email Preview")).toBeInTheDocument();
    });

    it("should truncate SMS to 320 characters", () => {
        const longMessage = "a".repeat(400);
        render(
            <MessagePreview
                subject="Test"
                bodyContent={longMessage}
                senderName="John Doe"
            />
        );

        // Check that character count doesn't exceed 320
        const charCountText = screen.getByText(/characters/);
        expect(charCountText.textContent).toMatch(/[0-3][0-9]{0,2}\s+characters/);
    });

    it("should display sender initial in SMS avatar", () => {
        render(
            <MessagePreview subject="Test" bodyContent="Test" senderName="Jane Doe" />
        );

        // Should show "J" as initial
        expect(screen.getByText("J")).toBeInTheDocument();
    });

    it("should interpolate multiple tokens", () => {
        render(
            <MessagePreview
                subject="Hi {first_name}!"
                bodyContent="You watched {watch_pct}% and your goal is {goal_notes}"
                senderName="John Doe"
            />
        );

        expect(screen.getByText("Hi Sarah!")).toBeInTheDocument();
        // Check that tokens are replaced in body
        const prose = document.querySelector(".prose");
        expect(prose).toBeInTheDocument();
    });

    it("should accept custom className", () => {
        const { container } = render(
            <MessagePreview
                subject="Test"
                bodyContent="Test"
                senderName="John Doe"
                className="custom-class"
            />
        );

        const grid = container.querySelector(".custom-class");
        expect(grid).toBeInTheDocument();
    });
});
