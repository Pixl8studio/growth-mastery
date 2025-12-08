/**
 * ProspectsKanban Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ProspectsKanban } from "@/components/followup/prospects-kanban";

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        error: vi.fn(),
    },
}));

// Mock fetch
global.fetch = vi.fn();

describe("ProspectsKanban", () => {
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
            engagement_level: "warm",
            total_touches: 2,
            converted: true,
            next_scheduled_touch: null,
            funnel_projects: {
                id: "funnel-1",
                name: "Main Funnel",
            },
        },
        {
            id: "prospect-3",
            email: "bob@example.com",
            first_name: "Bob",
            watch_percentage: 15,
            segment: "skimmer",
            intent_score: 25,
            engagement_level: "cold",
            total_touches: 1,
            converted: false,
            next_scheduled_touch: null,
            funnel_projects: {
                id: "funnel-2",
                name: "Secondary Funnel",
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
        render(<ProspectsKanban userId={mockUserId} />);
        expect(screen.getByText("Loading kanban board...")).toBeInTheDocument();
    });

    it("should render three columns", async () => {
        render(<ProspectsKanban userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText(/❄️ Cold/)).toBeInTheDocument();
            expect(screen.getByText(/🌤️ Warm/)).toBeInTheDocument();
            expect(screen.getByText(/🔥 Hot/)).toBeInTheDocument();
        });
    });

    it("should display prospect count in each column", async () => {
        render(<ProspectsKanban userId={mockUserId} />);

        await waitFor(() => {
            // Cold: 1, Warm: 1, Hot: 1
            const badges = screen.getAllByText("1");
            expect(badges.length).toBeGreaterThan(0);
        });
    });

    it("should organize prospects by engagement level", async () => {
        render(<ProspectsKanban userId={mockUserId} />);

        await waitFor(() => {
            // Bob should be in cold column
            expect(screen.getByText("Bob")).toBeInTheDocument();
            // Jane should be in warm column
            expect(screen.getByText("Jane")).toBeInTheDocument();
            // John should be in hot column
            expect(screen.getByText("John")).toBeInTheDocument();
        });
    });

    it("should display segment badges on prospect cards", async () => {
        render(<ProspectsKanban userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("hot")).toBeInTheDocument();
            expect(screen.getByText("sampler")).toBeInTheDocument();
            expect(screen.getByText("skimmer")).toBeInTheDocument();
        });
    });

    it("should display converted badge for converted prospects", async () => {
        render(<ProspectsKanban userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("✓")).toBeInTheDocument();
        });
    });

    it("should display next touch date when available", async () => {
        render(<ProspectsKanban userId={mockUserId} />);

        await waitFor(() => {
            const date = new Date("2025-01-16T10:00:00Z").toLocaleDateString();
            expect(screen.getByText(`Next: ${date}`)).toBeInTheDocument();
        });
    });

    it("should handle fetch error gracefully", async () => {
        (global.fetch as any).mockRejectedValue(new Error("Network error"));

        render(<ProspectsKanban userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("Loading kanban board...")).toBeInTheDocument();
        });
    });

    it("should apply proper column styling", async () => {
        render(<ProspectsKanban userId={mockUserId} />);

        await waitFor(() => {
            const columns = document.querySelectorAll(".border-2");
            expect(columns.length).toBe(3);
        });
    });

    it("should make columns scrollable", async () => {
        render(<ProspectsKanban userId={mockUserId} />);

        await waitFor(() => {
            const scrollableAreas = document.querySelectorAll(".overflow-y-auto");
            expect(scrollableAreas.length).toBe(3);
        });
    });

    it("should display watch percentage metrics", async () => {
        render(<ProspectsKanban userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("75%")).toBeInTheDocument();
            expect(screen.getByText("45%")).toBeInTheDocument();
        });
    });

    it("should apply segment color coding", async () => {
        render(<ProspectsKanban userId={mockUserId} />);

        await waitFor(() => {
            const segmentBadges = document.querySelectorAll(".bg-red-500, .bg-yellow-500, .bg-primary");
            expect(segmentBadges.length).toBeGreaterThan(0);
        });
    });

    it("should render prospect cards with hover effect", async () => {
        render(<ProspectsKanban userId={mockUserId} />);

        await waitFor(() => {
            const cards = document.querySelectorAll(".hover\\:shadow-md");
            expect(cards.length).toBe(3);
        });
    });
});
