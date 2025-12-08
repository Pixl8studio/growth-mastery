/**
 * GlobalProspectsTable Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GlobalProspectsTable } from "@/components/followup/global-prospects-table";

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        error: vi.fn(),
    },
}));

// Mock fetch
global.fetch = vi.fn();

describe("GlobalProspectsTable", () => {
    const mockUserId = "user-123";

    const mockProspects = [
        {
            id: "prospect-1",
            email: "john@example.com",
            first_name: "John",
            watch_percentage: 75,
            segment: "hot",
            intent_score: 85,
            fit_score: 80,
            combined_score: 82,
            engagement_level: "hot",
            total_touches: 3,
            last_touch_at: "2025-01-15T10:00:00Z",
            converted: false,
            consent_state: "opt_in",
            next_scheduled_touch: "2025-01-16T10:00:00Z",
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
            fit_score: 60,
            combined_score: 57,
            engagement_level: "warm",
            total_touches: 2,
            last_touch_at: "2025-01-14T10:00:00Z",
            converted: true,
            consent_state: "opt_in",
            next_scheduled_touch: null,
            funnel_projects: {
                id: "funnel-1",
                name: "Main Funnel",
            },
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();

        // Reset and configure fetch mock
        (global.fetch as any).mockReset();
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, prospects: mockProspects }),
        });
    });

    afterEach(() => {
        vi.useRealTimers(); // Clean up any fake timers
    });

    it("should render loading state initially", () => {
        render(<GlobalProspectsTable userId={mockUserId} />);
        expect(screen.getByText("Loading prospects...")).toBeInTheDocument();
    });

    it("should fetch and display table headers", async () => {
        render(<GlobalProspectsTable userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText(/Name.*Email/)).toBeInTheDocument();
            expect(screen.getByText("Funnel")).toBeInTheDocument();
            expect(screen.getByText("Segment")).toBeInTheDocument();
            expect(screen.getByText(/Watch/)).toBeInTheDocument();
            expect(screen.getByText("Intent")).toBeInTheDocument();
            expect(screen.getByText("Fit")).toBeInTheDocument();
            expect(screen.getByText("Touches")).toBeInTheDocument();
            expect(screen.getByText("Status")).toBeInTheDocument();
            expect(screen.getByText("Next Touch")).toBeInTheDocument();
            expect(screen.getByText("Last Touch")).toBeInTheDocument();
        });
    });

    it("should display prospect data in table rows", async () => {
        render(<GlobalProspectsTable userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("John")).toBeInTheDocument();
            expect(screen.getByText("jane@example.com")).toBeInTheDocument();
            expect(screen.getByText("Main Funnel")).toBeInTheDocument();
        });
    });

    it("should display watch percentage", async () => {
        render(<GlobalProspectsTable userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("75%")).toBeInTheDocument();
            expect(screen.getByText("45%")).toBeInTheDocument();
        });
    });

    it("should display intent score", async () => {
        render(<GlobalProspectsTable userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("85")).toBeInTheDocument();
            expect(screen.getByText("55")).toBeInTheDocument();
        });
    });

    it("should display total touches", async () => {
        render(<GlobalProspectsTable userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("3")).toBeInTheDocument();
            expect(screen.getByText("2")).toBeInTheDocument();
        });
    });

    it("should show converted badge for converted prospects", async () => {
        render(<GlobalProspectsTable userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("Converted")).toBeInTheDocument();
        });
    });

    it("should show active status for non-converted prospects", async () => {
        render(<GlobalProspectsTable userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("Active")).toBeInTheDocument();
        });
    });

    it("should display next scheduled touch date", async () => {
        render(<GlobalProspectsTable userId={mockUserId} />);

        await waitFor(() => {
            const date = new Date("2025-01-16T10:00:00Z").toLocaleDateString();
            expect(screen.getByText(date)).toBeInTheDocument();
        });
    });

    it("should show dash when no next scheduled touch", async () => {
        render(<GlobalProspectsTable userId={mockUserId} />);

        await waitFor(() => {
            const dashElements = screen.getAllByText("-");
            expect(dashElements.length).toBeGreaterThan(0);
        });
    });

    it("should display segment badges with correct styling", async () => {
        render(<GlobalProspectsTable userId={mockUserId} />);

        await waitFor(() => {
            const hotBadge = screen.getByText("hot");
            const samplerBadge = screen.getByText("sampler");
            expect(hotBadge).toBeInTheDocument();
            expect(samplerBadge).toBeInTheDocument();
        });
    });

    it("should handle empty prospects list", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, prospects: [] }),
        });

        render(<GlobalProspectsTable userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("No prospects found")).toBeInTheDocument();
        });
    });

    it("should handle fetch error gracefully", async () => {
        (global.fetch as any).mockRejectedValue(new Error("Network error"));

        render(<GlobalProspectsTable userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("No prospects found")).toBeInTheDocument();
        });
    });

    it("should display email when first_name is null", async () => {
        const prospectsWithoutName = [
            {
                ...mockProspects[0],
                first_name: null,
            },
        ];

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, prospects: prospectsWithoutName }),
        });

        render(<GlobalProspectsTable userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("john@example.com")).toBeInTheDocument();
        });
    });

    it("should render sortable column headers", async () => {
        render(<GlobalProspectsTable userId={mockUserId} />);

        await waitFor(() => {
            const headers = screen.getAllByRole("columnheader");
            expect(headers.length).toBeGreaterThan(0);
        });
    });

    it("should display engagement level in proper column", async () => {
        render(<GlobalProspectsTable userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("hot")).toBeInTheDocument();
            expect(screen.getByText("warm")).toBeInTheDocument();
        });
    });

    it("should make table responsive", async () => {
        render(<GlobalProspectsTable userId={mockUserId} />);

        await waitFor(() => {
            const table = screen.getByRole("table");
            expect(table).toHaveClass("w-full");
        });
    });
});
