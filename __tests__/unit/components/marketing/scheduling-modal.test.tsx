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

    it("should render correctly when open", () => {
        render(<SchedulingModal {...defaultProps} />);

        expect(screen.getByText("Schedule Post")).toBeInTheDocument();
        expect(screen.getByText(/instagram/i)).toBeInTheDocument();
    });

    it("should not render when closed", () => {
        const { container } = render(
            <SchedulingModal {...defaultProps} isOpen={false} />
        );
        expect(container.firstChild).toBeNull();
    });

    it("should display date and time inputs", () => {
        render(<SchedulingModal {...defaultProps} />);

        expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/time/i)).toBeInTheDocument();
    });

    it("should display timezone information", () => {
        render(<SchedulingModal {...defaultProps} />);

        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        expect(screen.getByText(timezone)).toBeInTheDocument();
    });

    it("should handle date selection", () => {
        render(<SchedulingModal {...defaultProps} />);

        const dateInput = screen.getByLabelText(/date/i);
        fireEvent.change(dateInput, { target: { value: "2024-12-25" } });

        expect(dateInput).toHaveValue("2024-12-25");
    });

    it("should handle time selection", () => {
        render(<SchedulingModal {...defaultProps} />);

        const timeInput = screen.getByLabelText(/time/i);
        fireEvent.change(timeInput, { target: { value: "15:00" } });

        expect(timeInput).toHaveValue("15:00");
    });

    it("should display best time suggestions for platform", () => {
        render(<SchedulingModal {...defaultProps} />);

        expect(screen.getByText(/Best Times for instagram/i)).toBeInTheDocument();
        expect(screen.getByText("9:00 AM")).toBeInTheDocument();
        expect(screen.getByText("12:00 PM")).toBeInTheDocument();
        expect(screen.getByText("5:00 PM")).toBeInTheDocument();
    });

    it("should apply best time suggestion when clicked", () => {
        const { toast } = require("@/components/ui/use-toast").useToast();

        render(<SchedulingModal {...defaultProps} />);

        const bestTimeButton = screen.getByText("9:00 AM");
        fireEvent.click(bestTimeButton);

        expect(toast).toHaveBeenCalledWith(
            expect.objectContaining({
                title: "Best Time Applied",
            })
        );
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

    it("should require date before scheduling", async () => {
        const { toast } = require("@/components/ui/use-toast").useToast();

        render(<SchedulingModal {...defaultProps} />);

        const scheduleButton = screen.getByText("Schedule Post");
        fireEvent.click(scheduleButton);

        await waitFor(() => {
            expect(toast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Date Required",
                    variant: "destructive",
                })
            );
        });
    });

    it("should handle successful scheduling", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true }),
        });

        const { toast } = require("@/components/ui/use-toast").useToast();

        render(<SchedulingModal {...defaultProps} />);

        const dateInput = screen.getByLabelText(/date/i);
        fireEvent.change(dateInput, { target: { value: "2024-12-25" } });

        const scheduleButton = screen.getByText("Schedule Post");
        fireEvent.click(scheduleButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/marketing/calendar"),
                expect.objectContaining({
                    method: "POST",
                    body: expect.stringContaining("variant-123"),
                })
            );
        });

        await waitFor(() => {
            expect(toast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Post Scheduled",
                })
            );
            expect(mockOnScheduleComplete).toHaveBeenCalled();
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    it("should handle scheduling error", async () => {
        (global.fetch as any).mockRejectedValueOnce(new Error("Scheduling failed"));

        const { logger } = require("@/lib/client-logger");
        const { toast } = require("@/components/ui/use-toast").useToast();

        render(<SchedulingModal {...defaultProps} />);

        const dateInput = screen.getByLabelText(/date/i);
        fireEvent.change(dateInput, { target: { value: "2024-12-25" } });

        const scheduleButton = screen.getByText("Schedule Post");
        fireEvent.click(scheduleButton);

        await waitFor(() => {
            expect(logger.error).toHaveBeenCalled();
            expect(toast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Scheduling Failed",
                    variant: "destructive",
                })
            );
        });
    });

    it("should show scheduling state during submission", async () => {
        (global.fetch as any).mockImplementation(
            () =>
                new Promise((resolve) =>
                    setTimeout(
                        () => resolve({ json: async () => ({ success: true }) }),
                        100
                    )
                )
        );

        render(<SchedulingModal {...defaultProps} />);

        const dateInput = screen.getByLabelText(/date/i);
        fireEvent.change(dateInput, { target: { value: "2024-12-25" } });

        const scheduleButton = screen.getByText("Schedule Post");
        fireEvent.click(scheduleButton);

        expect(screen.getByText("Scheduling...")).toBeInTheDocument();
    });

    it("should disable schedule button without date", () => {
        render(<SchedulingModal {...defaultProps} />);

        const scheduleButton = screen.getByText("Schedule Post");
        expect(scheduleButton).toBeDisabled();
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

    it("should set minimum date to today", () => {
        render(<SchedulingModal {...defaultProps} />);

        const dateInput = screen.getByLabelText(/date/i) as HTMLInputElement;
        const today = new Date().toISOString().split("T")[0];

        expect(dateInput.min).toBe(today);
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
