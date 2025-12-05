/**
 * MarketingEngine Component Tests
 * Tests feature display and CTA
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MarketingEngine from "@/components/public/marketing-engine";

describe("MarketingEngine", () => {
    it("should render correctly", () => {
        render(<MarketingEngine />);

        expect(screen.getByText(/Your Entire Marketing Ecosystem/i)).toBeInTheDocument();
        expect(screen.getByText(/Always Improving/i)).toBeInTheDocument();
    });

    it("should display section subtitle", () => {
        render(<MarketingEngine />);

        expect(screen.getByText("The Self-Optimizing System That Grows With You")).toBeInTheDocument();
    });

    it("should display main description", () => {
        render(<MarketingEngine />);

        expect(screen.getByText(/GrowthMastery.ai doesn't stop at building your funnel/i)).toBeInTheDocument();
    });

    it("should display all four features", () => {
        render(<MarketingEngine />);

        expect(screen.getByText("Automated Content Calendar")).toBeInTheDocument();
        expect(screen.getByText("Adaptive Ads Engine")).toBeInTheDocument();
        expect(screen.getByText("Continuous Optimization")).toBeInTheDocument();
        expect(screen.getByText("Unified Dashboard")).toBeInTheDocument();
    });

    it("should display feature descriptions", () => {
        render(<MarketingEngine />);

        expect(screen.getByText(/Instantly generate daily, platform-specific social posts/i)).toBeInTheDocument();
        expect(screen.getByText(/Launch meta-optimized ad campaigns/i)).toBeInTheDocument();
        expect(screen.getByText(/Every engagement feeds back/i)).toBeInTheDocument();
        expect(screen.getByText(/See your entire growth ecosystem/i)).toBeInTheDocument();
    });

    it("should render CTA button", () => {
        render(<MarketingEngine />);

        const ctaButton = screen.getByRole("link", { name: /See How It Works/i });
        expect(ctaButton).toBeInTheDocument();
        expect(ctaButton).toHaveAttribute("href", "#pricing");
    });

    it("should have correct section structure with gradient", () => {
        const { container } = render(<MarketingEngine />);

        const section = container.querySelector("section");
        expect(section).toBeInTheDocument();
        expect(section).toHaveClass("py-24", "gradient-hero");
    });

    it("should render features in grid layout", () => {
        const { container } = render(<MarketingEngine />);

        const grid = container.querySelector(".grid.md\\:grid-cols-2");
        expect(grid).toBeInTheDocument();

        const featureCards = container.querySelectorAll(".group.p-8.rounded-2xl");
        expect(featureCards.length).toBe(4);
    });

    it("should have background effects", () => {
        const { container } = render(<MarketingEngine />);

        const backgroundEffect = container.querySelector(".absolute.inset-0.opacity-20");
        expect(backgroundEffect).toBeInTheDocument();
    });
});
