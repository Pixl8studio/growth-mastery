/**
 * ContentCalendarEnhanced Component Tests
 * Tests enhanced calendar view with scheduling, drag-drop, and filtering
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ContentCalendarEnhanced } from "@/components/marketing/content-calendar-enhanced";

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

// Import mocked modules
import { logger } from "@/lib/client-logger";

// Mock child components
vi.mock("@/components/marketing/scheduling-modal", () => ({
    SchedulingModal: ({ isOpen, onClose }: any) =>
        isOpen ? (
            <div data-testid="scheduling-modal">
                <button onClick={onClose}>Close Modal</button>
            </div>
        ) : null,
}));

describe("ContentCalendarEnhanced", () => {
    const defaultProps = {
        funnelProjectId: "test-funnel-123",
    };

    const mockScheduledPosts = [
        {
            id: "post-1",
            variant_id: "variant-1",
            scheduled_publish_at: "2024-12-25T09:00:00Z",
            platform: "instagram",
            copy_text: "Christmas post",
            status: "scheduled",
        },
        {
            id: "post-2",
            variant_id: "variant-2",
            scheduled_publish_at: "2024-12-25T15:00:00Z",
            platform: "facebook",
            copy_text: "Holiday sale",
            status: "scheduled",
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it("should render correctly with calendar header", () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, scheduled_posts: [] }),
        });

        render(<ContentCalendarEnhanced {...defaultProps} />);

        expect(screen.getByText("Content Calendar")).toBeInTheDocument();
        expect(screen.getByText("Schedule & manage your posts")).toBeInTheDocument();
    });

    it("should load scheduled posts on mount", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({
                success: true,
                scheduled_posts: mockScheduledPosts,
            }),
        });

        render(<ContentCalendarEnhanced {...defaultProps} />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/marketing/calendar")
            );
        });
    });

    it("should switch between calendar views (month/week/day)", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, scheduled_posts: [] }),
        });

        render(<ContentCalendarEnhanced {...defaultProps} />);

        const weekButton = screen.getByText("Week");
        fireEvent.click(weekButton);

        expect(weekButton).toHaveClass("bg-primary");

        const dayButton = screen.getByText("Day");
        fireEvent.click(dayButton);

        expect(dayButton).toHaveClass("bg-primary");
    });

    it("should filter posts by platform", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({
                success: true,
                scheduled_posts: mockScheduledPosts,
            }),
        });

        render(<ContentCalendarEnhanced {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Christmas post")).toBeInTheDocument();
        });

        const instagramFilter = screen.getByLabelText("Instagram");
        fireEvent.click(instagramFilter);

        await waitFor(() => {
            expect(screen.getByText("Christmas post")).toBeInTheDocument();
            expect(screen.queryByText("Holiday sale")).not.toBeInTheDocument();
        });
    });

    it("should filter posts by status", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({
                success: true,
                scheduled_posts: mockScheduledPosts,
            }),
        });

        render(<ContentCalendarEnhanced {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Christmas post")).toBeInTheDocument();
        });

        const scheduledFilter = screen.getByLabelText("Scheduled");
        fireEvent.click(scheduledFilter);

        expect(screen.getByText("Christmas post")).toBeInTheDocument();
    });

    it("should navigate between months", async () => {
        (global.fetch as any).mockResolvedValue({
            json: async () => ({ success: true, scheduled_posts: [] }),
        });

        render(<ContentCalendarEnhanced {...defaultProps} />);

        const nextButton = screen.getByRole("button", { name: /next/i });
        fireEvent.click(nextButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });
    });

    it("should open scheduling modal when clicking on empty slot", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, scheduled_posts: [] }),
        });

        render(<ContentCalendarEnhanced {...defaultProps} />);

        // Find an empty calendar day slot and click it
        const daySlots = screen.getAllByRole("button");
        const emptySlot = daySlots.find((slot) => slot.textContent?.match(/^\d+$/));

        if (emptySlot) {
            fireEvent.click(emptySlot);
            await waitFor(() => {
                expect(screen.getByTestId("scheduling-modal")).toBeInTheDocument();
            });
        }
    });

    it("should display post details when clicking on scheduled post", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({
                success: true,
                scheduled_posts: mockScheduledPosts,
            }),
        });

        render(<ContentCalendarEnhanced {...defaultProps} />);

        await waitFor(() => {
            const post = screen.getByText("Christmas post");
            fireEvent.click(post);
        });

        await waitFor(() => {
            expect(screen.getByText("Post Details")).toBeInTheDocument();
        });
    });

    it("should handle post reschedule", async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({
                json: async () => ({
                    success: true,
                    scheduled_posts: mockScheduledPosts,
                }),
            })
            .mockResolvedValueOnce({
                json: async () => ({ success: true }),
            });

        render(<ContentCalendarEnhanced {...defaultProps} />);

        await waitFor(() => {
            const post = screen.getByText("Christmas post");
            fireEvent.click(post);
        });

        // Find and click reschedule button
        await waitFor(() => {
            const rescheduleButton = screen.getByText(/reschedule/i);
            fireEvent.click(rescheduleButton);
        });

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/api/marketing/calendar/"),
            expect.objectContaining({
                method: "PATCH",
            })
        );
    });

    it("should handle post deletion", async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({
                json: async () => ({
                    success: true,
                    scheduled_posts: mockScheduledPosts,
                }),
            })
            .mockResolvedValueOnce({
                json: async () => ({ success: true }),
            });

        global.confirm = vi.fn(() => true);

        render(<ContentCalendarEnhanced {...defaultProps} />);

        await waitFor(() => {
            const post = screen.getByText("Christmas post");
            fireEvent.click(post);
        });

        // Find and click delete button
        await waitFor(() => {
            const deleteButton = screen.getByText(/delete/i);
            fireEvent.click(deleteButton);
        });

        expect(global.confirm).toHaveBeenCalled();
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/api/marketing/calendar/"),
            expect.objectContaining({
                method: "DELETE",
            })
        );
    });

    it("should display empty state when no posts scheduled", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, scheduled_posts: [] }),
        });

        render(<ContentCalendarEnhanced {...defaultProps} />);

        await waitFor(() => {
            expect(
                screen.getByText("No posts scheduled for this month")
            ).toBeInTheDocument();
        });
    });

    it("should handle loading error", async () => {
        (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

        const mockLogger = vi.mocked(logger);

        render(<ContentCalendarEnhanced {...defaultProps} />);

        await waitFor(() => {
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    it("should display post count badge by day", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({
                success: true,
                scheduled_posts: mockScheduledPosts,
            }),
        });

        render(<ContentCalendarEnhanced {...defaultProps} />);

        await waitFor(() => {
            const badge = screen.getByText("2");
            expect(badge).toBeInTheDocument();
        });
    });
});
