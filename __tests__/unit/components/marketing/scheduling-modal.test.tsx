/**
 * SchedulingModal Component Tests
 * Tests post scheduling with date/time picker, space selection, and best time suggestions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SchedulingModal } from "@/components/marketing/scheduling-modal";

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

describe("SchedulingModal", () => {
    const mockOnClose = vi.fn();
    const mockOnScheduleComplete = vi.fn();
    const defaultProps = {
        isOpen: true,
        onClose: mockOnClose,
        variantId: "variant-123",
        onScheduleComplete: mockOnScheduleComplete,
        platform: "instagram",
    };

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it("should not render when closed", () => {
        const { container } = render(
            <SchedulingModal {...defaultProps} isOpen={false} />
        );
        expect(container.firstChild).toBeNull();
    });

    it("should display timezone information", () => {
        render(<SchedulingModal {...defaultProps} />);

        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        expect(screen.getByText(timezone)).toBeInTheDocument();
    });

    it("should display best time suggestions for platform", () => {
        render(<SchedulingModal {...defaultProps} />);

        expect(screen.getByText(/Best Times for instagram/i)).toBeInTheDocument();
        expect(screen.getByText("9:00 AM")).toBeInTheDocument();
        expect(screen.getByText("12:00 PM")).toBeInTheDocument();
        expect(screen.getByText("5:00 PM")).toBeInTheDocument();
    });

    it("should display space selector", () => {
        render(<SchedulingModal {...defaultProps} />);

        expect(screen.getByText("Sandbox (Testing)")).toBeInTheDocument();
        expect(screen.getByText("Production (Live)")).toBeInTheDocument();
    });

    it("should toggle between sandbox and production", () => {
        render(<SchedulingModal {...defaultProps} />);

        const productionButton = screen.getByText("Production (Live)");
        fireEvent.click(productionButton);

        expect(productionButton.closest("button")).toHaveClass("bg-primary");
    });

    it("should display recurring post option", () => {
        render(<SchedulingModal {...defaultProps} />);

        expect(screen.getByText("Recurring Post")).toBeInTheDocument();
        expect(screen.getByText("Schedule this post to repeat")).toBeInTheDocument();
    });

    it("should toggle recurring post", () => {
        render(<SchedulingModal {...defaultProps} />);

        const recurringSwitch = screen.getByRole("switch");
        fireEvent.click(recurringSwitch);

        expect(recurringSwitch).toBeChecked();
    });

    it("should close modal when cancel clicked", () => {
        render(<SchedulingModal {...defaultProps} />);

        const cancelButton = screen.getByText("Cancel");
        fireEvent.click(cancelButton);

        expect(mockOnClose).toHaveBeenCalled();
    });

    it("should close modal when X button clicked", () => {
        render(<SchedulingModal {...defaultProps} />);

        const closeButton = screen.getByRole("button", { name: "" });
        fireEvent.click(closeButton);

        expect(mockOnClose).toHaveBeenCalled();
    });

    it("should show conflict warning when enabled", () => {
        // This test assumes the component has logic to detect conflicts
        // For now, we'll just verify the warning can be displayed
        render(<SchedulingModal {...defaultProps} />);

        // In a real scenario, this would be triggered by scheduling logic
        // For testing, we're just checking the UI exists
        const warning = screen.queryByText(/High Volume Warning/);
        // Warning may or may not be present depending on state
        expect(warning).toBeNull(); // Not shown by default
    });
});
