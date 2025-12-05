/**
 * IntakeMethodSelector Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IntakeMethodSelector } from "@/components/intake/intake-method-selector";

describe("IntakeMethodSelector", () => {
    const mockOnSelectMethod = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render title and description", () => {
        render(<IntakeMethodSelector onSelectMethod={mockOnSelectMethod} />);

        expect(screen.getByText("Choose Your Intake Method")).toBeInTheDocument();
        expect(
            screen.getByText(/Select how you'd like to provide your business information/)
        ).toBeInTheDocument();
    });

    it("should render all intake method options", () => {
        render(<IntakeMethodSelector onSelectMethod={mockOnSelectMethod} />);

        expect(screen.getByText("Voice Call")).toBeInTheDocument();
        expect(screen.getByText("Upload Documents")).toBeInTheDocument();
        expect(screen.getByText("Paste Content")).toBeInTheDocument();
        expect(screen.getByText("Scrape Website")).toBeInTheDocument();
        expect(screen.getByText("Connect Google Drive")).toBeInTheDocument();
    });

    it("should render method descriptions", () => {
        render(<IntakeMethodSelector onSelectMethod={mockOnSelectMethod} />);

        expect(
            screen.getByText(/Have a natural 15-20 minute conversation/)
        ).toBeInTheDocument();
        expect(
            screen.getByText(/Upload PDFs, Word docs, or text files/)
        ).toBeInTheDocument();
        expect(
            screen.getByText(/Paste text from existing documents/)
        ).toBeInTheDocument();
        expect(
            screen.getByText(/Import content from your existing enrollment/)
        ).toBeInTheDocument();
        expect(
            screen.getByText(/Import documents directly from your Google Drive/)
        ).toBeInTheDocument();
    });

    it("should call onSelectMethod when voice is clicked", () => {
        render(<IntakeMethodSelector onSelectMethod={mockOnSelectMethod} />);

        const voiceOption = screen.getByText("Voice Call").closest("div");
        fireEvent.click(voiceOption!);

        expect(mockOnSelectMethod).toHaveBeenCalledWith("voice");
    });

    it("should call onSelectMethod when upload is clicked", () => {
        render(<IntakeMethodSelector onSelectMethod={mockOnSelectMethod} />);

        const uploadOption = screen.getByText("Upload Documents").closest("div");
        fireEvent.click(uploadOption!);

        expect(mockOnSelectMethod).toHaveBeenCalledWith("upload");
    });

    it("should call onSelectMethod when paste is clicked", () => {
        render(<IntakeMethodSelector onSelectMethod={mockOnSelectMethod} />);

        const pasteOption = screen.getByText("Paste Content").closest("div");
        fireEvent.click(pasteOption!);

        expect(mockOnSelectMethod).toHaveBeenCalledWith("paste");
    });

    it("should call onSelectMethod when scrape is clicked", () => {
        render(<IntakeMethodSelector onSelectMethod={mockOnSelectMethod} />);

        const scrapeOption = screen.getByText("Scrape Website").closest("div");
        fireEvent.click(scrapeOption!);

        expect(mockOnSelectMethod).toHaveBeenCalledWith("scrape");
    });

    it("should not call onSelectMethod for coming soon methods", () => {
        render(<IntakeMethodSelector onSelectMethod={mockOnSelectMethod} />);

        const googleDriveOption = screen.getByText("Connect Google Drive").closest("div");
        fireEvent.click(googleDriveOption!);

        expect(mockOnSelectMethod).not.toHaveBeenCalled();
    });

    it("should show 'Coming Soon' badge for Google Drive", () => {
        render(<IntakeMethodSelector onSelectMethod={mockOnSelectMethod} />);

        expect(screen.getByText("Soon")).toBeInTheDocument();
        expect(screen.getByText("Coming Soon")).toBeInTheDocument();
    });

    it("should highlight selected method", () => {
        render(
            <IntakeMethodSelector
                onSelectMethod={mockOnSelectMethod}
                selectedMethod="voice"
            />
        );

        const voiceCard = screen.getByText("Voice Call").closest("div");
        expect(voiceCard).toHaveClass("border-primary");
    });

    it("should not highlight unselected methods", () => {
        render(
            <IntakeMethodSelector
                onSelectMethod={mockOnSelectMethod}
                selectedMethod="voice"
            />
        );

        const uploadCard = screen.getByText("Upload Documents").closest("div");
        expect(uploadCard).not.toHaveClass("border-primary");
    });

    it("should apply disabled styling to coming soon methods", () => {
        render(<IntakeMethodSelector onSelectMethod={mockOnSelectMethod} />);

        const googleDriveCard = screen
            .getByText("Connect Google Drive")
            .closest("div");
        expect(googleDriveCard).toHaveClass("cursor-not-allowed");
        expect(googleDriveCard).toHaveClass("opacity-60");
    });

    it("should apply hover styling to active methods", () => {
        render(<IntakeMethodSelector onSelectMethod={mockOnSelectMethod} />);

        const voiceCard = screen.getByText("Voice Call").closest("div");
        expect(voiceCard).toHaveClass("cursor-pointer");
        expect(voiceCard).toHaveClass("hover:shadow-lg");
    });

    it("should render icons for each method", () => {
        render(<IntakeMethodSelector onSelectMethod={mockOnSelectMethod} />);

        const icons = document.querySelectorAll("svg");
        expect(icons.length).toBeGreaterThanOrEqual(5);
    });

    it("should show colored icons for each method", () => {
        render(<IntakeMethodSelector onSelectMethod={mockOnSelectMethod} />);

        const voiceIcon = screen.getByText("Voice Call").previousElementSibling?.querySelector("svg");
        expect(voiceIcon).toHaveClass("text-primary");

        const uploadIcon = screen.getByText("Upload Documents").previousElementSibling?.querySelector("svg");
        expect(uploadIcon).toHaveClass("text-purple-600");

        const pasteIcon = screen.getByText("Paste Content").previousElementSibling?.querySelector("svg");
        expect(pasteIcon).toHaveClass("text-green-600");

        const scrapeIcon = screen.getByText("Scrape Website").previousElementSibling?.querySelector("svg");
        expect(scrapeIcon).toHaveClass("text-orange-600");

        const driveIcon = screen.getByText("Connect Google Drive").previousElementSibling?.querySelector("svg");
        expect(driveIcon).toHaveClass("text-red-600");
    });

    it("should use grid layout", () => {
        const { container } = render(
            <IntakeMethodSelector onSelectMethod={mockOnSelectMethod} />
        );

        const grid = container.querySelector(".grid");
        expect(grid).toBeInTheDocument();
        expect(grid).toHaveClass("grid-cols-1");
        expect(grid).toHaveClass("md:grid-cols-2");
        expect(grid).toHaveClass("lg:grid-cols-3");
    });

    it("should render all methods as cards", () => {
        render(<IntakeMethodSelector onSelectMethod={mockOnSelectMethod} />);

        const cards = screen.getAllByRole("generic").filter((el) =>
            el.className.includes("p-6")
        );
        expect(cards.length).toBeGreaterThanOrEqual(5);
    });

    it("should allow re-selecting the same method", () => {
        render(
            <IntakeMethodSelector
                onSelectMethod={mockOnSelectMethod}
                selectedMethod="voice"
            />
        );

        const voiceOption = screen.getByText("Voice Call").closest("div");
        fireEvent.click(voiceOption!);

        expect(mockOnSelectMethod).toHaveBeenCalledWith("voice");
    });
});
