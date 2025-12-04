/**
 * SocialIntegrations Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SocialIntegrations } from "@/components/funnel/settings/social-integrations";

// Mock child components
vi.mock("@/components/funnel/settings/facebook-integration", () => ({
    FacebookIntegration: ({ projectId }: { projectId: string }) => (
        <div data-testid="facebook-integration">Facebook: {projectId}</div>
    ),
}));

vi.mock("@/components/funnel/settings/instagram-integration", () => ({
    InstagramIntegration: ({ projectId }: { projectId: string }) => (
        <div data-testid="instagram-integration">Instagram: {projectId}</div>
    ),
}));

vi.mock("@/components/funnel/settings/twitter-integration", () => ({
    TwitterIntegration: ({ projectId }: { projectId: string }) => (
        <div data-testid="twitter-integration">Twitter: {projectId}</div>
    ),
}));

vi.mock("@/components/funnel/settings/gmail-integration", () => ({
    GmailIntegration: ({ projectId }: { projectId: string }) => (
        <div data-testid="gmail-integration">Gmail: {projectId}</div>
    ),
}));

describe("SocialIntegrations", () => {
    const mockProps = {
        projectId: "project-123",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render social integrations title", () => {
        render(<SocialIntegrations {...mockProps} />);

        expect(screen.getByText("Social Media Integrations")).toBeInTheDocument();
    });

    it("should render description", () => {
        render(<SocialIntegrations {...mockProps} />);

        expect(
            screen.getByText(
                "Connect your social media accounts to enable posting and engagement features"
            )
        ).toBeInTheDocument();
    });

    it("should render Facebook integration", () => {
        render(<SocialIntegrations {...mockProps} />);

        expect(screen.getByTestId("facebook-integration")).toBeInTheDocument();
        expect(screen.getByText("Facebook: project-123")).toBeInTheDocument();
    });

    it("should render Instagram integration", () => {
        render(<SocialIntegrations {...mockProps} />);

        expect(screen.getByTestId("instagram-integration")).toBeInTheDocument();
        expect(screen.getByText("Instagram: project-123")).toBeInTheDocument();
    });

    it("should render Twitter integration", () => {
        render(<SocialIntegrations {...mockProps} />);

        expect(screen.getByTestId("twitter-integration")).toBeInTheDocument();
        expect(screen.getByText("Twitter: project-123")).toBeInTheDocument();
    });

    it("should render Gmail integration", () => {
        render(<SocialIntegrations {...mockProps} />);

        expect(screen.getByTestId("gmail-integration")).toBeInTheDocument();
        expect(screen.getByText("Gmail: project-123")).toBeInTheDocument();
    });

    it("should pass projectId to all child components", () => {
        render(<SocialIntegrations {...mockProps} />);

        const integrations = screen.getAllByText(/project-123/);
        expect(integrations).toHaveLength(4);
    });
});
