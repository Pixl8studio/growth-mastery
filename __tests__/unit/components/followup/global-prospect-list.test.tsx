/**
 * GlobalProspectList Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GlobalProspectList } from "@/components/followup/global-prospect-list";

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        error: vi.fn(),
    },
}));

// Mock fetch
global.fetch = vi.fn();

describe("GlobalProspectList", () => {
    const mockUserId = "user-123";

    const mockProspects = [
        {
            id: "prospect-1",
            email: "john@example.com",
            first_name: "John",
            watch_percentage: 75,
            segment: "hot",
            intent_score: 85,
            engagement_level: "hot",
            total_touches: 3,
            converted: false,
            last_touch_at: "2025-01-15T10:00:00Z",
            funnel_projects: {
                id: "funnel-1",
                name: "Main Funnel",
            },
        },
        {
            id: "prospect-2",
            email: "jane@example.com",
            first_name: "Jane",
            watch_percentage: 45,
            segment: "sampler",
            intent_score: 55,
            engagement_level: "warm",
            total_touches: 2,
            converted: true,
            last_touch_at: "2025-01-14T10:00:00Z",
            funnel_projects: {
                id: "funnel-1",
                name: "Main Funnel",
            },
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, prospects: mockProspects }),
        });
    });

    it("should render loading state initially", () => {
        render(<GlobalProspectList userId={mockUserId} />);
        expect(screen.getByText("Loading prospects...")).toBeInTheDocument();
    });

    it("should fetch and display prospects", async () => {
        render(<GlobalProspectList userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("John")).toBeInTheDocument();
            expect(screen.getByText("Jane")).toBeInTheDocument();
        });
    });

    it("should display search input", async () => {
        render(<GlobalProspectList userId={mockUserId} />);

        await waitFor(() => {
            expect(
                screen.getByPlaceholderText("Search by name or email...")
            ).toBeInTheDocument();
        });
    });

    it("should display segment filter buttons", async () => {
        render(<GlobalProspectList userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("ALL")).toBeInTheDocument();
            expect(screen.getByText("NO SHOW")).toBeInTheDocument();
            expect(screen.getByText("SKIMMER")).toBeInTheDocument();
            expect(screen.getByText("SAMPLER")).toBeInTheDocument();
            expect(screen.getByText("ENGAGED")).toBeInTheDocument();
            expect(screen.getByText("HOT")).toBeInTheDocument();
        });
    });

    it("should filter prospects by search query", async () => {
        render(<GlobalProspectList userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("John")).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText("Search by name or email...");
        fireEvent.change(searchInput, { target: { value: "john" } });

        expect(screen.getByText("John")).toBeInTheDocument();
        expect(screen.queryByText("Jane")).not.toBeInTheDocument();
    });

    it("should filter prospects by segment", async () => {
        render(<GlobalProspectList userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("John")).toBeInTheDocument();
        });

        const hotButton = screen.getByText("HOT");
        fireEvent.click(hotButton);

        await waitFor(() => {
            expect(screen.getByText("John")).toBeInTheDocument();
            expect(screen.queryByText("Jane")).not.toBeInTheDocument();
        });
    });

    it("should show no prospects message when list is empty", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, prospects: [] }),
        });

        render(<GlobalProspectList userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("No prospects found")).toBeInTheDocument();
        });
    });

    it("should display prospect metrics", async () => {
        render(<GlobalProspectList userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("Watch: 75%")).toBeInTheDocument();
            expect(screen.getByText("Intent: 85")).toBeInTheDocument();
            expect(screen.getByText("Touches: 3")).toBeInTheDocument();
        });
    });

    it("should display engagement level badges", async () => {
        render(<GlobalProspectList userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("hot")).toBeInTheDocument();
            expect(screen.getByText("warm")).toBeInTheDocument();
        });
    });

    it("should display converted badge for converted prospects", async () => {
        render(<GlobalProspectList userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("Converted")).toBeInTheDocument();
        });
    });

    it("should display funnel name", async () => {
        render(<GlobalProspectList userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getAllByText("Funnel: Main Funnel")).toHaveLength(2);
        });
    });

    it("should display last touch date", async () => {
        render(<GlobalProspectList userId={mockUserId} />);

        await waitFor(() => {
            const date1 = new Date("2025-01-15T10:00:00Z").toLocaleDateString();
            expect(screen.getByText(`Last: ${date1}`)).toBeInTheDocument();
        });
    });

    it("should handle fetch error gracefully", async () => {
        (global.fetch as any).mockRejectedValue(new Error("Network error"));

        render(<GlobalProspectList userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("No prospects found")).toBeInTheDocument();
        });
    });

    it("should refetch when segment filter changes", async () => {
        render(<GlobalProspectList userId={mockUserId} />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/followup/global-prospects?"
            );
        });

        const hotButton = screen.getByText("HOT");
        fireEvent.click(hotButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/followup/global-prospects?segment=hot"
            );
        });
    });
});
