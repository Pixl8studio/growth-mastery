/**
 * ExperimentCreatorModal Component Tests
 * Tests A/B test experiment setup and variant configuration
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExperimentCreatorModal } from "@/components/marketing/experiment-creator-modal";

// Mock dependencies
const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
    useToast: () => ({
        toast: mockToast,
    }),
}));

vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Import mocked modules
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";

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
        mockToast.mockClear();
        global.fetch = vi.fn();
    });

    it("should render correctly when open", () => {
        render(<ExperimentCreatorModal {...defaultProps} />);

        expect(screen.getByText("Create A/B Test Experiment")).toBeInTheDocument();
        expect(screen.getByText("Experiment Setup")).toBeInTheDocument();
    });

    it("should not render when closed", () => {
        const { container } = render(
            <ExperimentCreatorModal {...defaultProps} isOpen={false} />
        );
        expect(container.firstChild).toBeNull();
    });

    it("should handle experiment name input", () => {
        render(<ExperimentCreatorModal {...defaultProps} />);

        const nameInput = screen.getByPlaceholderText(
            /e.g., Hook Test - Question vs Statement/i
        );
        fireEvent.change(nameInput, { target: { value: "Test Experiment" } });

        expect(nameInput).toHaveValue("Test Experiment");
    });

    it("should select experiment type", () => {
        render(<ExperimentCreatorModal {...defaultProps} />);

        const comboboxes = screen.getAllByRole("combobox");
        const typeSelect = comboboxes[0]; // First combobox is experiment type
        fireEvent.change(typeSelect, { target: { value: "cta" } });

        expect(typeSelect).toHaveValue("cta");
    });

    it("should select base variant", () => {
        const mockVariants = [
            {
                id: "variant-1",
                platform: "instagram",
                copy_text: "Test variant content here",
            },
        ];

        render(
            <ExperimentCreatorModal {...defaultProps} variants={mockVariants as any} />
        );

        const variantSelect = screen.getAllByRole("combobox")[1]; // Second combobox is variant selector
        fireEvent.change(variantSelect, { target: { value: "variant-1" } });

        expect(variantSelect).toHaveValue("variant-1");
    });

    it("should set distribution split percentages", () => {
        render(<ExperimentCreatorModal {...defaultProps} />);

        // Distribution split should be visible in the Test Configuration section
        const allSplitTexts = screen.getAllByText(/50% \/ 50%/);
        expect(allSplitTexts.length).toBeGreaterThan(0);
    });

    it("should set experiment duration", () => {
        render(<ExperimentCreatorModal {...defaultProps} />);

        // Find input by its default value of 7
        const durationInput = screen.getByDisplayValue("7");
        fireEvent.change(durationInput, { target: { value: "14" } });

        expect(durationInput).toHaveValue(14);
    });

    it("should disable create button when required fields are missing", () => {
        render(<ExperimentCreatorModal {...defaultProps} />);

        const createButton = screen.getByText("Create Experiment");
        expect(createButton).toBeDisabled();
    });

    it("should handle successful experiment creation", async () => {
        const mockVariants = [
            {
                id: "variant-1",
                platform: "instagram",
                copy_text: "Test variant content here",
            },
        ];

        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({
                success: true,
                experiment: { id: "exp-123", status: "scheduled" },
            }),
        });

        render(
            <ExperimentCreatorModal {...defaultProps} variants={mockVariants as any} />
        );

        const nameInput = screen.getByPlaceholderText(
            /e.g., Hook Test - Question vs Statement/i
        );
        fireEvent.change(nameInput, { target: { value: "Test Experiment" } });

        // Select base variant
        const variantSelect = screen.getAllByRole("combobox")[1];
        fireEvent.change(variantSelect, { target: { value: "variant-1" } });

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
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Experiment Created",
                })
            );
            expect(mockOnExperimentCreated).toHaveBeenCalled();
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    it("should handle creation error", async () => {
        const mockVariants = [
            {
                id: "variant-1",
                platform: "instagram",
                copy_text: "Test variant content here",
            },
        ];

        (global.fetch as any).mockRejectedValueOnce(new Error("Creation failed"));

        const mockLogger = vi.mocked(logger);

        render(
            <ExperimentCreatorModal {...defaultProps} variants={mockVariants as any} />
        );

        const nameInput = screen.getByPlaceholderText(
            /e.g., Hook Test - Question vs Statement/i
        );
        fireEvent.change(nameInput, { target: { value: "Test" } });

        const variantSelect = screen.getAllByRole("combobox")[1];
        fireEvent.change(variantSelect, { target: { value: "variant-1" } });

        const createButton = screen.getByText("Create Experiment");
        fireEvent.click(createButton);

        await waitFor(() => {
            expect(mockLogger.error).toHaveBeenCalled();
            expect(mockToast).toHaveBeenCalledWith(
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

    it("should toggle auto-generate variant B", () => {
        render(<ExperimentCreatorModal {...defaultProps} />);

        const switches = screen.getAllByRole("switch");
        const autoGenerateSwitch = switches[0]; // First switch is auto-generate
        expect(autoGenerateSwitch).toBeChecked(); // Default is true

        fireEvent.click(autoGenerateSwitch);
        expect(autoGenerateSwitch).not.toBeChecked();
    });

    it("should display success metric options", () => {
        render(<ExperimentCreatorModal {...defaultProps} />);

        expect(screen.getByText("Success Metric")).toBeInTheDocument();

        // Check that the select has the right options
        const successMetricSelect = screen.getAllByRole("combobox")[2]; // Third combobox is success metric
        expect(successMetricSelect).toBeInTheDocument();
    });

    it("should toggle auto-declare winner", () => {
        render(<ExperimentCreatorModal {...defaultProps} />);

        const switches = screen.getAllByRole("switch");
        const autoDeclareSwitch = switches[1]; // Second switch is auto-declare winner
        expect(autoDeclareSwitch).toBeChecked(); // Default is true

        fireEvent.click(autoDeclareSwitch);
        expect(autoDeclareSwitch).not.toBeChecked();
    });
});
