/**
 * StoryLibraryManager Component Tests
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StoryLibraryManager } from "@/components/followup/story-library-manager";

describe("StoryLibraryManager", () => {
    it("should render without crashing", () => {
        render(<StoryLibraryManager />);
        expect(screen.getByText("Story Library")).toBeInTheDocument();
    });

    it("should display page title", () => {
        render(<StoryLibraryManager />);
        expect(screen.getByText("Story Library")).toBeInTheDocument();
    });

    it("should display page description", () => {
        render(<StoryLibraryManager />);
        expect(
            screen.getByText(
                "Proof stories, testimonials, and case studies for objection handling"
            )
        ).toBeInTheDocument();
    });

    it("should display sample story card", () => {
        render(<StoryLibraryManager />);
        expect(screen.getByText("ROI in 60 Days")).toBeInTheDocument();
    });

    it("should display story description", () => {
        render(<StoryLibraryManager />);
        expect(
            screen.getByText("Client recovered investment within 2 months")
        ).toBeInTheDocument();
    });

    it("should display story type badge", () => {
        render(<StoryLibraryManager />);
        expect(screen.getByText("Testimonial")).toBeInTheDocument();
    });

    it("should display objection category", () => {
        render(<StoryLibraryManager />);
        expect(screen.getByText("🎯 Objection: price_concern")).toBeInTheDocument();
    });

    it("should display niche information", () => {
        render(<StoryLibraryManager />);
        expect(screen.getByText("🏢 Niche: coaching, consulting")).toBeInTheDocument();
    });

    it("should display price band", () => {
        render(<StoryLibraryManager />);
        expect(screen.getByText("💰 Price Band: mid")).toBeInTheDocument();
    });

    it("should display effectiveness score", () => {
        render(<StoryLibraryManager />);
        expect(screen.getByText("📊 Effectiveness: 92.5%")).toBeInTheDocument();
    });

    it("should display usage count", () => {
        render(<StoryLibraryManager />);
        expect(screen.getByText("📈 Used: 15 times")).toBeInTheDocument();
    });

    it("should display API management note", () => {
        render(<StoryLibraryManager />);
        expect(
            screen.getByText("Stories can be added and managed via API endpoints")
        ).toBeInTheDocument();
    });

    it("should render as a card component", () => {
        const { container } = render(<StoryLibraryManager />);
        const card = container.querySelector(".p-6");
        expect(card).toBeInTheDocument();
    });

    it("should display all story metadata fields", () => {
        render(<StoryLibraryManager />);

        // Check all emoji indicators are present
        expect(screen.getByText(/🎯/)).toBeInTheDocument();
        expect(screen.getByText(/🏢/)).toBeInTheDocument();
        expect(screen.getByText(/💰/)).toBeInTheDocument();
        expect(screen.getByText(/📊/)).toBeInTheDocument();
        expect(screen.getByText(/📈/)).toBeInTheDocument();
    });

    it("should have proper spacing and layout", () => {
        const { container } = render(<StoryLibraryManager />);
        const spacedContainer = container.querySelector(".space-y-4");
        expect(spacedContainer).toBeInTheDocument();
    });

    it("should render story card with border", () => {
        const { container } = render(<StoryLibraryManager />);
        const borderedCard = container.querySelector(".border");
        expect(borderedCard).toBeInTheDocument();
    });

    it("should display story title prominently", () => {
        render(<StoryLibraryManager />);
        const title = screen.getByText("ROI in 60 Days");
        expect(title).toHaveClass("font-semibold");
    });

    it("should use semantic HTML structure", () => {
        const { container } = render(<StoryLibraryManager />);
        const heading = container.querySelector("h2");
        expect(heading).toBeInTheDocument();
        expect(heading).toHaveTextContent("Story Library");
    });
});
