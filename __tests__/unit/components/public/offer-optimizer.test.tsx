/**
 * OfferOptimizer Component Tests
 * Tests feature display, checkmarks, and CTA
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import OfferOptimizer from "@/components/public/offer-optimizer";

describe("OfferOptimizer", () => {
    it("should render correctly", () => {
        render(<OfferOptimizer />);

        expect(screen.getByText(/Craft an Irresistible/i)).toBeInTheDocument();
        expect(screen.getByText(/Scalable Offer with AI/i)).toBeInTheDocument();
    });

    it("should display subtitle", () => {
        render(<OfferOptimizer />);

        expect(screen.getByText("Never guess what your market wants again.")).toBeInTheDocument();
    });

    it("should display main description", () => {
        render(<OfferOptimizer />);

        expect(screen.getByText(/Our Offer Intelligence Engine continuously studies/i)).toBeInTheDocument();
    });

    it("should display all feature checkmarks", () => {
        render(<OfferOptimizer />);

        expect(screen.getByText(/Refined positioning language/i)).toBeInTheDocument();
        expect(screen.getByText(/Optimized price points/i)).toBeInTheDocument();
        expect(screen.getByText(/Adaptive scripts and value stack/i)).toBeInTheDocument();
        expect(screen.getByText(/Clear launch readiness score/i)).toBeInTheDocument();
    });

    it("should render CTA button", () => {
        render(<OfferOptimizer />);

        const ctaButton = screen.getByRole("link", { name: /Generate Your Offer/i });
        expect(ctaButton).toBeInTheDocument();
        expect(ctaButton).toHaveAttribute("href", "#pricing");
    });

    it("should display supporting text under CTA", () => {
        render(<OfferOptimizer />);

        expect(screen.getByText("Instantly analyze, position, and price your next big idea.")).toBeInTheDocument();
    });

    it("should have correct section structure", () => {
        const { container } = render(<OfferOptimizer />);

        const section = container.querySelector("section");
        expect(section).toBeInTheDocument();
        expect(section).toHaveClass("py-24", "bg-background");
    });

    it("should render animated visual elements", () => {
        const { container } = render(<OfferOptimizer />);

        const visualContainer = container.querySelector(".aspect-square.rounded-3xl");
        expect(visualContainer).toBeInTheDocument();
    });

    it("should render check circle icons", () => {
        const { container } = render(<OfferOptimizer />);

        // Should have 4 feature items with check circles
        const featureItems = container.querySelectorAll(".flex.items-start.gap-3");
        expect(featureItems.length).toBe(4);
    });

    it("should have grid layout", () => {
        const { container } = render(<OfferOptimizer />);

        const grid = container.querySelector(".grid.lg\\:grid-cols-2");
        expect(grid).toBeInTheDocument();
    });
});
