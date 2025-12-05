/**
 * FollowUpEngine Component Tests
 * Tests rendering, statistics display, and CTA functionality
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FollowUpEngine from "@/components/public/follow-up-engine";

describe("FollowUpEngine", () => {
    it("should render correctly", () => {
        render(<FollowUpEngine />);

        expect(screen.getByText("Your 24/7 AI Follow-Up Engine")).toBeInTheDocument();
        expect(screen.getByText("Personalized, Proactive, and Always Learning")).toBeInTheDocument();
    });

    it("should display all statistics cards", () => {
        render(<FollowUpEngine />);

        expect(screen.getByText("Follow-up sent")).toBeInTheDocument();
        expect(screen.getByText("94%")).toBeInTheDocument();

        expect(screen.getByText("Response rate")).toBeInTheDocument();
        expect(screen.getByText("67%")).toBeInTheDocument();

        expect(screen.getByText("Conversions")).toBeInTheDocument();
        expect(screen.getByText("+34%")).toBeInTheDocument();
    });

    it("should display description content", () => {
        render(<FollowUpEngine />);

        expect(screen.getByText(/Trained automatically on your brand voice/i)).toBeInTheDocument();
        expect(screen.getByText(/crafts professional, personal email and SMS sequences/i)).toBeInTheDocument();
    });

    it("should render CTA button", () => {
        render(<FollowUpEngine />);

        const ctaButton = screen.getByRole("link", { name: /See It in Action/i });
        expect(ctaButton).toBeInTheDocument();
        expect(ctaButton).toHaveAttribute("href", "#pricing");
    });

    it("should display supporting text under CTA", () => {
        render(<FollowUpEngine />);

        expect(screen.getByText("Experience the AI engine that never stops selling for you.")).toBeInTheDocument();
    });

    it("should have correct section structure", () => {
        const { container } = render(<FollowUpEngine />);

        const section = container.querySelector("section");
        expect(section).toBeInTheDocument();
        expect(section).toHaveClass("py-24", "bg-background");
    });

    it("should render all stat icons", () => {
        const { container } = render(<FollowUpEngine />);

        // Check for 3 stat cards with icons
        const statCards = container.querySelectorAll(".flex.items-center.gap-4");
        expect(statCards.length).toBe(3);
    });
});
