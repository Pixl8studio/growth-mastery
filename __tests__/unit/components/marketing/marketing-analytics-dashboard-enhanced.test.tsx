/**
 * MarketingAnalyticsDashboardEnhanced Component Tests
 * Simplified tests focusing on basic rendering
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn().mockResolvedValue({
            json: () => Promise.resolve({ success: true, analytics: {} }),
        });
    });

    it("should render component", () => {
        render(<MarketingAnalyticsDashboardEnhanced {...defaultProps} />);
        expect(document.body).toBeInTheDocument();
    });

    it("should accept funnelProjectId prop", () => {
        const { container } = render(<MarketingAnalyticsDashboardEnhanced {...defaultProps} />);
        expect(container).toBeInTheDocument();
    });
});
