/**
 * OnboardingBanner Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OnboardingBanner } from "@/components/followup/onboarding-banner";

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value.toString();
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
})();

Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
});

describe("OnboardingBanner", () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    it("should render without crashing", () => {
        render(<OnboardingBanner />);
        expect(screen.getByText("Welcome to AI Follow-Up! 🎉")).toBeInTheDocument();
    });

    it("should display onboarding steps", () => {
        render(<OnboardingBanner />);

        expect(screen.getByText("1. Configure Your Agent")).toBeInTheDocument();
        expect(screen.getByText("2. Set Up Sender Info")).toBeInTheDocument();
        expect(screen.getByText("3. Create Message Sequences")).toBeInTheDocument();
        expect(screen.getByText("4. Start Following Up!")).toBeInTheDocument();
    });

    it("should display step descriptions", () => {
        render(<OnboardingBanner />);

        expect(
            screen.getByText("Customize voice, tone, and knowledge base")
        ).toBeInTheDocument();
        expect(screen.getByText("Set up your email/SMS sender identity")).toBeInTheDocument();
        expect(
            screen.getByText("Build automated follow-up sequences")
        ).toBeInTheDocument();
        expect(
            screen.getByText("Sit back and watch the conversions roll in")
        ).toBeInTheDocument();
    });

    it("should have a dismiss button", () => {
        render(<OnboardingBanner />);
        expect(screen.getByText("Got it!")).toBeInTheDocument();
    });

    it("should hide banner when dismiss button is clicked", () => {
        render(<OnboardingBanner />);

        const dismissButton = screen.getByText("Got it!");
        fireEvent.click(dismissButton);

        expect(screen.queryByText("Welcome to AI Follow-Up! 🎉")).not.toBeInTheDocument();
    });

    it("should save dismissed state to localStorage", () => {
        render(<OnboardingBanner />);

        const dismissButton = screen.getByText("Got it!");
        fireEvent.click(dismissButton);

        expect(localStorageMock.getItem("onboarding_dismissed")).toBe("true");
    });

    it("should not render when previously dismissed", () => {
        localStorageMock.setItem("onboarding_dismissed", "true");

        render(<OnboardingBanner />);

        expect(screen.queryByText("Welcome to AI Follow-Up! 🎉")).not.toBeInTheDocument();
    });

    it("should display step icons", () => {
        render(<OnboardingBanner />);

        // Check for numbered step indicators
        expect(screen.getByText("1.")).toBeInTheDocument();
        expect(screen.getByText("2.")).toBeInTheDocument();
        expect(screen.getByText("3.")).toBeInTheDocument();
        expect(screen.getByText("4.")).toBeInTheDocument();
    });

    it("should use gradient background styling", () => {
        const { container } = render(<OnboardingBanner />);

        const banner = container.querySelector(".bg-gradient-to-r");
        expect(banner).toBeInTheDocument();
    });

    it("should display helpful intro text", () => {
        render(<OnboardingBanner />);

        expect(
            screen.getByText(
                "Let's get you set up in 4 quick steps. This will only take a few minutes!"
            )
        ).toBeInTheDocument();
    });

    it("should render with dismissible close icon", () => {
        render(<OnboardingBanner />);

        const dismissButton = screen.getByText("Got it!");
        expect(dismissButton).toHaveClass("px-4");
    });

    it("should have proper spacing between steps", () => {
        const { container } = render(<OnboardingBanner />);

        const stepsContainer = container.querySelector(".grid");
        expect(stepsContainer).toBeInTheDocument();
    });

    it("should display banner title prominently", () => {
        render(<OnboardingBanner />);

        const title = screen.getByText("Welcome to AI Follow-Up! 🎉");
        expect(title).toHaveClass("text-xl", "font-bold");
    });

    it("should be responsive", () => {
        const { container } = render(<OnboardingBanner />);

        // Check for responsive grid classes
        const grid = container.querySelector(".grid-cols-1");
        expect(grid).toBeInTheDocument();
    });

    it("should persist dismissal across re-renders", () => {
        const { rerender } = render(<OnboardingBanner />);

        const dismissButton = screen.getByText("Got it!");
        fireEvent.click(dismissButton);

        rerender(<OnboardingBanner />);

        expect(screen.queryByText("Welcome to AI Follow-Up! 🎉")).not.toBeInTheDocument();
    });
});
