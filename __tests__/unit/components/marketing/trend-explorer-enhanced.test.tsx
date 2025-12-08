/**
 * TrendExplorerEnhanced Component Tests (Simplified)
 * Tests basic rendering only - no async operations
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { TrendExplorerEnhanced } from "@/components/marketing/trend-explorer-enhanced";

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

// Mock fetch to return empty success responses
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, trends: [], trend_ids: [] }),
  })
) as ReturnType<typeof vi.fn>;

describe("TrendExplorerEnhanced", () => {
  const defaultProps = {
    profileId: "test-profile-123",
    funnelProjectId: "test-funnel-456",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render search interface without crashing", async () => {
    render(<TrendExplorerEnhanced {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/Search for trending topics/i)
      ).toBeInTheDocument();
    });

    expect(
      screen.getAllByText("Discover Trending Topics").length
    ).toBeGreaterThan(0);
  });

  it("should display platform filter buttons", async () => {
    render(<TrendExplorerEnhanced {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Instagram/i })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /Facebook/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /LinkedIn/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Twitter/i })).toBeInTheDocument();
  });

  it("should display empty state by default", async () => {
    render(<TrendExplorerEnhanced {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText(/Search for trending topics to create timely/i)
      ).toBeInTheDocument();
    });
  });
});
