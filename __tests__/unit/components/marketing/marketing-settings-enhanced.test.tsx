/**
 * MarketingSettingsEnhanced Component Tests
 * Simplified tests for basic rendering
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MarketingSettingsEnhanced } from "@/components/marketing/marketing-settings-enhanced";

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

// Mock child components
vi.mock("@/components/marketing/profile-config-form-enhanced", () => ({
  ProfileConfigFormEnhanced: () => (
    <div data-testid="profile-config-form">Profile Form</div>
  ),
}));

describe("MarketingSettingsEnhanced", () => {
  const defaultProps = {
    funnelProjectId: "test-funnel-123",
    profileId: "test-profile-456",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch to return empty success responses
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, profile: null }),
    });
  });

  it("should render without crashing", async () => {
    const { container } = render(<MarketingSettingsEnhanced {...defaultProps} />);
    expect(container).toBeTruthy();
    // Wait for async operations to settle
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  });

  it("should render component with content", async () => {
    const { container } = render(<MarketingSettingsEnhanced {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
    expect(container.querySelector("div")).toBeTruthy();
    // Wait for async operations to settle
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  });
});
