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

// Mock child components
vi.mock("@/components/marketing/profile-config-form-enhanced", () => ({
    ProfileConfigFormEnhanced: ({ profile }: any) => (
        <div data-testid="profile-config-form">Profile Form: {profile.id}</div>
    ),
}));

describe("MarketingSettingsEnhanced", () => {
    const defaultProps = {
        funnelProjectId: "test-funnel-123",
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

    it("should render correctly with tabs", () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, profile: mockProfile }),
        });

        render(<MarketingSettingsEnhanced {...defaultProps} />);

        expect(screen.getByText("Marketing Settings")).toBeInTheDocument();
        expect(screen.getByText("Brand Voice")).toBeInTheDocument();
        expect(screen.getByText("Integrations")).toBeInTheDocument();
        expect(screen.getByText("Compliance")).toBeInTheDocument();
    });

    it("should load marketing profile on mount", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, profile: mockProfile }),
        });

        render(<MarketingSettingsEnhanced {...defaultProps} />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/marketing/profiles")
            );
        });
    });

    it("should switch between tabs", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, profile: mockProfile }),
        });

        render(<MarketingSettingsEnhanced {...defaultProps} />);

        const integrationsTab = screen.getByText("Integrations");
        fireEvent.click(integrationsTab);

        expect(screen.getByText("Platform Connections")).toBeInTheDocument();

        const complianceTab = screen.getByText("Compliance");
        fireEvent.click(complianceTab);

        expect(screen.getByText("Compliance Settings")).toBeInTheDocument();
    });

    it("should display brand voice tab content", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, profile: mockProfile }),
        });

        render(<MarketingSettingsEnhanced {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByTestId("profile-config-form")).toBeInTheDocument();
        });
    });

    it("should display platform integration options", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, profile: mockProfile }),
        });

        render(<MarketingSettingsEnhanced {...defaultProps} />);

        const integrationsTab = screen.getByText("Integrations");
        fireEvent.click(integrationsTab);

        expect(screen.getByText("Instagram")).toBeInTheDocument();
        expect(screen.getByText("Facebook")).toBeInTheDocument();
        expect(screen.getByText("LinkedIn")).toBeInTheDocument();
        expect(screen.getByText("Twitter")).toBeInTheDocument();
    });

    it("should handle platform connection", async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({
                json: async () => ({ success: true, profile: mockProfile }),
            })
            .mockResolvedValueOnce({
                json: async () => ({ success: true, auth_url: "https://oauth.url" }),
            });

        render(<MarketingSettingsEnhanced {...defaultProps} />);

        const integrationsTab = screen.getByText("Integrations");
        fireEvent.click(integrationsTab);

        await waitFor(() => {
            const connectButton = screen.getAllByText(/connect/i)[0];
            fireEvent.click(connectButton);
        });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/marketing/integrations/connect"),
                expect.objectContaining({
                    method: "POST",
                })
            );
        });
    });

    it("should handle platform disconnection", async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({
                json: async () => ({ success: true, profile: mockProfile }),
            })
            .mockResolvedValueOnce({
                json: async () => ({ success: true }),
            });

        global.confirm = vi.fn(() => true);

        render(<MarketingSettingsEnhanced {...defaultProps} />);

        const integrationsTab = screen.getByText("Integrations");
        fireEvent.click(integrationsTab);

        await waitFor(() => {
            const disconnectButton = screen.queryByText(/disconnect/i);
            if (disconnectButton) {
                fireEvent.click(disconnectButton);
            }
        });
    });

    it("should display compliance settings", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, profile: mockProfile }),
        });

        render(<MarketingSettingsEnhanced {...defaultProps} />);

        const complianceTab = screen.getByText("Compliance");
        fireEvent.click(complianceTab);

        expect(screen.getByText("Industry")).toBeInTheDocument();
        expect(screen.getByText("Required Disclaimers")).toBeInTheDocument();
    });

    it("should save compliance settings", async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({
                json: async () => ({ success: true, profile: mockProfile }),
            })
            .mockResolvedValueOnce({
                json: async () => ({ success: true }),
            });

        render(<MarketingSettingsEnhanced {...defaultProps} />);

        const complianceTab = screen.getByText("Compliance");
        fireEvent.click(complianceTab);

        await waitFor(() => {
            const saveButton = screen.getByText(/save/i);
            fireEvent.click(saveButton);
        });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/marketing/profiles/"),
                expect.objectContaining({
                    method: "PUT",
                })
            );
        });
    });

    it("should display API keys section", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, profile: mockProfile }),
        });

        render(<MarketingSettingsEnhanced {...defaultProps} />);

        const integrationsTab = screen.getByText("Integrations");
        fireEvent.click(integrationsTab);

        expect(screen.getByText("API Keys")).toBeInTheDocument();
    });

    it("should handle error loading profile", async () => {
        (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

        const { logger } = require("@/lib/client-logger");

        render(<MarketingSettingsEnhanced {...defaultProps} />);

        await waitFor(() => {
            expect(logger.error).toHaveBeenCalled();
        });
    });

    it("should display loading state", () => {
        (global.fetch as any).mockImplementation(
            () => new Promise(() => {}) // Never resolves
        );

        render(<MarketingSettingsEnhanced {...defaultProps} />);

        expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
});
