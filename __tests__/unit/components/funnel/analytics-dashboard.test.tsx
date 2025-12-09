/**
 * FunnelAnalyticsDashboard Component Tests
 * Simplified tests that verify basic rendering without testing async data fetching
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { FunnelAnalyticsDashboard } from "@/components/funnel/analytics-dashboard";

// Mock dependencies
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock fetch to return immediately with basic data
global.fetch = vi.fn(() =>
    Promise.resolve({
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
    })
) as any;

describe("FunnelAnalyticsDashboard", () => {
    const defaultProps = {
        projectId: "test-project-123",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render without crashing", () => {
        render(<FunnelAnalyticsDashboard {...defaultProps} />);
        expect(screen.getByText("Loading analytics...")).toBeInTheDocument();
    });

    it("should accept projectId prop", () => {
        const { container } = render(<FunnelAnalyticsDashboard {...defaultProps} />);
        expect(container).toBeTruthy();
    });

    it("should render loading state initially", () => {
        render(<FunnelAnalyticsDashboard {...defaultProps} />);
        expect(screen.getByText("Loading analytics...")).toBeInTheDocument();
    });
});
