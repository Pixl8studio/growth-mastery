/**
 * RecurringPostScheduler Component Tests
 * Tests recurring post scheduling with frequency, time, and preview functionality
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RecurringPostScheduler } from "@/components/marketing/recurring-post-scheduler";

// Mock dependencies
const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
    useToast: () => ({
        toast: mockToast,
    }),
}));

describe("RecurringPostScheduler", () => {
    const mockOnSchedule = vi.fn();
    const mockOnCancel = vi.fn();

    const defaultProps = {
        variantId: "test-variant-123",
        onSchedule: mockOnSchedule,
        onCancel: mockOnCancel,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockToast.mockClear();
    });

    it("should render correctly with default values", () => {
        render(<RecurringPostScheduler {...defaultProps} />);

        expect(screen.getByText("Recurring Post Schedule")).toBeInTheDocument();
        expect(screen.getByText("Frequency")).toBeInTheDocument();
        expect(screen.getByText("Weekly")).toBeInTheDocument();
        expect(screen.getByText("Biweekly")).toBeInTheDocument();
        expect(screen.getByText("Monthly")).toBeInTheDocument();
    });

    it("should change frequency when clicked", () => {
        render(<RecurringPostScheduler {...defaultProps} />);

        const monthlyButton = screen.getByRole("button", { name: /Monthly/i });
        fireEvent.click(monthlyButton);

        expect(monthlyButton).toHaveClass("bg-primary");
    });

    it("should display day of week selector for weekly frequency", () => {
        render(<RecurringPostScheduler {...defaultProps} />);

        expect(screen.getByText("Day of Week")).toBeInTheDocument();
        const select = screen.getByRole("combobox");
        expect(select).toBeInTheDocument();
    });

    it("should display day of month input for monthly frequency", () => {
        render(<RecurringPostScheduler {...defaultProps} />);

        const monthlyButton = screen.getByRole("button", { name: /Monthly/i });
        fireEvent.click(monthlyButton);

        expect(screen.getByText("Day of Month")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("1-31")).toBeInTheDocument();
    });

    it("should display timezone information", () => {
        render(<RecurringPostScheduler {...defaultProps} />);

        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        expect(screen.getByText(`Timezone: ${timezone}`)).toBeInTheDocument();
    });

    it("should allow selecting end condition by count", () => {
        render(<RecurringPostScheduler {...defaultProps} />);

        const afterXPostsButton = screen.getByRole("button", {
            name: /After X Posts/i,
        });
        expect(afterXPostsButton).toHaveClass("bg-primary");
    });

    it("should allow selecting end condition by date", () => {
        render(<RecurringPostScheduler {...defaultProps} />);

        const untilDateButton = screen.getByRole("button", { name: /Until Date/i });
        fireEvent.click(untilDateButton);

        expect(untilDateButton).toHaveClass("bg-primary");
        expect(screen.getByText("End Date")).toBeInTheDocument();
    });

    it("should display occurrence count input when end condition is count", () => {
        render(<RecurringPostScheduler {...defaultProps} />);

        expect(screen.getByText("Number of Occurrences")).toBeInTheDocument();
        const occurrenceInput = screen.getByPlaceholderText("4");
        expect(occurrenceInput).toBeInTheDocument();
    });

    it("should allow changing occurrence count", () => {
        render(<RecurringPostScheduler {...defaultProps} />);

        const occurrenceInput = screen.getByPlaceholderText("4");
        fireEvent.change(occurrenceInput, { target: { value: "10" } });

        expect(occurrenceInput).toHaveValue(10);
    });

    it("should generate preview when button clicked", async () => {
        render(<RecurringPostScheduler {...defaultProps} />);

        const generateButton = screen.getByRole("button", {
            name: /Generate Preview/i,
        });
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Preview Generated",
                })
            );
        });
    });

    it("should display preview dates after generation", async () => {
        render(<RecurringPostScheduler {...defaultProps} />);

        const generateButton = screen.getByRole("button", {
            name: /Generate Preview/i,
        });
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(screen.getByText(/Upcoming Posts/i)).toBeInTheDocument();
        });
    });

    it("should disable schedule button when no preview generated", () => {
        render(<RecurringPostScheduler {...defaultProps} />);

        const scheduleButton = screen.getByRole("button", {
            name: /Schedule Recurring Posts/i,
        });
        expect(scheduleButton).toBeDisabled();
    });

    it("should enable schedule button after preview generation", async () => {
        render(<RecurringPostScheduler {...defaultProps} />);

        const generateButton = screen.getByRole("button", {
            name: /Generate Preview/i,
        });
        fireEvent.click(generateButton);

        await waitFor(() => {
            const scheduleButton = screen.getByRole("button", {
                name: /Schedule Recurring Posts/i,
            });
            expect(scheduleButton).toBeEnabled();
        });
    });

    it("should call onSchedule with correct config for weekly", async () => {
        render(<RecurringPostScheduler {...defaultProps} />);

        // Generate preview first
        const generateButton = screen.getByRole("button", {
            name: /Generate Preview/i,
        });
        fireEvent.click(generateButton);

        await waitFor(() => {
            const scheduleButton = screen.getByRole("button", {
                name: /Schedule Recurring Posts/i,
            });
            expect(scheduleButton).toBeEnabled();
        });

        const scheduleButton = screen.getByRole("button", {
            name: /Schedule Recurring Posts/i,
        });
        fireEvent.click(scheduleButton);

        expect(mockOnSchedule).toHaveBeenCalledWith(
            expect.objectContaining({
                frequency: "weekly",
                day_of_week: 1,
                time: "09:00",
                end_condition: "count",
                occurrence_count: 4,
            })
        );
    });

    it("should call onSchedule with correct config for monthly", async () => {
        render(<RecurringPostScheduler {...defaultProps} />);

        // Change to monthly
        const monthlyButton = screen.getByRole("button", { name: /Monthly/i });
        fireEvent.click(monthlyButton);

        // Generate preview
        const generateButton = screen.getByRole("button", {
            name: /Generate Preview/i,
        });
        fireEvent.click(generateButton);

        await waitFor(() => {
            const scheduleButton = screen.getByRole("button", {
                name: /Schedule Recurring Posts/i,
            });
            expect(scheduleButton).toBeEnabled();
        });

        const scheduleButton = screen.getByRole("button", {
            name: /Schedule Recurring Posts/i,
        });
        fireEvent.click(scheduleButton);

        expect(mockOnSchedule).toHaveBeenCalledWith(
            expect.objectContaining({
                frequency: "monthly",
                day_of_month: 1,
                time: "09:00",
                end_condition: "count",
            })
        );
    });

    it("should call onCancel when cancel button clicked", () => {
        render(<RecurringPostScheduler {...defaultProps} />);

        const cancelButton = screen.getByRole("button", { name: /Cancel/i });
        fireEvent.click(cancelButton);

        expect(mockOnCancel).toHaveBeenCalled();
    });

    it("should handle biweekly frequency", () => {
        render(<RecurringPostScheduler {...defaultProps} />);

        const biweeklyButton = screen.getByRole("button", { name: /Biweekly/i });
        fireEvent.click(biweeklyButton);

        expect(biweeklyButton).toHaveClass("bg-primary");
    });

    it("should disable schedule button when end date is required but not provided", () => {
        render(<RecurringPostScheduler {...defaultProps} />);

        // Select date end condition
        const untilDateButton = screen.getByRole("button", { name: /Until Date/i });
        fireEvent.click(untilDateButton);

        // Generate preview
        const generateButton = screen.getByRole("button", {
            name: /Generate Preview/i,
        });
        fireEvent.click(generateButton);

        const scheduleButton = screen.getByRole("button", {
            name: /Schedule Recurring Posts/i,
        });
        expect(scheduleButton).toBeDisabled();
    });

    it("should display all days of week in selector", () => {
        render(<RecurringPostScheduler {...defaultProps} />);

        const select = screen.getByRole("combobox");
        expect(select).toBeInTheDocument();

        const options = select.querySelectorAll("option");
        expect(options.length).toBe(7);
        expect(options[0]).toHaveTextContent("Sunday");
        expect(options[6]).toHaveTextContent("Saturday");
    });
});
