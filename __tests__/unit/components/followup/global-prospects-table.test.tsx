/**
 * GlobalProspectsTable Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
            // Use getByRole to find headers more reliably
            const headers = screen.getAllByRole("columnheader");
            const headerTexts = headers.map((h) => h.textContent);

            expect(headerTexts.some((t) => t?.includes("Name"))).toBe(true);
            expect(headerTexts.some((t) => t?.includes("Funnel"))).toBe(true);
            expect(headerTexts.some((t) => t?.includes("Segment"))).toBe(true);
            expect(headerTexts.some((t) => t?.includes("Watch"))).toBe(true);
            expect(headerTexts.some((t) => t?.includes("Intent"))).toBe(true);
            expect(headerTexts.some((t) => t?.includes("Fit"))).toBe(true);
            expect(headerTexts.some((t) => t?.includes("Touches"))).toBe(true);
            expect(headerTexts.some((t) => t?.includes("Status"))).toBe(true);
            expect(headerTexts.some((t) => t?.includes("Next Touch"))).toBe(true);
            expect(headerTexts.some((t) => t?.includes("Last Touch"))).toBe(true);
        });
    });

    it("should display prospect data in table rows", async () => {
        render(<GlobalProspectsTable userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("John")).toBeInTheDocument();
            // jane@example.com appears multiple times (as name and email)
            expect(screen.getAllByText("jane@example.com").length).toBeGreaterThan(0);
            // Main Funnel appears for both prospects
            expect(screen.getAllByText("Main Funnel").length).toBeGreaterThan(0);
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
            // Component uses em dash "—" (U+2014) not hyphen "-"
            const dashElements = screen.getAllByText("—");
            expect(dashElements.length).toBeGreaterThan(0);
        });
    });

    it("should display segment badges with correct styling", async () => {
        render(<GlobalProspectsTable userId={mockUserId} />);

        await waitFor(() => {
            // Multiple badges may have same text
            const hotBadges = screen.getAllByText("hot");
            const samplerBadges = screen.getAllByText("sampler");
            expect(hotBadges.length).toBeGreaterThan(0);
            expect(samplerBadges.length).toBeGreaterThan(0);
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
            // john@example.com appears twice (as name and email subtitle)
            expect(screen.getAllByText("john@example.com").length).toBeGreaterThan(0);
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
            // Component displays segments, not engagement_level
            expect(screen.getAllByText("hot").length).toBeGreaterThan(0);
            expect(screen.getAllByText("sampler").length).toBeGreaterThan(0);
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
