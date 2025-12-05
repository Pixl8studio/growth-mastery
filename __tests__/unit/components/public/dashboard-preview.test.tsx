/**
 * DashboardPreview Component Tests
 * Tests dashboard metrics display, graph visualization, and CTA functionality
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardPreview from "@/components/public/dashboard-preview";

describe("DashboardPreview", () => {
    it("should render the component", () => {
        render(<DashboardPreview />);
        expect(screen.getByText(/See Everything/)).toBeInTheDocument();
        expect(screen.getByText(/Scale Intelligently/)).toBeInTheDocument();
    });

    it("should display metrics cards", () => {
        render(<DashboardPreview />);

        expect(screen.getByText("$127K")).toBeInTheDocument();
        expect(screen.getByText("Revenue")).toBeInTheDocument();
        expect(screen.getByText("12")).toBeInTheDocument();
        expect(screen.getByText("Active Campaigns")).toBeInTheDocument();
        expect(screen.getByText("45.2K")).toBeInTheDocument();
        expect(screen.getByText("Total Visitors")).toBeInTheDocument();
    });

    it("should display trend indicators", () => {
        render(<DashboardPreview />);

        expect(screen.getByText("+23%")).toBeInTheDocument();
        expect(screen.getByText("+3")).toBeInTheDocument();
        expect(screen.getByText("+15%")).toBeInTheDocument();
    });

    it("should render description text", () => {
        render(<DashboardPreview />);

        expect(
            screen.getByText(/The GrowthMastery Dashboard gives founders complete visibility/)
        ).toBeInTheDocument();
        expect(
            screen.getByText(/It continuously learns from every launch/)
        ).toBeInTheDocument();
    });

    it("should display CTA button", () => {
        render(<DashboardPreview />);

        const ctaButton = screen.getByRole("link", { name: /Start Now/ });
        expect(ctaButton).toBeInTheDocument();
        expect(ctaButton).toHaveAttribute("href", "#pricing");
    });

    it("should display subtitle text", () => {
        render(<DashboardPreview />);

        expect(
            screen.getByText("Experience total clarity and control — in one view.")
        ).toBeInTheDocument();
    });

    it("should render graph visualization", () => {
        const { container } = render(<DashboardPreview />);

        // Graph should have 8 bars
        const graphBars = container.querySelectorAll(".gradient-emerald");
        expect(graphBars.length).toBe(8);
    });

    it("should have animated background elements", () => {
        const { container } = render(<DashboardPreview />);

        const animatedElements = container.querySelectorAll(".animate-float");
        expect(animatedElements.length).toBeGreaterThan(0);
    });
});
