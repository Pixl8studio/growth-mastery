/**
 * FunnelAnalyticsDashboard Component Tests
 * Tests analytics display with metrics, charts, and time range filtering
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { FunnelAnalyticsDashboard } from "@/components/funnel/analytics-dashboard";
import { logger } from "@/lib/client-logger";

// Mock dependencies
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

global.fetch = vi.fn();

describe("FunnelAnalyticsDashboard", () => {
    const mockFetch = global.fetch as ReturnType<typeof vi.fn>;

    const mockAnalyticsData = {
        registrations: 100,
        views: 75,
        enrollments: 25,
        revenue: 5000,
        watchRate: 75.0,
        enrollmentRate: 33.33,
        revenuePerRegistrant: 50.0,
    };

    const defaultProps = {
        projectId: "test-project-123",
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockFetch.mockClear();
    });

    it("should render loading state initially", () => {
        mockFetch.mockImplementation(
            () => new Promise(() => {}) // Never resolves
        );

        render(<FunnelAnalyticsDashboard {...defaultProps} />);

        expect(screen.getByText("Loading analytics...")).toBeInTheDocument();
    });

    it("should fetch analytics data on mount", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockAnalyticsData,
        });

        render(<FunnelAnalyticsDashboard {...defaultProps} />);

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining(
                    `/api/analytics/funnel?project_id=${defaultProps.projectId}`
                ),
                undefined
            );
        });
    });

    it("should display registrations metric", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockAnalyticsData,
        });

        render(<FunnelAnalyticsDashboard {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Registrations")).toBeInTheDocument();
            expect(screen.getByText("100")).toBeInTheDocument();
        });
    });

    it("should display video views metric", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockAnalyticsData,
        });

        render(<FunnelAnalyticsDashboard {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Video Views")).toBeInTheDocument();
            expect(screen.getByText("75")).toBeInTheDocument();
        });
    });

    it("should display conversions metric", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockAnalyticsData,
        });

        render(<FunnelAnalyticsDashboard {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Conversions")).toBeInTheDocument();
            expect(screen.getByText("25")).toBeInTheDocument();
        });
    });

    it("should display revenue metric", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockAnalyticsData,
        });

        render(<FunnelAnalyticsDashboard {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Revenue")).toBeInTheDocument();
            expect(screen.getByText("$5,000")).toBeInTheDocument();
        });
    });

    it("should display watch rate", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockAnalyticsData,
        });

        render(<FunnelAnalyticsDashboard {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Watch Rate")).toBeInTheDocument();
            expect(screen.getByText("75.0%")).toBeInTheDocument();
        });
    });

    it("should display enrollment rate", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockAnalyticsData,
        });

        render(<FunnelAnalyticsDashboard {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Enrollment Rate")).toBeInTheDocument();
            expect(screen.getByText("33.3%")).toBeInTheDocument();
        });
    });

    it("should display revenue per registrant", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockAnalyticsData,
        });

        render(<FunnelAnalyticsDashboard {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Rev per Registrant")).toBeInTheDocument();
            expect(screen.getByText("$50.00")).toBeInTheDocument();
        });
    });

    it("should display conversion funnel visualization", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockAnalyticsData,
        });

        render(<FunnelAnalyticsDashboard {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Conversion Funnel")).toBeInTheDocument();
            expect(screen.getByText("Registrations")).toBeInTheDocument();
            expect(screen.getByText("Watched Video")).toBeInTheDocument();
            expect(screen.getByText("Converted")).toBeInTheDocument();
        });
    });

    it("should handle API error", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: "API error" }),
        });

        render(<FunnelAnalyticsDashboard {...defaultProps} />);

        await waitFor(() => {
            expect(logger.error).toHaveBeenCalled();
        });
    });

    it("should handle network error", async () => {
        mockFetch.mockRejectedValueOnce(new Error("Network error"));

        render(<FunnelAnalyticsDashboard {...defaultProps} />);

        await waitFor(() => {
            expect(logger.error).toHaveBeenCalled();
        });
    });

    it("should display empty state when no data", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                registrations: 0,
                views: 0,
                enrollments: 0,
                revenue: 0,
                watchRate: 0,
                enrollmentRate: 0,
                revenuePerRegistrant: 0,
            }),
        });

        render(<FunnelAnalyticsDashboard {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("No Data Yet")).toBeInTheDocument();
            expect(
                screen.getByText(
                    /Complete your funnel setup and start driving traffic/i
                )
            ).toBeInTheDocument();
        });
    });

    it("should display time range selector", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockAnalyticsData,
        });

        render(<FunnelAnalyticsDashboard {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Last 7 days")).toBeInTheDocument();
            expect(screen.getByText("Last 30 days")).toBeInTheDocument();
            expect(screen.getByText("Last 90 days")).toBeInTheDocument();
        });
    });

    it("should display performance metrics header", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockAnalyticsData,
        });

        render(<FunnelAnalyticsDashboard {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Performance Metrics")).toBeInTheDocument();
        });
    });

    it("should format large numbers with commas", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                ...mockAnalyticsData,
                registrations: 1234,
                revenue: 12345,
            }),
        });

        render(<FunnelAnalyticsDashboard {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("1,234")).toBeInTheDocument();
            expect(screen.getByText("$12,345")).toBeInTheDocument();
        });
    });

    it("should calculate conversion rate correctly", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockAnalyticsData,
        });

        render(<FunnelAnalyticsDashboard {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("33.33% conversion rate")).toBeInTheDocument();
        });
    });

    it("should display progress bars for rates", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockAnalyticsData,
        });

        render(<FunnelAnalyticsDashboard {...defaultProps} />);

        await waitFor(() => {
            const progressBars = document.querySelectorAll(".h-2.w-full");
            expect(progressBars.length).toBeGreaterThan(0);
        });
    });
});
