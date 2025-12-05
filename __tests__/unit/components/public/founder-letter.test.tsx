/**
 * FounderLetter Component Tests
 * Tests letter content, founder info, and image rendering
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import FounderLetter from "@/components/public/founder-letter";

// Mock Next.js Image component
vi.mock("next/image", () => ({
    default: ({ src, alt, width, height, className }: any) => (
        <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            className={className}
            data-testid="next-image"
        />
    ),
}));

describe("FounderLetter", () => {
    it("should render correctly", () => {
        render(<FounderLetter />);

        expect(screen.getByText("Built by Founders, for Founders")).toBeInTheDocument();
        expect(screen.getByText("A letter from our founder")).toBeInTheDocument();
    });

    it("should display the pull quote", () => {
        render(<FounderLetter />);

        expect(screen.getByText(/We created the Genius Launch System/i)).toBeInTheDocument();
    });

    it("should display letter body content", () => {
        render(<FounderLetter />);

        expect(screen.getByText(/When I first began helping founders/i)).toBeInTheDocument();
        expect(screen.getByText(/biggest barrier to entrepreneurship/i)).toBeInTheDocument();
        expect(screen.getByText(/most abundant time in human history/i)).toBeInTheDocument();
    });

    it("should display the mission statement", () => {
        render(<FounderLetter />);

        expect(screen.getByText("Our mission is simple:")).toBeInTheDocument();
        expect(screen.getByText(/To liberate entrepreneurs/i)).toBeInTheDocument();
        expect(screen.getByText(/Scale their impact/i)).toBeInTheDocument();
    });

    it("should display founder information", () => {
        render(<FounderLetter />);

        expect(screen.getByText("Joe McVeen")).toBeInTheDocument();
        expect(screen.getByText("Founder & CEO, GrowthMastery.ai")).toBeInTheDocument();
    });

    it("should render founder image", () => {
        render(<FounderLetter />);

        const image = screen.getByAltText("Joe McVeen, Founder & CEO of GrowthMastery.ai");
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute("src", "/assets/joe-headshot.png");
        expect(image).toHaveAttribute("width", "80");
        expect(image).toHaveAttribute("height", "80");
    });

    it("should display closing message", () => {
        render(<FounderLetter />);

        expect(screen.getByText("With gratitude and conviction,")).toBeInTheDocument();
    });

    it("should have decorative quote mark", () => {
        const { container } = render(<FounderLetter />);

        const quote = container.querySelector(".text-8xl");
        expect(quote).toBeInTheDocument();
        expect(quote).toHaveTextContent('"');
    });

    it("should have correct section structure", () => {
        const { container } = render(<FounderLetter />);

        const section = container.querySelector("section");
        expect(section).toBeInTheDocument();
        expect(section).toHaveClass("py-24", "bg-background");
    });

    it("should display highlighted mission box", () => {
        const { container } = render(<FounderLetter />);

        const missionBox = container.querySelector(".border-l-4.border-primary");
        expect(missionBox).toBeInTheDocument();
    });
});
