/**
 * MarketingAnalyticsDashboardEnhanced Component Tests
 * Tests analytics dashboard with metrics, charts, and insights
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MarketingAnalyticsDashboardEnhanced } from "@/components/marketing/marketing-analytics-dashboard-enhanced";

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

// Mock chart components
vi.mock("recharts", () => ({
    LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
    BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
    PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
    Line: () => <div />,
    Bar: () => <div />,
    Pie: () => <div />,
    Cell: () => <div />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    CartesianGrid: () => <div />,
    Tooltip: () => <div />,
    Legend: () => <div />,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
}));

describe("MarketingAnalyticsDashboardEnhanced", () => {
    const defaultProps = {
        funnelProjectId: "test-funnel-123",
    };

    const mockDashboard = {
        dashboard: {
            overview: {
                total_posts: 150,
                total_opt_ins: 1200,
                overall_oi_1000: 8.5,
                avg_engagement_rate: 10,
                top_platform: "instagram",
            },
            performance_by_post: [
                {
                    id: "post-1",
                    post_preview: "Best performing post",
                    platform: "instagram",
                    published_at: "2024-01-01",
                    impressions: 5000,
                    engagement_rate: 15,
                    opt_ins: 100,
                    oi_1000: 20,
                },
            ],
            platform_breakdown: [
                {
                    platform: "instagram",
                    post_count: 60,
                    total_opt_ins: 600,
                    engagement_rate: 12,
                    oi_1000: 10,
                },
                {
                    platform: "facebook",
                    post_count: 50,
                    total_opt_ins: 400,
                    engagement_rate: 8,
                    oi_1000: 8,
                },
            ],
            framework_performance: [],
            experiments: [],
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it("should load analytics data on mount", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, ...mockDashboard }),
        });

        render(<MarketingAnalyticsDashboardEnhanced {...defaultProps} />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/marketing/analytics")
            );
        });
    });

    it("should display overview metrics", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, ...mockDashboard }),
        });

        render(<MarketingAnalyticsDashboardEnhanced {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("150")).toBeInTheDocument(); // Total posts
            expect(screen.getByText("1200")).toBeInTheDocument(); // Total opt-ins
            expect(screen.getByText("8.5")).toBeInTheDocument(); // O/I-1000
            expect(screen.getByText("10.0%")).toBeInTheDocument(); // Engagement rate
        });
    });

    it("should filter analytics by date range", async () => {
        (global.fetch as any).mockResolvedValue({
            json: async () => ({ success: true, ...mockDashboard }),
        });

        render(<MarketingAnalyticsDashboardEnhanced {...defaultProps} />);

        // Wait for initial load
        await waitFor(() => {
            expect(screen.getByText("Last 7 Days")).toBeInTheDocument();
        });

        const sevenDayButton = screen.getByText("Last 7 Days");
        fireEvent.click(sevenDayButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("range=7d")
            );
        });
    });

    it("should display platform performance section", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, ...mockDashboard }),
        });

        render(<MarketingAnalyticsDashboardEnhanced {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Platform Performance")).toBeInTheDocument();
        });

        // Check that platform data is displayed (platforms are rendered multiple times)
        const instagramElements = screen.getAllByText(/instagram/i);
        const facebookElements = screen.getAllByText(/facebook/i);
        expect(instagramElements.length).toBeGreaterThan(0);
        expect(facebookElements.length).toBeGreaterThan(0);
    });

    it("should display post performance table", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, ...mockDashboard }),
        });

        render(<MarketingAnalyticsDashboardEnhanced {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Post Performance")).toBeInTheDocument();
            expect(screen.getByText("Best performing post")).toBeInTheDocument();
        });
    });

    it("should handle CSV export", async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({
                json: async () => ({ success: true, ...mockDashboard }),
            })
            .mockResolvedValueOnce(new Blob(["test"], { type: "text/csv" }));

        // Mock URL.createObjectURL
        global.URL.createObjectURL = vi.fn(() => "blob:test");

        render(<MarketingAnalyticsDashboardEnhanced {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Export CSV")).toBeInTheDocument();
        });

        const exportButton = screen.getByText("Export CSV");
        fireEvent.click(exportButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/marketing/analytics/export"),
            );
        });
    });

    it("should display loading state", () => {
        (global.fetch as any).mockImplementation(
            () => new Promise(() => {}) // Never resolves
        );

        render(<MarketingAnalyticsDashboardEnhanced {...defaultProps} />);

        expect(screen.getByText(/loading analytics/i)).toBeInTheDocument();
    });

    it("should handle loading error", async () => {
        (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

        const mockLogger = vi.mocked(logger);

        render(<MarketingAnalyticsDashboardEnhanced {...defaultProps} />);

        await waitFor(() => {
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    it("should display empty state when no performance data", async () => {
        const emptyDashboard = {
            dashboard: {
                overview: {
                    total_posts: 0,
                    total_opt_ins: 0,
                    overall_oi_1000: 0,
                    avg_engagement_rate: 0,
                    top_platform: "N/A",
                },
                performance_by_post: [],
                platform_breakdown: [],
                framework_performance: [],
                experiments: [],
            },
        };

        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, ...emptyDashboard }),
        });

        render(<MarketingAnalyticsDashboardEnhanced {...defaultProps} />);

        await waitFor(() => {
            expect(
                screen.getByText("No performance data available yet")
            ).toBeInTheDocument();
        });
    });

    it("should change date range", async () => {
        (global.fetch as any).mockResolvedValue({
            json: async () => ({ success: true, ...mockDashboard }),
        });

        render(<MarketingAnalyticsDashboardEnhanced {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Last 90 Days")).toBeInTheDocument();
        });

        const ninetyDayButton = screen.getByText("Last 90 Days");
        fireEvent.click(ninetyDayButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("range=90d")
            );
        });
    });
});
