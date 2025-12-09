/**
 * GlobalDashboard Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { GlobalDashboard } from "@/components/followup/global-dashboard";

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        error: vi.fn(),
    },
}));

// Mock fetch
global.fetch = vi.fn();

describe("GlobalDashboard", () => {
    const mockUserId = "user-123";

    const mockAnalytics = {
        totalProspects: 250,
        avgIntentScore: 65,
        conversionRate: 8.5,
        activeSequences: 3,
        bySegment: {
            no_show: 50,
            skimmer: 75,
            sampler: 50,
            engaged: 50,
            hot: 25,
        },
        byEngagement: {
            cold: 100,
            warm: 100,
            hot: 50,
        },
        byFunnel: [
            {
                funnelId: "funnel-1",
                funnelName: "Main Webinar Funnel",
                prospectCount: 150,
                conversionRate: 10.0,
            },
            {
                funnelId: "funnel-2",
                funnelName: "Secondary Funnel",
                prospectCount: 100,
                conversionRate: 6.0,
            },
        ],
        recentActivity: [
            {
                id: "act-1",
                prospectEmail: "john@example.com",
                prospectName: "John Doe",
                eventType: "email_opened",
                timestamp: "2025-01-15T10:00:00Z",
                funnelName: "Main Webinar Funnel",
            },
        ],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, analytics: mockAnalytics }),
        });
    });

    it("should render loading state initially", () => {
        render(<GlobalDashboard userId={mockUserId} />);
        expect(screen.getByText("Loading analytics...")).toBeInTheDocument();
    });

    it("should fetch and display analytics data", async () => {
        render(<GlobalDashboard userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("250")).toBeInTheDocument();
        });

        expect(screen.getByText("Total Prospects")).toBeInTheDocument();
    });

    it("should display key metrics", async () => {
        render(<GlobalDashboard userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("250")).toBeInTheDocument();
            expect(screen.getByText("Avg Intent Score")).toBeInTheDocument();
            expect(screen.getByText("Conversion Rate")).toBeInTheDocument();
            expect(screen.getByText("Active Sequences")).toBeInTheDocument();
        });
    });

    it("should display segment breakdown", async () => {
        render(<GlobalDashboard userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("Prospects by Segment")).toBeInTheDocument();
            expect(screen.getByText("No Show")).toBeInTheDocument();
            expect(screen.getByText("Skimmer")).toBeInTheDocument();
            expect(screen.getByText("Sampler")).toBeInTheDocument();
            expect(screen.getByText("Engaged")).toBeInTheDocument();
            // "Hot" appears multiple times (segment + engagement), use getAllByText
            expect(screen.getAllByText("Hot").length).toBeGreaterThan(0);
        });
    });

    it("should display engagement level breakdown", async () => {
        render(<GlobalDashboard userId={mockUserId} />);

        await waitFor(() => {
            expect(
                screen.getByText("Prospects by Engagement Level")
            ).toBeInTheDocument();
            expect(screen.getByText("Cold")).toBeInTheDocument();
            expect(screen.getByText("Warm")).toBeInTheDocument();
            // "Hot" appears multiple times (segment + engagement), use getAllByText
            expect(screen.getAllByText("Hot").length).toBeGreaterThan(0);
        });
    });

    it("should display funnel performance when data exists", async () => {
        render(<GlobalDashboard userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("Performance by Funnel")).toBeInTheDocument();
            // "Main Webinar Funnel" appears in both funnel section and recent activity
            expect(screen.getAllByText("Main Webinar Funnel").length).toBeGreaterThan(0);
            expect(screen.getByText("Secondary Funnel")).toBeInTheDocument();
            expect(screen.getByText("150 prospects")).toBeInTheDocument();
        });
    });

    it("should display recent activity", async () => {
        render(<GlobalDashboard userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("Recent Activity")).toBeInTheDocument();
            // John Doe appears only once in recent activity
            expect(screen.getByText("John Doe")).toBeInTheDocument();
            expect(screen.getByText("email_opened")).toBeInTheDocument();
        });
    });

    it("should show no data message when analytics is null", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ success: false }),
        });

        render(<GlobalDashboard userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("No analytics data available")).toBeInTheDocument();
        });
    });

    it("should show no activity message when recentActivity is empty", async () => {
        const analyticsWithNoActivity = {
            ...mockAnalytics,
            recentActivity: [],
        };

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, analytics: analyticsWithNoActivity }),
        });

        render(<GlobalDashboard userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("No recent activity")).toBeInTheDocument();
        });
    });

    it("should calculate percentages correctly for segments", async () => {
        render(<GlobalDashboard userId={mockUserId} />);

        await waitFor(() => {
            // No Show: 50/250 = 20% (appears multiple times for segments with same count)
            expect(screen.getAllByText(/50 \(20%\)/).length).toBeGreaterThan(0);
        });
    });

    it("should handle fetch error gracefully", async () => {
        (global.fetch as any).mockRejectedValue(new Error("Network error"));

        render(<GlobalDashboard userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("No analytics data available")).toBeInTheDocument();
        });
    });

    it("should display funnel conversion rate badge", async () => {
        render(<GlobalDashboard userId={mockUserId} />);

        await waitFor(() => {
            expect(screen.getByText("10% conversion")).toBeInTheDocument();
        });
    });

    it("should format dates in recent activity", async () => {
        render(<GlobalDashboard userId={mockUserId} />);

        await waitFor(() => {
            const date = new Date("2025-01-15T10:00:00Z").toLocaleDateString();
            expect(screen.getByText(date)).toBeInTheDocument();
        });
    });
});
