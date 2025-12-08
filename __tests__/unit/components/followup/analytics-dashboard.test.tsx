/**
 * AnalyticsDashboard Component Tests
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnalyticsDashboard } from "@/components/followup/analytics-dashboard";

describe("AnalyticsDashboard", () => {
    const mockData = {
        sequences: [
            {
                id: "seq-1",
                name: "3-Day Discount Sequence",
                sent: 100,
                opened: 75,
                clicked: 30,
                replied: 10,
                converted: 5,
                revenue: 5000,
            },
            {
                id: "seq-2",
                name: "Nurture Sequence",
                sent: 50,
                opened: 40,
                clicked: 15,
                replied: 5,
                converted: 2,
                revenue: 2000,
            },
        ],
        overall: {
            totalSent: 150,
            totalOpened: 115,
            totalClicked: 45,
            totalReplied: 15,
            totalConverted: 7,
            totalRevenue: 7000,
        },
    };

    it("should render without crashing", () => {
        render(<AnalyticsDashboard data={mockData} />);
        expect(screen.getByText("Analytics Dashboard")).toBeInTheDocument();
    });

    it("should calculate and display correct open rate", () => {
        render(<AnalyticsDashboard data={mockData} />);

        // Open rate = (115 / 150) * 100 = 76.7%
        expect(screen.getByText("76.7%")).toBeInTheDocument();
    });

    it("should format currency correctly", () => {
        render(<AnalyticsDashboard data={mockData} />);

        expect(screen.getByText("$7,000")).toBeInTheDocument();
    });

    it("should display all sequences", () => {
        render(<AnalyticsDashboard data={mockData} />);

        expect(screen.getByText("3-Day Discount Sequence")).toBeInTheDocument();
        expect(screen.getByText("Nurture Sequence")).toBeInTheDocument();
    });

    it("should show sequence metrics", () => {
        render(<AnalyticsDashboard data={mockData} />);

        // Check first sequence sent count
        expect(screen.getByText("100 sent")).toBeInTheDocument();
        expect(screen.getByText("50 sent")).toBeInTheDocument();
    });

    it("should display engagement funnel", () => {
        render(<AnalyticsDashboard data={mockData} />);

        expect(screen.getByText("Engagement Funnel")).toBeInTheDocument();
        expect(screen.getByText("Sent")).toBeInTheDocument();
        expect(screen.getByText("Opened")).toBeInTheDocument();
        expect(screen.getByText("Clicked")).toBeInTheDocument();
        expect(screen.getByText("Converted")).toBeInTheDocument();
    });

    it("should show funnel counts with percentages", () => {
        render(<AnalyticsDashboard data={mockData} />);

        // Should show 150 sent (100%)
        expect(screen.getByText(/150.*\(100%\)/)).toBeInTheDocument();
    });

    it("should render top performing content section", () => {
        render(<AnalyticsDashboard data={mockData} />);

        expect(screen.getByText("💎 Top Performing Content")).toBeInTheDocument();
        expect(screen.getByText(/Subject: Quick question.../)).toBeInTheDocument();
        expect(screen.getByText(/CTA: See the results →/)).toBeInTheDocument();
    });

    it("should handle empty sequences array", () => {
        const emptyData = {
            sequences: [],
            overall: {
                totalSent: 0,
                totalOpened: 0,
                totalClicked: 0,
                totalReplied: 0,
                totalConverted: 0,
                totalRevenue: 0,
            },
        };

        render(<AnalyticsDashboard data={emptyData} />);

        expect(
            screen.getByText("No sequence data yet. Start sending follow-ups to see performance metrics.")
        ).toBeInTheDocument();
    });

    it("should display progress bars for sequences", () => {
        render(<AnalyticsDashboard data={mockData} />);

        // Progress bars are rendered as divs with bg-primary, bg-purple-500, bg-green-500
        const progressBars = document.querySelectorAll(".h-2.bg-gray-200");
        expect(progressBars.length).toBeGreaterThan(0);
    });

    it("should show sequence revenue in badges", () => {
        render(<AnalyticsDashboard data={mockData} />);

        expect(screen.getByText("$5,000")).toBeInTheDocument();
        expect(screen.getByText("$2,000")).toBeInTheDocument();
    });

    it("should display open counts", () => {
        render(<AnalyticsDashboard data={mockData} />);

        expect(screen.getByText("115 opens")).toBeInTheDocument();
    });

    it("should display click counts", () => {
        render(<AnalyticsDashboard data={mockData} />);

        expect(screen.getByText("45 clicks")).toBeInTheDocument();
    });

    it("should display conversion counts", () => {
        render(<AnalyticsDashboard data={mockData} />);

        expect(screen.getByText("7 conversions")).toBeInTheDocument();
    });
});
