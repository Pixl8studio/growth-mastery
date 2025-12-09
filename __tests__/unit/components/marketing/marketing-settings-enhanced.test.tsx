/**
 * MarketingSettingsEnhanced Component Tests
 * Tests comprehensive marketing settings with profiles, integrations, and compliance
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

// Import mocked modules
import { logger } from "@/lib/client-logger";

// Mock child components
vi.mock("@/components/marketing/profile-config-form-enhanced", () => ({
    ProfileConfigFormEnhanced: ({ profile }: any) => (
        <div data-testid="profile-config-form">Profile Form: {profile.id}</div>
    ),
}));

describe("MarketingSettingsEnhanced", () => {
    const defaultProps = {
        funnelProjectId: "test-funnel-123",
        profileId: "profile-1",
    };

    const mockProfile = {
        id: "profile-1",
        funnel_project_id: "test-funnel-123",
        brand_voice: "Professional and friendly",
        tone_settings: {
            conversational_professional: 50,
            warmth: 70,
            urgency: 40,
            empathy: 60,
            confidence: 75,
        },
        echo_mode_config: {
            enabled: true,
        },
        story_themes: ["founder_saga", "myth_buster"],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it("should render correctly with all sections", async () => {
        render(<MarketingSettingsEnhanced {...defaultProps} />);

        // Component renders sections as cards, not tabs
        await waitFor(() => {
            expect(screen.getByText("Platform Connections")).toBeInTheDocument();
            expect(screen.getByText("Publishing Preferences")).toBeInTheDocument();
            expect(screen.getByText("Compliance Settings")).toBeInTheDocument();
        });
    });

    it("should load connections on mount", async () => {
        // Component loads connections via Supabase, not fetch
        render(<MarketingSettingsEnhanced {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Loading connections...")).toBeInTheDocument();
        });
    });

    it("should display platform integration options", async () => {
        render(<MarketingSettingsEnhanced {...defaultProps} />);

        // Wait for component to render
        await waitFor(() => {
            expect(screen.getByText("Platform Connections")).toBeInTheDocument();
        });

        // Check that all platforms are displayed
        expect(screen.getByText("Instagram")).toBeInTheDocument();
        expect(screen.getByText("Facebook")).toBeInTheDocument();
        expect(screen.getByText("LinkedIn")).toBeInTheDocument();
        expect(screen.getByText(/Twitter/)).toBeInTheDocument();
    });

    it("should handle platform connection", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ url: "https://oauth.url" }),
        });

        // Mock window.location.href
        delete (window as any).location;
        (window as any).location = { href: "" };

        render(<MarketingSettingsEnhanced {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Platform Connections")).toBeInTheDocument();
        });

        const connectButtons = screen.getAllByText("Connect");
        fireEvent.click(connectButtons[0]);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/integrations/"),
            );
        });
    });

    it("should display compliance settings", async () => {
        render(<MarketingSettingsEnhanced {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Compliance Settings")).toBeInTheDocument();
            expect(screen.getByText("Industry")).toBeInTheDocument();
        });
    });

    it("should display loading state initially", () => {
        render(<MarketingSettingsEnhanced {...defaultProps} />);

        expect(screen.getByText("Loading connections...")).toBeInTheDocument();
    });
});
