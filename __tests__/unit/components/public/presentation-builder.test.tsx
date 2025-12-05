/**
 * PresentationBuilder Component Tests
 * Tests use cases display and CTA functionality
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PresentationBuilder from "@/components/public/presentation-builder";

describe("PresentationBuilder", () => {
    it("should render correctly", () => {
        render(<PresentationBuilder />);

        expect(screen.getByText(/Generate High-Converting Presentations/i)).toBeInTheDocument();
        expect(screen.getByText(/In Minutes/i)).toBeInTheDocument();
    });

    it("should display main description", () => {
        render(<PresentationBuilder />);

        expect(screen.getByText(/Skip the writer's block/i)).toBeInTheDocument();
    });

    it("should display all use cases", () => {
        render(<PresentationBuilder />);

        expect(screen.getByText(/Sales Webinars that enroll customers automatically/i)).toBeInTheDocument();
        expect(screen.getByText(/Educational Masterclasses that build trust/i)).toBeInTheDocument();
        expect(screen.getByText(/Investor or Partnership Pitches/i)).toBeInTheDocument();
        expect(screen.getByText(/Product Demos or Brand Stories/i)).toBeInTheDocument();
    });

    it("should display section header", () => {
        render(<PresentationBuilder />);

        expect(screen.getByText("You can instantly generate:")).toBeInTheDocument();
    });

    it("should render CTA button", () => {
        render(<PresentationBuilder />);

        const ctaButton = screen.getByRole("link", { name: /Create My Presentation/i });
        expect(ctaButton).toBeInTheDocument();
        expect(ctaButton).toHaveAttribute("href", "#pricing");
    });

    it("should display supporting text under CTA", () => {
        render(<PresentationBuilder />);

        expect(screen.getByText(/Turn your ideas into a beautifully built/i)).toBeInTheDocument();
    });

    it("should have correct section structure with gradient", () => {
        const { container } = render(<PresentationBuilder />);

        const section = container.querySelector("section");
        expect(section).toBeInTheDocument();
        expect(section).toHaveClass("py-24", "gradient-hero");
    });

    it("should render slide preview animation", () => {
        const { container } = render(<PresentationBuilder />);

        // Should have 3 slides in the animation
        const slides = screen.getAllByText(/Slide \d/);
        expect(slides.length).toBe(3);
    });

    it("should have grid layout", () => {
        const { container } = render(<PresentationBuilder />);

        const grid = container.querySelector(".grid.lg\\:grid-cols-2");
        expect(grid).toBeInTheDocument();
    });

    it("should render use case icons", () => {
        const { container } = render(<PresentationBuilder />);

        // Should have 4 use cases with icons
        const useCaseItems = container.querySelectorAll(".flex.items-start.gap-3.p-3");
        expect(useCaseItems.length).toBe(4);
    });

    it("should have background effects", () => {
        const { container } = render(<PresentationBuilder />);

        const backgroundEffect = container.querySelector(".absolute.inset-0.opacity-20");
        expect(backgroundEffect).toBeInTheDocument();
    });
});
