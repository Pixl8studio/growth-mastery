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

    const mockAnalytics = {
        overview: {
            total_posts: 150,
            total_impressions: 50000,
            total_engagement: 5000,
            engagement_rate: 10,
        },
        performance_by_platform: {
            instagram: { posts: 60, impressions: 25000, engagement: 2500 },
            facebook: { posts: 50, impressions: 15000, engagement: 1500 },
            linkedin: { posts: 40, impressions: 10000, engagement: 1000 },
        },
        top_performing_posts: [
            {
                id: "post-1",
                copy_text: "Best performing post",
                platform: "instagram",
                impressions: 5000,
                engagement_rate: 15,
            },
        ],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it("should render correctly with header", () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, analytics: mockAnalytics }),
        });

        render(<MarketingAnalyticsDashboardEnhanced {...defaultProps} />);

        expect(screen.getByText("Marketing Analytics")).toBeInTheDocument();
        expect(
            screen.getByText("Performance insights and metrics")
        ).toBeInTheDocument();
    });

    it("should load analytics data on mount", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, analytics: mockAnalytics }),
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
            json: async () => ({ success: true, analytics: mockAnalytics }),
        });

        render(<MarketingAnalyticsDashboardEnhanced {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("150")).toBeInTheDocument(); // Total posts
            expect(screen.getByText("50,000")).toBeInTheDocument(); // Total impressions
            expect(screen.getByText("5,000")).toBeInTheDocument(); // Total engagement
            expect(screen.getByText("10%")).toBeInTheDocument(); // Engagement rate
        });
    });

    it("should filter analytics by date range", async () => {
        (global.fetch as any).mockResolvedValue({
            json: async () => ({ success: true, analytics: mockAnalytics }),
        });

        render(<MarketingAnalyticsDashboardEnhanced {...defaultProps} />);

        const dateRangeSelect = screen.getByRole("combobox", { name: /date range/i });
        fireEvent.change(dateRangeSelect, { target: { value: "7d" } });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("date_range=7d")
            );
        });
    });

    it("should filter analytics by platform", async () => {
        (global.fetch as any).mockResolvedValue({
            json: async () => ({ success: true, analytics: mockAnalytics }),
        });

        render(<MarketingAnalyticsDashboardEnhanced {...defaultProps} />);

        const platformSelect = screen.getByRole("combobox", { name: /platform/i });
        fireEvent.change(platformSelect, { target: { value: "instagram" } });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("platform=instagram")
            );
        });
    });

    it("should display performance by platform chart", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, analytics: mockAnalytics }),
        });

        render(<MarketingAnalyticsDashboardEnhanced {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
        });
    });

    it("should display engagement trends chart", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, analytics: mockAnalytics }),
        });

        render(<MarketingAnalyticsDashboardEnhanced {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByTestId("line-chart")).toBeInTheDocument();
        });
    });

    it("should display top performing posts", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, analytics: mockAnalytics }),
        });

        render(<MarketingAnalyticsDashboardEnhanced {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Top Performing Posts")).toBeInTheDocument();
            expect(screen.getByText("Best performing post")).toBeInTheDocument();
        });
    });

    it("should handle export analytics", async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({
                json: async () => ({ success: true, analytics: mockAnalytics }),
            })
            .mockResolvedValueOnce({
                json: async () => ({ success: true, export_url: "https://export.csv" }),
            });

        render(<MarketingAnalyticsDashboardEnhanced {...defaultProps} />);

        const exportButton = screen.getByText(/export/i);
        fireEvent.click(exportButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/marketing/analytics/export"),
                expect.objectContaining({
                    method: "POST",
                })
            );
        });
    });

    it("should refresh analytics data", async () => {
        (global.fetch as any).mockResolvedValue({
            json: async () => ({ success: true, analytics: mockAnalytics }),
        });

        render(<MarketingAnalyticsDashboardEnhanced {...defaultProps} />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });

        const refreshButton = screen.getByRole("button", { name: /refresh/i });
        fireEvent.click(refreshButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });
    });

    it("should display loading state", () => {
        (global.fetch as any).mockImplementation(
            () => new Promise(() => {}) // Never resolves
        );

        render(<MarketingAnalyticsDashboardEnhanced {...defaultProps} />);

        expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it("should handle loading error", async () => {
        (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

        const { logger } = require("@/lib/client-logger");

        render(<MarketingAnalyticsDashboardEnhanced {...defaultProps} />);

        await waitFor(() => {
            expect(logger.error).toHaveBeenCalled();
        });
    });

    it("should display empty state when no data", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({
                success: true,
                analytics: {
                    overview: {
                        total_posts: 0,
                        total_impressions: 0,
                        total_engagement: 0,
                        engagement_rate: 0,
                    },
                },
            }),
        });

        render(<MarketingAnalyticsDashboardEnhanced {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("No Data Available")).toBeInTheDocument();
        });
    });

    it("should toggle between chart types", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, analytics: mockAnalytics }),
        });

        render(<MarketingAnalyticsDashboardEnhanced {...defaultProps} />);

        await waitFor(() => {
            const chartTypeToggle = screen.getByRole("button", {
                name: /chart type/i,
            });
            fireEvent.click(chartTypeToggle);
        });
    });
});
