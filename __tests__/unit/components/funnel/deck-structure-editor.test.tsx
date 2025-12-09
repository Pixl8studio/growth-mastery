/**
 * DeckStructureEditor Component Tests
 * Tests deck slide editing with sections and save functionality
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DeckStructureEditor } from "@/components/funnel/deck-structure-editor";

// Mock dependencies
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

describe("DeckStructureEditor", () => {
    const mockOnSave = vi.fn();

    const mockSlides = [
        {
            slideNumber: 1,
            title: "Hook Slide",
            description: "Grab attention immediately",
            section: "hook",
        },
        {
            slideNumber: 2,
            title: "Problem Slide",
            description: "Identify the pain point",
            section: "problem",
        },
        {
            slideNumber: 3,
            title: "Solution Slide",
            description: "Present your solution",
            section: "solution",
        },
    ];

    const defaultProps = {
        initialSlides: mockSlides,
        onSave: mockOnSave,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render all slides", () => {
        render(<DeckStructureEditor {...defaultProps} />);

        expect(screen.getByText("Hook Slide")).toBeInTheDocument();
        expect(screen.getByText("Problem Slide")).toBeInTheDocument();
        expect(screen.getByText("Solution Slide")).toBeInTheDocument();
    });

    it("should display slide numbers", () => {
        render(<DeckStructureEditor {...defaultProps} />);

        expect(screen.getByText("Slide 1")).toBeInTheDocument();
        expect(screen.getByText("Slide 2")).toBeInTheDocument();
        expect(screen.getByText("Slide 3")).toBeInTheDocument();
    });

    it("should group slides by section", () => {
        render(<DeckStructureEditor {...defaultProps} />);

        expect(screen.getByText(/🎣 Hook/)).toBeInTheDocument();
        expect(screen.getByText(/⚠️ Problem/)).toBeInTheDocument();
        expect(screen.getByText(/✅ Solution/)).toBeInTheDocument();
    });

    it("should display slide count per section", () => {
        render(<DeckStructureEditor {...defaultProps} />);

        expect(screen.getByText(/🎣 Hook \(1 slides\)/)).toBeInTheDocument();
        expect(screen.getByText(/⚠️ Problem \(1 slides\)/)).toBeInTheDocument();
    });

    it("should exit edit mode when done clicked", () => {
        render(<DeckStructureEditor {...defaultProps} />);

        const editButtons = screen.getAllByRole("button", { name: /Edit/i });
        fireEvent.click(editButtons[0]);

        const doneButton = screen.getByRole("button", { name: /Done/i });
        fireEvent.click(doneButton);

        expect(screen.queryByLabelText("Slide Title")).not.toBeInTheDocument();
    });

    it("should show saving state", async () => {
        mockOnSave.mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100))
        );

        render(<DeckStructureEditor {...defaultProps} />);

        const saveButton = screen.getByRole("button", { name: /Save Changes/i });
        fireEvent.click(saveButton);

        expect(screen.getByText("Saving...")).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.queryByText("Saving...")).not.toBeInTheDocument();
        });
    });

    it("should display slide count in header", () => {
        render(<DeckStructureEditor {...defaultProps} />);

        expect(screen.getByText(/3 slides/)).toBeInTheDocument();
    });

    it("should indicate edit mode in header", () => {
        render(<DeckStructureEditor {...defaultProps} />);

        expect(screen.getByText(/View mode/)).toBeInTheDocument();

        const editButtons = screen.getAllByRole("button", { name: /Edit/i });
        fireEvent.click(editButtons[0]);

        expect(screen.getByText(/Editing/)).toBeInTheDocument();
    });

    it("should display cancel edit button when editing", () => {
        render(<DeckStructureEditor {...defaultProps} />);

        const editButtons = screen.getAllByRole("button", { name: /Edit/i });
        fireEvent.click(editButtons[0]);

        expect(
            screen.getByRole("button", { name: /Cancel Edit/i })
        ).toBeInTheDocument();
    });

    it("should not render save button in read-only mode", () => {
        render(<DeckStructureEditor {...defaultProps} readOnly={true} />);

        expect(
            screen.queryByRole("button", { name: /Save Changes/i })
        ).not.toBeInTheDocument();
    });

    it("should not render edit buttons in read-only mode", () => {
        render(<DeckStructureEditor {...defaultProps} readOnly={true} />);

        expect(screen.queryByRole("button", { name: /Edit/i })).not.toBeInTheDocument();
    });

    it("should disable save button when no onSave provided", () => {
        render(<DeckStructureEditor initialSlides={mockSlides} />);

        const saveButton = screen.getByRole("button", { name: /Save Changes/i });
        expect(saveButton).toBeDisabled();
    });

    it("should disable save button while saving", async () => {
        mockOnSave.mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100))
        );

        render(<DeckStructureEditor {...defaultProps} />);

        const saveButton = screen.getByRole("button", { name: /Save Changes/i });
        fireEvent.click(saveButton);

        expect(saveButton).toBeDisabled();

        await waitFor(() => {
            expect(saveButton).not.toBeDisabled();
        });
    });
});
