/**
 * ProspectList Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProspectList } from "@/components/followup/prospect-list";

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        error: vi.fn(),
    },
}));

// Mock fetch
global.fetch = vi.fn();

describe("ProspectList", () => {
    const mockFunnelProjectId = "funnel-123";

    const mockProspects = [
        {
            id: "prospect-1",
            email: "john@example.com",
            first_name: "John",
            watch_percentage: 75,
            segment: "hot",
            intent_score: 85,
            total_touches: 3,
            last_touch_at: "2025-01-15T10:00:00Z",
        },
        {
            id: "prospect-2",
            email: "jane@example.com",
            first_name: null,
            watch_percentage: 45,
            segment: "sampler",
            intent_score: 55,
            total_touches: 1,
            last_touch_at: null,
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
        render(<ProspectList funnelProjectId={mockFunnelProjectId} />);
        expect(screen.getByText("Loading prospects...")).toBeInTheDocument();
    });

    it("should fetch prospects for the funnel", async () => {
        render(<ProspectList funnelProjectId={mockFunnelProjectId} />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining(`/api/followup/prospects?funnel_project_id=${mockFunnelProjectId}`)
            );
        });
    });

    it("should display prospect names", async () => {
        render(<ProspectList funnelProjectId={mockFunnelProjectId} />);

        await waitFor(() => {
            expect(screen.getByText("John")).toBeInTheDocument();
        });
    });

    it("should display email when first_name is null", async () => {
        render(<ProspectList funnelProjectId={mockFunnelProjectId} />);

        await waitFor(() => {
            expect(screen.getByText("jane@example.com")).toBeInTheDocument();
        });
    });

    it("should display segment badges", async () => {
        render(<ProspectList funnelProjectId={mockFunnelProjectId} />);

        await waitFor(() => {
            expect(screen.getByText("hot")).toBeInTheDocument();
            expect(screen.getByText("sampler")).toBeInTheDocument();
        });
    });

    it("should display watch percentage", async () => {
        render(<ProspectList funnelProjectId={mockFunnelProjectId} />);

        await waitFor(() => {
            expect(screen.getByText("Watch: 75%")).toBeInTheDocument();
            expect(screen.getByText("Watch: 45%")).toBeInTheDocument();
        });
    });

    it("should display intent scores", async () => {
        render(<ProspectList funnelProjectId={mockFunnelProjectId} />);

        await waitFor(() => {
            expect(screen.getByText("Intent: 85")).toBeInTheDocument();
            expect(screen.getByText("Intent: 55")).toBeInTheDocument();
        });
    });

    it("should display total touches", async () => {
        render(<ProspectList funnelProjectId={mockFunnelProjectId} />);

        await waitFor(() => {
            expect(screen.getByText("Touches: 3")).toBeInTheDocument();
            expect(screen.getByText("Touches: 1")).toBeInTheDocument();
        });
    });

    it("should format last touch date", async () => {
        render(<ProspectList funnelProjectId={mockFunnelProjectId} />);

        await waitFor(() => {
            const date = new Date("2025-01-15T10:00:00Z").toLocaleDateString();
            expect(screen.getByText(`Last: ${date}`)).toBeInTheDocument();
        });
    });

    it("should show dash when no last touch date", async () => {
        render(<ProspectList funnelProjectId={mockFunnelProjectId} />);

        await waitFor(() => {
            const dashElements = screen.getAllByText("Last: -");
            expect(dashElements.length).toBeGreaterThan(0);
        });
    });

    it("should display search input", async () => {
        render(<ProspectList funnelProjectId={mockFunnelProjectId} />);

        await waitFor(() => {
            expect(
                screen.getByPlaceholderText("Search by name or email...")
            ).toBeInTheDocument();
        });
    });

    it("should filter prospects by search query", async () => {
        render(<ProspectList funnelProjectId={mockFunnelProjectId} />);

        await waitFor(() => {
            expect(screen.getByText("John")).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText("Search by name or email...");
        fireEvent.change(searchInput, { target: { value: "john" } });

        expect(screen.getByText("John")).toBeInTheDocument();
        expect(screen.queryByText("jane@example.com")).not.toBeInTheDocument();
    });

    it("should display segment filter buttons", async () => {
        render(<ProspectList funnelProjectId={mockFunnelProjectId} />);

        await waitFor(() => {
            expect(screen.getByText("ALL")).toBeInTheDocument();
            expect(screen.getByText("HOT")).toBeInTheDocument();
            expect(screen.getByText("ENGAGED")).toBeInTheDocument();
            expect(screen.getByText("SAMPLER")).toBeInTheDocument();
        });
    });

    it("should filter prospects by segment", async () => {
        render(<ProspectList funnelProjectId={mockFunnelProjectId} />);

        await waitFor(() => {
            expect(screen.getByText("John")).toBeInTheDocument();
        });

        const hotButton = screen.getByText("HOT");
        fireEvent.click(hotButton);

        await waitFor(() => {
            expect(screen.getByText("John")).toBeInTheDocument();
            expect(screen.queryByText("jane@example.com")).not.toBeInTheDocument();
        });
    });

    it("should show no prospects message when list is empty", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, prospects: [] }),
        });

        render(<ProspectList funnelProjectId={mockFunnelProjectId} />);

        await waitFor(() => {
            expect(screen.getByText("No prospects yet")).toBeInTheDocument();
        });
    });

    it("should handle fetch error gracefully", async () => {
        (global.fetch as any).mockRejectedValue(new Error("Network error"));

        render(<ProspectList funnelProjectId={mockFunnelProjectId} />);

        await waitFor(() => {
            expect(screen.getByText("No prospects yet")).toBeInTheDocument();
        });
    });

    it("should display prospect count", async () => {
        render(<ProspectList funnelProjectId={mockFunnelProjectId} />);

        await waitFor(() => {
            expect(screen.getByText("2 prospects")).toBeInTheDocument();
        });
    });

    it("should render prospect cards", async () => {
        render(<ProspectList funnelProjectId={mockFunnelProjectId} />);

        await waitFor(() => {
            const cards = screen.getAllByRole("listitem");
            expect(cards.length).toBe(2);
        });
    });

    it("should apply segment color coding", async () => {
        render(<ProspectList funnelProjectId={mockFunnelProjectId} />);

        await waitFor(() => {
            const hotBadge = screen.getByText("hot");
            expect(hotBadge).toHaveClass("bg-red-100");
        });
    });
});
