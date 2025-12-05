/**
 * HowItWorks Component Tests
 * Tests step display and content
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HowItWorks from "@/components/public/how-it-works";

describe("HowItWorks", () => {
    it("should render correctly", () => {
        render(<HowItWorks />);

        expect(screen.getByText(/3 Steps./i)).toBeInTheDocument();
        expect(screen.getByText(/Infinite Scale./i)).toBeInTheDocument();
    });

    it("should display all three steps", () => {
        render(<HowItWorks />);

        expect(screen.getByText("Step 1")).toBeInTheDocument();
        expect(screen.getByText("Step 2")).toBeInTheDocument();
        expect(screen.getByText("Step 3")).toBeInTheDocument();
    });

    it("should display step 1 content", () => {
        render(<HowItWorks />);

        expect(screen.getByText("Define Your Offer")).toBeInTheDocument();
        expect(screen.getByText(/Upload your assets or talk to our AI/i)).toBeInTheDocument();
    });

    it("should display step 2 content", () => {
        render(<HowItWorks />);

        expect(screen.getByText("Watch It Build")).toBeInTheDocument();
        expect(screen.getByText(/See your entire funnel/i)).toBeInTheDocument();
    });

    it("should display step 3 content", () => {
        render(<HowItWorks />);

        expect(screen.getByText("Automate & Scale")).toBeInTheDocument();
        expect(screen.getByText(/Automate all organic & paid marketing/i)).toBeInTheDocument();
    });

    it("should have correct section structure", () => {
        const { container } = render(<HowItWorks />);

        const section = container.querySelector("section");
        expect(section).toBeInTheDocument();
        expect(section).toHaveClass("py-24", "bg-background");
    });

    it("should render step cards in grid layout", () => {
        const { container } = render(<HowItWorks />);

        const grid = container.querySelector(".grid.md\\:grid-cols-3");
        expect(grid).toBeInTheDocument();

        const cards = container.querySelectorAll(".group.relative.p-8.rounded-2xl");
        expect(cards.length).toBe(3);
    });

    it("should display step indicators", () => {
        const { container } = render(<HowItWorks />);

        const stepIndicators = container.querySelectorAll(".absolute.-top-4");
        expect(stepIndicators.length).toBe(3);
    });

    it("should render with proper styling classes", () => {
        const { container } = render(<HowItWorks />);

        const cards = container.querySelectorAll(".shadow-soft.hover\\:shadow-float");
        expect(cards.length).toBeGreaterThan(0);
    });
});
