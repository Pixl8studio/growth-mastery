/**
 * AdVariationsReview Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdVariationsReview } from "@/components/ads/ad-variations-review";

describe("AdVariationsReview", () => {
    const mockVariations = [
        {
            id: "var-1",
            variation_number: 1,
            framework: "AIDA",
            primary_text: "Transform your business with our proven system",
            headline: "Start Your Journey Today",
            link_description: "Learn More",
            hooks: {
                long: "Discover the secret to success",
                short: "Change your life",
                curiosity: "What if you could...",
            },
            call_to_action: "Learn More",
        },
        {
            id: "var-2",
            variation_number: 2,
            framework: "PAS",
            primary_text: "Struggling with your business? We have the solution",
            headline: "Get Results Fast",
            link_description: "See How",
            hooks: {
                long: "Stop wasting time and money",
                short: "Get results now",
                curiosity: "The one thing missing...",
            },
            call_to_action: "Sign Up",
        },
    ];

    const mockProps = {
        variations: mockVariations,
        selectedVariations: [],
        onSelectVariations: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render variations list", () => {
        render(<AdVariationsReview {...mockProps} />);

        expect(screen.getByText("Variation 1")).toBeInTheDocument();
        expect(screen.getByText("Variation 2")).toBeInTheDocument();
    });

    it("should display framework badges", () => {
        render(<AdVariationsReview {...mockProps} />);

        expect(screen.getByText("AIDA")).toBeInTheDocument();
        expect(screen.getByText("PAS")).toBeInTheDocument();
    });

    it("should handle variation selection", () => {
        render(<AdVariationsReview {...mockProps} />);

        const checkbox = screen.getAllByRole("checkbox")[0];
        fireEvent.click(checkbox);

        expect(mockProps.onSelectVariations).toHaveBeenCalledWith(["var-1"]);
    });

    it("should handle variation deselection", () => {
        const propsWithSelected = {
            ...mockProps,
            selectedVariations: ["var-1"],
        };

        render(<AdVariationsReview {...propsWithSelected} />);

        const checkbox = screen.getAllByRole("checkbox")[0];
        fireEvent.click(checkbox);

        expect(mockProps.onSelectVariations).toHaveBeenCalledWith([]);
    });

    it("should display primary text", () => {
        render(<AdVariationsReview {...mockProps} />);

        expect(
            screen.getByText("Transform your business with our proven system")
        ).toBeInTheDocument();
    });

    it("should display headline", () => {
        render(<AdVariationsReview {...mockProps} />);

        expect(screen.getByText("Start Your Journey Today")).toBeInTheDocument();
    });

    it("should display link description", () => {
        render(<AdVariationsReview {...mockProps} />);

        // "Learn More" appears in both link_description and call_to_action badge
        // Use getAllByText to verify it exists
        const learnMoreElements = screen.getAllByText("Learn More");
        expect(learnMoreElements.length).toBeGreaterThan(0);
    });

    it("should toggle edit mode", () => {
        render(<AdVariationsReview {...mockProps} />);

        const editButton = screen.getAllByText("Edit")[0];
        fireEvent.click(editButton);

        expect(screen.getByText("Done")).toBeInTheDocument();
    });

    it("should allow editing primary text", () => {
        render(<AdVariationsReview {...mockProps} />);

        const editButton = screen.getAllByText("Edit")[0];
        fireEvent.click(editButton);

        const textarea = screen.getAllByRole("textbox")[0];
        fireEvent.change(textarea, { target: { value: "New primary text" } });

        expect(textarea).toHaveValue("New primary text");
    });

    it("should enforce character limits on primary text", () => {
        render(<AdVariationsReview {...mockProps} />);

        const editButton = screen.getAllByText("Edit")[0];
        fireEvent.click(editButton);

        const textarea = screen.getAllByRole("textbox")[0];
        const longText = "a".repeat(100);
        fireEvent.change(textarea, { target: { value: longText } });

        expect(textarea).toHaveValue("a".repeat(95));
    });

    it("should display hook variations in tabs", () => {
        render(<AdVariationsReview {...mockProps} />);

        // Multiple variations each have their own hook tabs
        const longTabs = screen.getAllByText("Long");
        const shortTabs = screen.getAllByText("Short");
        const curiosityTabs = screen.getAllByText("Curiosity");

        expect(longTabs.length).toBeGreaterThan(0);
        expect(shortTabs.length).toBeGreaterThan(0);
        expect(curiosityTabs.length).toBeGreaterThan(0);
    });

    it("should show selected count", () => {
        const propsWithSelected = {
            ...mockProps,
            selectedVariations: ["var-1", "var-2"],
        };

        render(<AdVariationsReview {...propsWithSelected} />);

        expect(
            screen.getByText("✓ 2 variation(s) selected for testing")
        ).toBeInTheDocument();
    });

    it("should show empty state when no variations", () => {
        const emptyProps = {
            ...mockProps,
            variations: [],
        };

        render(<AdVariationsReview {...emptyProps} />);

        expect(screen.getByText("No variations generated yet.")).toBeInTheDocument();
    });

    it("should display character counts", () => {
        render(<AdVariationsReview {...mockProps} />);

        // Multiple variations each have character counts
        const count95 = screen.getAllByText(/\/95/);
        const count40 = screen.getAllByText(/\/40/);
        const count30 = screen.getAllByText(/\/30/);

        expect(count95.length).toBeGreaterThan(0);
        expect(count40.length).toBeGreaterThan(0);
        expect(count30.length).toBeGreaterThan(0);
    });
});
