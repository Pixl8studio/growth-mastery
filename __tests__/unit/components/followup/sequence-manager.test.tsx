/**
 * SequenceManager Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SequenceManager } from "@/components/followup/sequence-manager";

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

describe("SequenceManager", () => {
    const mockProps = {
        funnelProjectId: "funnel-123",
        offerId: "offer-456",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render without crashing", () => {
        render(<SequenceManager {...mockProps} />);

        expect(screen.getByText("AI Follow-Up Sequences")).toBeInTheDocument();
    });

    it("should display description text", () => {
        render(<SequenceManager {...mockProps} />);

        expect(
            screen.getByText(
                "Automatically generate personalized message sequences based on your deck and offer"
            )
        ).toBeInTheDocument();
    });

    it("should show helpful onboarding text", () => {
        render(<SequenceManager {...mockProps} />);

        expect(screen.getByText("Generate Your First Sequence")).toBeInTheDocument();
        expect(
            screen.getByText(/Our AI will analyze your webinar deck/)
        ).toBeInTheDocument();
    });

    it("should disable buttons when no offer is provided", () => {
        render(<SequenceManager funnelProjectId="funnel-123" />);

        const aiButton = screen.getByRole("button", {
            name: /generate ai-powered sequence/i,
        });
        const defaultButton = screen.getByRole("button", {
            name: /use default templates/i,
        });

        expect(aiButton).toBeDisabled();
        expect(defaultButton).toBeDisabled();
    });

    it("should show warning when offer is missing", () => {
        render(<SequenceManager funnelProjectId="funnel-123" />);

        expect(
            screen.getByText("Please complete the offer configuration step first")
        ).toBeInTheDocument();
    });
});
