/**
 * TrendExplorerEnhanced Component Tests
 * Tests trend discovery, search, filtering, and brief generation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TrendExplorerEnhanced } from "@/components/marketing/trend-explorer-enhanced";
import { logger } from "@/lib/client-logger";

// Mock dependencies
const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
    useToast: () => ({
        toast: mockToast,
    }),
}));

vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

global.fetch = vi.fn();

describe("TrendExplorerEnhanced", () => {
    const mockFetch = global.fetch as ReturnType<typeof vi.fn>;

    const defaultProps = {
        profileId: "test-profile-123",
        funnelProjectId: "test-funnel-456",
    };

    const mockTrends = [
        {
            id: "trend-1",
            title: "AI Content Generation",
            description: "Automated content creation is trending",
            platforms: ["instagram", "linkedin"],
            trend_score: 85,
            category: "technology",
            suggested_angles: ["Efficiency gains", "Cost savings"],
            example_posts: ["Example post 1"],
            created_at: "2024-01-01T00:00:00Z",
        },
        {
            id: "trend-2",
            title: "Short Form Video",
            description: "Short videos dominating social",
            platforms: ["instagram", "facebook"],
            trend_score: 92,
            category: "business",
            suggested_angles: ["Quick tips", "Behind the scenes"],
            example_posts: ["Example post 2"],
            created_at: "2024-01-02T00:00:00Z",
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        mockFetch.mockClear();
        mockToast.mockClear();
    });

    it("should render search interface", () => {
        render(<TrendExplorerEnhanced {...defaultProps} />);

        expect(screen.getByText("Discover Trending Topics")).toBeInTheDocument();
        expect(
            screen.getByPlaceholderText(/Search for trending topics/i)
        ).toBeInTheDocument();
    });

    it("should display platform filter buttons", () => {
        render(<TrendExplorerEnhanced {...defaultProps} />);

        expect(screen.getByRole("button", { name: /Instagram/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Facebook/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /LinkedIn/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Twitter/i })).toBeInTheDocument();
    });

    it("should display date range selector", () => {
        render(<TrendExplorerEnhanced {...defaultProps} />);

        const dateSelect = screen.getByRole("combobox", { name: /Date Range/i });
        expect(dateSelect).toBeInTheDocument();
        expect(
            screen.getByRole("option", { name: /Last 7 Days/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("option", { name: /Last 30 Days/i })
        ).toBeInTheDocument();
    });

    it("should display category filter", () => {
        render(<TrendExplorerEnhanced {...defaultProps} />);

        const categorySelect = screen.getByRole("combobox", { name: /Category/i });
        expect(categorySelect).toBeInTheDocument();
    });

    it("should toggle platform selection", () => {
        render(<TrendExplorerEnhanced {...defaultProps} />);

        const instagramButton = screen.getByRole("button", { name: /Instagram/i });
        expect(instagramButton).not.toHaveClass("bg-primary");

        fireEvent.click(instagramButton);
        expect(instagramButton).toHaveClass("bg-primary");

        fireEvent.click(instagramButton);
        expect(instagramButton).not.toHaveClass("bg-primary");
    });

    it("should show error when searching without criteria", async () => {
        render(<TrendExplorerEnhanced {...defaultProps} />);

        const searchButton = screen.getByRole("button", { name: /Search Trends/i });
        fireEvent.click(searchButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Search Required",
                    variant: "destructive",
                })
            );
        });
    });

    it("should perform search with keyword", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, trends: mockTrends }),
        });

        render(<TrendExplorerEnhanced {...defaultProps} />);

        const searchInput = screen.getByPlaceholderText(/Search for trending topics/i);
        fireEvent.change(searchInput, { target: { value: "AI" } });

        const searchButton = screen.getByRole("button", { name: /Search Trends/i });
        fireEvent.click(searchButton);

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/marketing/trends"),
                undefined
            );
        });
    });

    it("should display trends after successful search", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, trends: mockTrends }),
        });

        render(<TrendExplorerEnhanced {...defaultProps} />);

        const searchInput = screen.getByPlaceholderText(/Search for trending topics/i);
        fireEvent.change(searchInput, { target: { value: "AI" } });

        const searchButton = screen.getByRole("button", { name: /Search Trends/i });
        fireEvent.click(searchButton);

        await waitFor(() => {
            expect(screen.getByText("AI Content Generation")).toBeInTheDocument();
            expect(screen.getByText("Short Form Video")).toBeInTheDocument();
        });
    });

    it("should display trend scores", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, trends: mockTrends }),
        });

        render(<TrendExplorerEnhanced {...defaultProps} />);

        const searchInput = screen.getByPlaceholderText(/Search for trending topics/i);
        fireEvent.change(searchInput, { target: { value: "AI" } });

        const searchButton = screen.getByRole("button", { name: /Search Trends/i });
        fireEvent.click(searchButton);

        await waitFor(() => {
            expect(screen.getByText("Score: 85")).toBeInTheDocument();
            expect(screen.getByText("Score: 92")).toBeInTheDocument();
        });
    });

    it("should show loading state during search", async () => {
        mockFetch.mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100))
        );

        render(<TrendExplorerEnhanced {...defaultProps} />);

        const searchInput = screen.getByPlaceholderText(/Search for trending topics/i);
        fireEvent.change(searchInput, { target: { value: "AI" } });

        const searchButton = screen.getByRole("button", { name: /Search Trends/i });
        fireEvent.click(searchButton);

        expect(screen.getByText("Searching...")).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.queryByText("Searching...")).not.toBeInTheDocument();
        });
    });

    it("should handle search error", async () => {
        mockFetch.mockRejectedValueOnce(new Error("Network error"));

        render(<TrendExplorerEnhanced {...defaultProps} />);

        const searchInput = screen.getByPlaceholderText(/Search for trending topics/i);
        fireEvent.change(searchInput, { target: { value: "AI" } });

        const searchButton = screen.getByRole("button", { name: /Search Trends/i });
        fireEvent.click(searchButton);

        await waitFor(() => {
            expect(logger.error).toHaveBeenCalled();
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Search Failed",
                    variant: "destructive",
                })
            );
        });
    });

    it("should load saved trends on mount", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                trend_ids: ["trend-1", "trend-2"],
            }),
        });

        render(<TrendExplorerEnhanced {...defaultProps} />);

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining(
                    `/api/marketing/trends/saved?funnel_project_id=${defaultProps.funnelProjectId}`
                ),
                undefined
            );
        });
    });

    it("should save trend when bookmark clicked", async () => {
        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, trend_ids: [] }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, trends: mockTrends }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true }),
            });

        render(<TrendExplorerEnhanced {...defaultProps} />);

        const searchInput = screen.getByPlaceholderText(/Search for trending topics/i);
        fireEvent.change(searchInput, { target: { value: "AI" } });

        const searchButton = screen.getByRole("button", { name: /Search Trends/i });
        fireEvent.click(searchButton);

        await waitFor(() => {
            expect(screen.getByText("AI Content Generation")).toBeInTheDocument();
        });

        const bookmarkButtons = screen.getAllByRole("button");
        const bookmarkButton = bookmarkButtons.find((btn) => btn.querySelector("svg"));

        if (bookmarkButton) {
            fireEvent.click(bookmarkButton);

            await waitFor(() => {
                expect(mockToast).toHaveBeenCalledWith(
                    expect.objectContaining({
                        title: "Trend Saved",
                    })
                );
            });
        }
    });

    it("should create brief from trend", async () => {
        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, trend_ids: [] }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, trends: mockTrends }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    brief: { name: "Test Brief" },
                }),
            });

        render(<TrendExplorerEnhanced {...defaultProps} />);

        const searchInput = screen.getByPlaceholderText(/Search for trending topics/i);
        fireEvent.change(searchInput, { target: { value: "AI" } });

        const searchButton = screen.getByRole("button", { name: /Search Trends/i });
        fireEvent.click(searchButton);

        await waitFor(() => {
            expect(screen.getByText("AI Content Generation")).toBeInTheDocument();
        });

        const createBriefButtons = screen.getAllByRole("button", {
            name: /Create Brief/i,
        });
        fireEvent.click(createBriefButtons[0]);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Brief Created from Trend",
                })
            );
        });
    });

    it("should open trend details panel when trend clicked", async () => {
        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, trend_ids: [] }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, trends: mockTrends }),
            });

        render(<TrendExplorerEnhanced {...defaultProps} />);

        const searchInput = screen.getByPlaceholderText(/Search for trending topics/i);
        fireEvent.change(searchInput, { target: { value: "AI" } });

        const searchButton = screen.getByRole("button", { name: /Search Trends/i });
        fireEvent.click(searchButton);

        await waitFor(() => {
            expect(screen.getByText("AI Content Generation")).toBeInTheDocument();
        });

        const trendCard = screen.getByText("AI Content Generation").closest("div");
        if (trendCard) {
            fireEvent.click(trendCard);
        }

        await waitFor(() => {
            expect(screen.getByText("Trend Details")).toBeInTheDocument();
        });
    });

    it("should display empty state when no trends found", () => {
        render(<TrendExplorerEnhanced {...defaultProps} />);

        expect(screen.getByText("Discover Trending Topics")).toBeInTheDocument();
        expect(
            screen.getByText(/Search for trending topics to create timely/i)
        ).toBeInTheDocument();
    });

    it("should allow searching with Enter key", async () => {
        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, trend_ids: [] }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, trends: mockTrends }),
            });

        render(<TrendExplorerEnhanced {...defaultProps} />);

        const searchInput = screen.getByPlaceholderText(/Search for trending topics/i);
        fireEvent.change(searchInput, { target: { value: "AI" } });
        fireEvent.keyPress(searchInput, { key: "Enter", code: "Enter", charCode: 13 });

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/marketing/trends"),
                undefined
            );
        });
    });
});
