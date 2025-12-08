/**
 * AdsPerformanceDashboard Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdsPerformanceDashboard } from "@/components/ads/ads-performance-dashboard";

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock fetch
global.fetch = vi.fn();

describe("AdsPerformanceDashboard", () => {
    const mockProps = {
        campaignId: "campaign-123",
    };

    const mockMetricsData = {
        metrics: {
            spend_cents: 50000,
            leads: 25,
            cost_per_lead_cents: 2000,
            ctr_percent: 2.5,
            clicks: 100,
            impressions: 4000,
            cpc_cents: 500,
            cpm_cents: 1250,
        },
        campaign: {
            id: "campaign-123",
            name: "Webinar Campaign",
            is_active: true,
            daily_budget_cents: 10000,
        },
        snapshots: [],
    };

    beforeEach(() => {
        vi.clearAllMocks();

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockMetricsData,
        });
    });

    it("should render loading state initially", () => {
        render(<AdsPerformanceDashboard {...mockProps} />);

        expect(screen.getByText("Loading performance data...")).toBeInTheDocument();
    });

    it("should render campaign name after loading", async () => {
        render(<AdsPerformanceDashboard {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Webinar Campaign")).toBeInTheDocument();
        });
    });

    it("should display total spend", async () => {
        render(<AdsPerformanceDashboard {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("$500.00")).toBeInTheDocument();
        });
    });

    it("should display leads count", async () => {
        render(<AdsPerformanceDashboard {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("25")).toBeInTheDocument();
        });
    });

    it("should display cost per lead", async () => {
        render(<AdsPerformanceDashboard {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("$20.00")).toBeInTheDocument();
        });
    });

    it("should display CTR percentage", async () => {
        render(<AdsPerformanceDashboard {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("2.50%")).toBeInTheDocument();
        });
    });

    it("should show active status badge", async () => {
        render(<AdsPerformanceDashboard {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Active")).toBeInTheDocument();
        });
    });

    it("should handle time range selection", async () => {
        render(<AdsPerformanceDashboard {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Webinar Campaign")).toBeInTheDocument();
        });

        const select = screen.getByRole("combobox");
        fireEvent.click(select);

        const option = screen.getByText("Last 30 days");
        fireEvent.click(option);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledTimes(4); // Initial + optimizations + after change
        });
    });

    it("should display impressions", async () => {
        render(<AdsPerformanceDashboard {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("4,000")).toBeInTheDocument();
        });
    });

    it("should display CPC", async () => {
        render(<AdsPerformanceDashboard {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("$5.00")).toBeInTheDocument();
        });
    });

    it("should display CPM", async () => {
        render(<AdsPerformanceDashboard {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("$12.50")).toBeInTheDocument();
        });
    });

    it("should show no metrics message when data unavailable", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ metrics: null, campaign: null, snapshots: [] }),
        });

        render(<AdsPerformanceDashboard {...mockProps} />);

        await waitFor(() => {
            expect(
                screen.getByText(
                    "No metrics available yet. Ads may still be in review or just started."
                )
            ).toBeInTheDocument();
        });
    });

    it("should display optimizations when available", async () => {
        const mockOptimizations = [
            {
                id: "opt-1",
                optimization_type: "pause_ad",
                reason: "High CPL - pausing underperforming ad",
                status: "recommended",
                created_at: "2024-01-01T00:00:00Z",
            },
        ];

        (global.fetch as any).mockImplementation((url: string) => {
            if (url.includes("/optimize")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ optimizations: mockOptimizations }),
                });
            }
            return Promise.resolve({
                ok: true,
                json: async () => mockMetricsData,
            });
        });

        render(<AdsPerformanceDashboard {...mockProps} />);

        await waitFor(() => {
            expect(
                screen.getByText("AI Optimization Recommendations (1)")
            ).toBeInTheDocument();
        });
    });

    it("should handle execute optimization button click", async () => {
        const mockOptimizations = [
            {
                id: "opt-1",
                optimization_type: "pause_ad",
                reason: "High CPL",
                status: "recommended",
                created_at: "2024-01-01T00:00:00Z",
            },
        ];

        (global.fetch as any).mockImplementation((url: string) => {
            if (url.includes("/optimize")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ optimizations: mockOptimizations }),
                });
            }
            return Promise.resolve({
                ok: true,
                json: async () => mockMetricsData,
            });
        });

        render(<AdsPerformanceDashboard {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Execute")).toBeInTheDocument();
        });

        const executeButton = screen.getByText("Execute");
        fireEvent.click(executeButton);

        // Component should reload optimizations after execution - verify fetch was called with optimize URL
        await waitFor(() => {
            const fetchCalls = (global.fetch as any).mock.calls;
            const hasOptimizeCall = fetchCalls.some((call: string[]) =>
                call[0]?.includes("/optimize")
            );
            expect(hasOptimizeCall).toBe(true);
        });
    });
});
