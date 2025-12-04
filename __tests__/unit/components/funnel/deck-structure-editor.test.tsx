/**
 * DeckStructureEditor Component Tests
 * Tests deck slide editing with sections and save functionality
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DeckStructureEditor } from "@/components/funnel/deck-structure-editor";
import { logger } from "@/lib/client-logger";

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

    it("should enable edit mode when edit button clicked", () => {
        render(<DeckStructureEditor {...defaultProps} />);

        const editButtons = screen.getAllByRole("button", { name: /Edit/i });
        fireEvent.click(editButtons[0]);

        expect(screen.getByLabelText("Slide Title")).toBeInTheDocument();
        expect(screen.getByLabelText("Slide Description")).toBeInTheDocument();
    });

    it("should allow editing slide title", () => {
        render(<DeckStructureEditor {...defaultProps} />);

        const editButtons = screen.getAllByRole("button", { name: /Edit/i });
        fireEvent.click(editButtons[0]);

        const titleInput = screen.getByLabelText("Slide Title");
        fireEvent.change(titleInput, { target: { value: "New Title" } });

        expect(titleInput).toHaveValue("New Title");
    });

    it("should allow editing slide description", () => {
        render(<DeckStructureEditor {...defaultProps} />);

        const editButtons = screen.getAllByRole("button", { name: /Edit/i });
        fireEvent.click(editButtons[0]);

        const descriptionInput = screen.getByLabelText("Slide Description");
        fireEvent.change(descriptionInput, {
            target: { value: "New description" },
        });

        expect(descriptionInput).toHaveValue("New description");
    });

    it("should exit edit mode when done clicked", () => {
        render(<DeckStructureEditor {...defaultProps} />);

        const editButtons = screen.getAllByRole("button", { name: /Edit/i });
        fireEvent.click(editButtons[0]);

        const doneButton = screen.getByRole("button", { name: /Done/i });
        fireEvent.click(doneButton);

        expect(screen.queryByLabelText("Slide Title")).not.toBeInTheDocument();
    });

    it("should call onSave with updated slides", async () => {
        mockOnSave.mockResolvedValueOnce(undefined);

        render(<DeckStructureEditor {...defaultProps} />);

        const editButtons = screen.getAllByRole("button", { name: /Edit/i });
        fireEvent.click(editButtons[0]);

        const titleInput = screen.getByLabelText("Slide Title");
        fireEvent.change(titleInput, { target: { value: "Updated Title" } });

        const saveButton = screen.getByRole("button", { name: /Save Changes/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        slideNumber: 1,
                        title: "Updated Title",
                    }),
                ])
            );
            expect(logger.info).toHaveBeenCalled();
        });
    });

    it("should handle save error", async () => {
        mockOnSave.mockRejectedValueOnce(new Error("Save failed"));

        // Mock window.alert
        const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});

        render(<DeckStructureEditor {...defaultProps} />);

        const saveButton = screen.getByRole("button", { name: /Save Changes/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(logger.error).toHaveBeenCalled();
            expect(alertMock).toHaveBeenCalledWith(
                "Failed to save changes. Please try again."
            );
        });

        alertMock.mockRestore();
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

    it("should cancel editing when cancel button clicked", () => {
        render(<DeckStructureEditor {...defaultProps} />);

        const editButtons = screen.getAllByRole("button", { name: /Edit/i });
        fireEvent.click(editButtons[0]);

        const titleInput = screen.getByLabelText("Slide Title");
        fireEvent.change(titleInput, { target: { value: "Changed" } });

        const cancelButton = screen.getByRole("button", { name: /Cancel Edit/i });
        fireEvent.click(cancelButton);

        expect(screen.queryByLabelText("Slide Title")).not.toBeInTheDocument();
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
