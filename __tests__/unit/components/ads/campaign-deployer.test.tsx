/**
 * CampaignDeployer Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CampaignDeployer } from "@/components/ads/campaign-deployer";

describe("CampaignDeployer", () => {
    const mockVariations = [
        {
            id: "var-1",
            variation_number: 1,
            framework: "AIDA",
            primary_text: "Transform your business",
            headline: "Get Started",
            link_description: "Learn More",
            hooks: { long: "", short: "", curiosity: "" },
            call_to_action: "Sign Up",
        },
        {
            id: "var-2",
            variation_number: 2,
            framework: "PAS",
            primary_text: "Solve your problems",
            headline: "Get Results",
            link_description: "See How",
            hooks: { long: "", short: "", curiosity: "" },
            call_to_action: "Learn More",
        },
    ];

    const mockAudienceConfig = {
        type: "interest",
        description: "Business owners interested in marketing",
        targeting: {
            geo_locations: { countries: ["US"] },
            age_min: 25,
            age_max: 65,
        },
    };

    const mockProps = {
        adAccountId: "act_123456",
        variations: mockVariations,
        audienceConfig: mockAudienceConfig,
        dailyBudget: 2000,
        onDeploy: vi.fn(),
        deploying: false,
        deployed: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render campaign summary", () => {
        render(<CampaignDeployer {...mockProps} />);

        expect(screen.getByText("Campaign Summary")).toBeInTheDocument();
    });

    it("should display ad account ID", () => {
        render(<CampaignDeployer {...mockProps} />);

        expect(screen.getByText("act_123456")).toBeInTheDocument();
    });

    it("should display campaign objective", () => {
        render(<CampaignDeployer {...mockProps} />);

        expect(
            screen.getByText("Lead Generation - Webinar Registrations")
        ).toBeInTheDocument();
    });

    it("should display number of variations", () => {
        render(<CampaignDeployer {...mockProps} />);

        expect(screen.getByText("Ad Variations (2)")).toBeInTheDocument();
    });

    it("should display variation details", () => {
        render(<CampaignDeployer {...mockProps} />);

        expect(screen.getByText("Variation 1")).toBeInTheDocument();
        expect(screen.getByText("Variation 2")).toBeInTheDocument();
        expect(screen.getByText("Transform your business")).toBeInTheDocument();
        expect(screen.getByText("Solve your problems")).toBeInTheDocument();
    });

    it("should display framework badges", () => {
        render(<CampaignDeployer {...mockProps} />);

        expect(screen.getByText("AIDA")).toBeInTheDocument();
        expect(screen.getByText("PAS")).toBeInTheDocument();
    });

    it("should display audience type", () => {
        render(<CampaignDeployer {...mockProps} />);

        expect(screen.getByText("Interest Targeting")).toBeInTheDocument();
    });

    it("should display audience description", () => {
        render(<CampaignDeployer {...mockProps} />);

        expect(
            screen.getByText("Business owners interested in marketing")
        ).toBeInTheDocument();
    });

    it("should display budget breakdown", () => {
        render(<CampaignDeployer {...mockProps} />);

        expect(screen.getByText("$20.00")).toBeInTheDocument(); // Daily
        expect(screen.getByText("$140.00")).toBeInTheDocument(); // Weekly
        expect(screen.getByText("$600.00")).toBeInTheDocument(); // Monthly
    });

    it("should display AI optimization notice", () => {
        render(<CampaignDeployer {...mockProps} />);

        expect(screen.getByText("AI Optimization Enabled")).toBeInTheDocument();
        expect(
            screen.getByText(/monitor performance every 12 hours/)
        ).toBeInTheDocument();
    });

    it("should display optimization strategies", () => {
        render(<CampaignDeployer {...mockProps} />);

        expect(screen.getByText(/Pause underperforming ads/)).toBeInTheDocument();
        expect(screen.getByText(/Scale winning ads/)).toBeInTheDocument();
        expect(
            screen.getByText(/Generate new variations when ads fatigue/)
        ).toBeInTheDocument();
    });

    it("should display important deployment warning", () => {
        render(<CampaignDeployer {...mockProps} />);

        expect(
            screen.getByText(/ads will start running immediately/)
        ).toBeInTheDocument();
    });

    it("should display lookalike audience info", () => {
        const lookalikeProps = {
            ...mockProps,
            audienceConfig: {
                type: "lookalike",
                source_file: "customers.csv",
                targeting: {
                    geo_locations: { countries: ["US"] },
                },
            },
        };

        render(<CampaignDeployer {...lookalikeProps} />);

        expect(screen.getByText("Lookalike Targeting")).toBeInTheDocument();
        expect(
            screen.getByText(/Lookalike audience from: customers.csv/)
        ).toBeInTheDocument();
    });

    it("should display targeting badges", () => {
        render(<CampaignDeployer {...mockProps} />);

        expect(screen.getByText("United States")).toBeInTheDocument();
        expect(screen.getByText("Ages 25-65")).toBeInTheDocument();
    });

    it("should return null when deployed", () => {
        const deployedProps = {
            ...mockProps,
            deployed: true,
        };

        const { container } = render(<CampaignDeployer {...deployedProps} />);
        expect(container.firstChild).toBeNull();
    });
});
