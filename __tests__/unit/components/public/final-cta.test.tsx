/**
 * FinalCTA Component Tests
 * Tests final call-to-action section with countdown and trust indicators
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FinalCTA from "@/components/public/final-cta";

describe("FinalCTA", () => {
    it("should render the component", () => {
        render(<FinalCTA />);
        expect(screen.getByText(/Step Into/)).toBeInTheDocument();
        expect(screen.getByText(/Predictable Scale/)).toBeInTheDocument();
    });

    it("should display subheading text", () => {
        render(<FinalCTA />);

        expect(
            screen.getByText(
                /Build your profitable, AI-powered evergreen funnel that converts cold traffic into customers in 30 days or less/
            )
        ).toBeInTheDocument();
    });

    it("should render countdown deal banner", () => {
        const { container } = render(<FinalCTA />);

        // CountdownDealBanner should be present (even if not rendered due to timing)
        expect(container.querySelector('[class*="animate-fade-in"]')).toBeInTheDocument();
    });

    it("should display CTA button with Stripe link", () => {
        render(<FinalCTA />);

        const ctaButton = screen.getByRole("link", { name: /Start Now - Save \$2,000/ });
        expect(ctaButton).toBeInTheDocument();
        expect(ctaButton).toHaveAttribute(
            "href",
            "https://buy.stripe.com/3cIfZgbgn3zR5FS8wk0oM0e"
        );
    });

    it("should display trust indicators", () => {
        render(<FinalCTA />);

        expect(screen.getByText("30-Day Setup")).toBeInTheDocument();
        expect(screen.getByText("100% Money-Back Guarantee")).toBeInTheDocument();
        expect(screen.getByText("Launch in Days, Not Months")).toBeInTheDocument();
    });

    it("should have animated background elements", () => {
        const { container } = render(<FinalCTA />);

        const animatedElements = container.querySelectorAll(".animate-float");
        expect(animatedElements.length).toBeGreaterThan(0);
    });

    it("should display trust indicator emojis", () => {
        render(<FinalCTA />);

        expect(screen.getByText("⚙️")).toBeInTheDocument();
        expect(screen.getByText("🛡️")).toBeInTheDocument();
        expect(screen.getByText("🚀")).toBeInTheDocument();
    });

    it("should have gradient dark background", () => {
        const { container } = render(<FinalCTA />);

        const section = container.querySelector("section");
        expect(section?.className).toContain("gradient-dark");
    });
});
