/**
 * ExperimentCreatorModal Component Tests
 * Tests A/B test experiment setup and variant configuration
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExperimentCreatorModal } from "@/components/marketing/experiment-creator-modal";

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

describe("ExperimentCreatorModal", () => {
    const mockOnClose = vi.fn();
    const mockOnExperimentCreated = vi.fn();
    const defaultProps = {
        isOpen: true,
        onClose: mockOnClose,
        funnelProjectId: "test-funnel-123",
        onExperimentCreated: mockOnExperimentCreated,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it("should render correctly when open", () => {
        render(<ExperimentCreatorModal {...defaultProps} />);

        expect(screen.getByText("Create A/B Test Experiment")).toBeInTheDocument();
        expect(screen.getByText("Experiment Configuration")).toBeInTheDocument();
    });

    it("should not render when closed", () => {
        const { container } = render(
            <ExperimentCreatorModal {...defaultProps} isOpen={false} />
        );
        expect(container.firstChild).toBeNull();
    });

    it("should handle experiment name input", () => {
        render(<ExperimentCreatorModal {...defaultProps} />);

        const nameInput = screen.getByPlaceholderText(/e.g., Holiday CTA Test/i);
        fireEvent.change(nameInput, { target: { value: "Test Experiment" } });

        expect(nameInput).toHaveValue("Test Experiment");
    });

    it("should handle experiment hypothesis input", () => {
        render(<ExperimentCreatorModal {...defaultProps} />);

        const hypothesisTextarea = screen.getByPlaceholderText(
            /What do you expect to happen/i
        );
        fireEvent.change(hypothesisTextarea, {
            target: { value: "Shorter CTA will improve CTR" },
        });

        expect(hypothesisTextarea).toHaveValue("Shorter CTA will improve CTR");
    });

    it("should select experiment type", () => {
        render(<ExperimentCreatorModal {...defaultProps} />);

        const typeSelect = screen.getByRole("combobox", { name: /experiment type/i });
        fireEvent.change(typeSelect, { target: { value: "copy_test" } });

        expect(typeSelect).toHaveValue("copy_test");
    });

    it("should allow adding variants", () => {
        render(<ExperimentCreatorModal {...defaultProps} />);

        const addVariantButton = screen.getByText("Add Variant");
        fireEvent.click(addVariantButton);

        expect(screen.getByText("Variant A")).toBeInTheDocument();
    });

    it("should set traffic split percentages", () => {
        render(<ExperimentCreatorModal {...defaultProps} />);

        const splitSlider = screen.getByRole("slider", { name: /traffic split/i });
        fireEvent.change(splitSlider, { target: { value: "60" } });

        expect(screen.getByText("60% / 40%")).toBeInTheDocument();
    });

    it("should set experiment duration", () => {
        render(<ExperimentCreatorModal {...defaultProps} />);

        const durationInput = screen.getByLabelText(/duration \(days\)/i);
        fireEvent.change(durationInput, { target: { value: "14" } });

        expect(durationInput).toHaveValue(14);
    });

    it("should require experiment name before creation", async () => {
        const { toast } = require("@/components/ui/use-toast").useToast();

        render(<ExperimentCreatorModal {...defaultProps} />);

        const createButton = screen.getByText("Create Experiment");
        fireEvent.click(createButton);

        await waitFor(() => {
            expect(toast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Name Required",
                    variant: "destructive",
                })
            );
        });
    });

    it("should require at least 2 variants", async () => {
        const { toast } = require("@/components/ui/use-toast").useToast();

        render(<ExperimentCreatorModal {...defaultProps} />);

        const nameInput = screen.getByPlaceholderText(/e.g., Holiday CTA Test/i);
        fireEvent.change(nameInput, { target: { value: "Test" } });

        const createButton = screen.getByText("Create Experiment");
        fireEvent.click(createButton);

        await waitFor(() => {
            expect(toast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Variants Required",
                    variant: "destructive",
                })
            );
        });
    });

    it("should handle successful experiment creation", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, experiment_id: "exp-123" }),
        });

        const { toast } = require("@/components/ui/use-toast").useToast();

        render(<ExperimentCreatorModal {...defaultProps} />);

        const nameInput = screen.getByPlaceholderText(/e.g., Holiday CTA Test/i);
        fireEvent.change(nameInput, { target: { value: "Test Experiment" } });

        // Add variants
        const addVariantButton = screen.getByText("Add Variant");
        fireEvent.click(addVariantButton);
        fireEvent.click(addVariantButton);

        const createButton = screen.getByText("Create Experiment");
        fireEvent.click(createButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/marketing/experiments"),
                expect.objectContaining({
                    method: "POST",
                })
            );
        });

        await waitFor(() => {
            expect(toast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Experiment Created",
                })
            );
            expect(mockOnExperimentCreated).toHaveBeenCalled();
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    it("should handle creation error", async () => {
        (global.fetch as any).mockRejectedValueOnce(new Error("Creation failed"));

        const { logger } = require("@/lib/client-logger");
        const { toast } = require("@/components/ui/use-toast").useToast();

        render(<ExperimentCreatorModal {...defaultProps} />);

        const nameInput = screen.getByPlaceholderText(/e.g., Holiday CTA Test/i);
        fireEvent.change(nameInput, { target: { value: "Test" } });

        const addVariantButton = screen.getByText("Add Variant");
        fireEvent.click(addVariantButton);
        fireEvent.click(addVariantButton);

        const createButton = screen.getByText("Create Experiment");
        fireEvent.click(createButton);

        await waitFor(() => {
            expect(logger.error).toHaveBeenCalled();
            expect(toast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Creation Failed",
                    variant: "destructive",
                })
            );
        });
    });

    it("should close modal when cancel clicked", () => {
        render(<ExperimentCreatorModal {...defaultProps} />);

        const cancelButton = screen.getByText("Cancel");
        fireEvent.click(cancelButton);

        expect(mockOnClose).toHaveBeenCalled();
    });

    it("should allow removing variants", () => {
        render(<ExperimentCreatorModal {...defaultProps} />);

        const addVariantButton = screen.getByText("Add Variant");
        fireEvent.click(addVariantButton);

        const removeButton = screen.getByRole("button", { name: /remove/i });
        fireEvent.click(removeButton);

        expect(screen.queryByText("Variant A")).not.toBeInTheDocument();
    });

    it("should display success metrics options", () => {
        render(<ExperimentCreatorModal {...defaultProps} />);

        expect(screen.getByText("Success Metrics")).toBeInTheDocument();
        expect(screen.getByLabelText(/click-through rate/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/engagement rate/i)).toBeInTheDocument();
    });

    it("should toggle auto-winner selection", () => {
        render(<ExperimentCreatorModal {...defaultProps} />);

        const autoWinnerSwitch = screen.getByRole("switch", {
            name: /auto-select winner/i,
        });
        fireEvent.click(autoWinnerSwitch);

        expect(autoWinnerSwitch).toBeChecked();
    });
});
