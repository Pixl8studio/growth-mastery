/**
 * FunnelSettingsView Component Tests
 * Tests settings tabs interface
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FunnelSettingsView } from "@/components/funnel/funnel-settings-view";

// Mock child components
vi.mock("@/components/funnel/settings/domain-settings", () => ({
    DomainSettings: () => <div>Domain Settings</div>,
}));

vi.mock("@/components/funnel/settings/social-integrations", () => ({
    SocialIntegrations: () => <div>Social Integrations</div>,
}));

vi.mock("@/components/funnel/settings/calendar-integration", () => ({
    CalendarIntegration: () => <div>Calendar Integration</div>,
}));

vi.mock("@/components/funnel/settings/email-domain-settings", () => ({
    EmailDomainSettings: () => <div>Email Domain Settings</div>,
}));

describe("FunnelSettingsView", () => {
    const defaultProps = {
        projectId: "test-project-123",
    };

    it("should render settings heading", () => {
        render(<FunnelSettingsView {...defaultProps} />);

        expect(screen.getByText("Funnel Settings")).toBeInTheDocument();
    });

    it("should display domain settings by default", () => {
        render(<FunnelSettingsView {...defaultProps} />);

        expect(screen.getByText("Domain Settings")).toBeInTheDocument();
    });

    it("should display settings description", () => {
        render(<FunnelSettingsView {...defaultProps} />);

        expect(
            screen.getByText(
                /Configure domain, social media, and calendar integrations/i
            )
        ).toBeInTheDocument();
    });
});
