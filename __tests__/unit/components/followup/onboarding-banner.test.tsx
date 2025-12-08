/**
 * OnboardingBanner Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
        render(
            <OnboardingBanner
                senderVerified={false}
                hasSequences={false}
                hasMessages={false}
            />
        );
        expect(
            screen.getByText("Welcome to AI Follow-Up Engine! 👋")
        ).toBeInTheDocument();
    });

    it("should display onboarding steps", () => {
        render(
            <OnboardingBanner
                senderVerified={false}
                hasSequences={false}
                hasMessages={false}
            />
        );

        expect(screen.getByText("Configure Email Sender")).toBeInTheDocument();
        expect(screen.getByText("Select/Create Sequence")).toBeInTheDocument();
        expect(screen.getByText("Review & Test Messages")).toBeInTheDocument();
    });

    it("should display step descriptions", () => {
        render(
            <OnboardingBanner
                senderVerified={false}
                hasSequences={false}
                hasMessages={false}
            />
        );

        expect(
            screen.getByText("Connect Gmail or configure SendGrid for email sending")
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                "Choose a pre-built sequence or create your own follow-up campaign"
            )
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                "Preview your messages and send a test to verify everything works"
            )
        ).toBeInTheDocument();
    });

    it("should have a dismiss button", () => {
        render(
            <OnboardingBanner
                senderVerified={false}
                hasSequences={false}
                hasMessages={false}
            />
        );
        // The component has an X button for dismissing
        const buttons = screen.getAllByRole("button");
        expect(buttons.length).toBeGreaterThan(0);
    });

    it("should hide banner when dismiss button is clicked", () => {
        render(
            <OnboardingBanner
                senderVerified={false}
                hasSequences={false}
                hasMessages={false}
            />
        );

        // Find the dismiss button (X icon button)
        const dismissButton = screen.getAllByRole("button")[0];
        fireEvent.click(dismissButton);

        expect(
            screen.queryByText("Welcome to AI Follow-Up Engine! 👋")
        ).not.toBeInTheDocument();
    });

    it("should save dismissed state to localStorage", () => {
        render(
            <OnboardingBanner
                senderVerified={false}
                hasSequences={false}
                hasMessages={false}
            />
        );

        const dismissButton = screen.getAllByRole("button")[0];
        fireEvent.click(dismissButton);

        expect(localStorageMock.getItem("followup-onboarding-dismissed")).toBe("true");
    });

    it("should not render when previously dismissed", async () => {
        localStorageMock.setItem("followup-onboarding-dismissed", "true");

        render(
            <OnboardingBanner
                senderVerified={false}
                hasSequences={false}
                hasMessages={false}
            />
        );

        // Wait for the component to check localStorage (uses requestAnimationFrame)
        await waitFor(() => {
            expect(
                screen.queryByText("Welcome to AI Follow-Up Engine! 👋")
            ).not.toBeInTheDocument();
        });
    });

    it("should display step indicators", () => {
        render(
            <OnboardingBanner
                senderVerified={false}
                hasSequences={false}
                hasMessages={false}
            />
        );

        // Check for step badges
        expect(screen.getByText("Step 1")).toBeInTheDocument();
        expect(screen.getByText("Step 2")).toBeInTheDocument();
        expect(screen.getByText("Step 3")).toBeInTheDocument();
    });

    it("should use gradient background styling", () => {
        const { container } = render(
            <OnboardingBanner
                senderVerified={false}
                hasSequences={false}
                hasMessages={false}
            />
        );

        const banner = container.querySelector(".bg-gradient-to-r");
        expect(banner).toBeInTheDocument();
    });

    it("should display helpful intro text", () => {
        render(
            <OnboardingBanner
                senderVerified={false}
                hasSequences={false}
                hasMessages={false}
            />
        );

        expect(
            screen.getByText(
                "Let's set up your automated follow-up system in three simple steps"
            )
        ).toBeInTheDocument();
    });

    it("should have proper spacing between steps", () => {
        const { container } = render(
            <OnboardingBanner
                senderVerified={false}
                hasSequences={false}
                hasMessages={false}
            />
        );

        const stepsContainer = container.querySelector(".grid");
        expect(stepsContainer).toBeInTheDocument();
    });

    it("should display banner title prominently", () => {
        render(
            <OnboardingBanner
                senderVerified={false}
                hasSequences={false}
                hasMessages={false}
            />
        );

        const title = screen.getByText("Welcome to AI Follow-Up Engine! 👋");
        expect(title).toHaveClass("text-lg", "font-semibold");
    });

    it("should be responsive", () => {
        const { container } = render(
            <OnboardingBanner
                senderVerified={false}
                hasSequences={false}
                hasMessages={false}
            />
        );

        // Check for responsive grid classes
        const grid = container.querySelector(".md\\:grid-cols-3");
        expect(grid).toBeInTheDocument();
    });

    it("should persist dismissal across re-renders", () => {
        const { rerender } = render(
            <OnboardingBanner
                senderVerified={false}
                hasSequences={false}
                hasMessages={false}
            />
        );

        const dismissButton = screen.getAllByRole("button")[0];
        fireEvent.click(dismissButton);

        rerender(
            <OnboardingBanner
                senderVerified={false}
                hasSequences={false}
                hasMessages={false}
            />
        );

        expect(
            screen.queryByText("Welcome to AI Follow-Up Engine! 👋")
        ).not.toBeInTheDocument();
    });

    it("should mark steps as complete based on props", () => {
        render(
            <OnboardingBanner
                senderVerified={true}
                hasSequences={false}
                hasMessages={false}
            />
        );

        // First step should be marked complete
        expect(screen.getByText("✓ Done")).toBeInTheDocument();
    });

    it("should show progress bar", () => {
        render(
            <OnboardingBanner
                senderVerified={true}
                hasSequences={true}
                hasMessages={false}
            />
        );

        expect(screen.getByText("Setup Progress")).toBeInTheDocument();
        expect(screen.getByText("2 of 3 complete")).toBeInTheDocument();
    });

    it("should not render when all steps complete", () => {
        render(
            <OnboardingBanner
                senderVerified={true}
                hasSequences={true}
                hasMessages={true}
            />
        );

        expect(
            screen.queryByText("Welcome to AI Follow-Up Engine! 👋")
        ).not.toBeInTheDocument();
    });

    it("should show next step hint", () => {
        render(
            <OnboardingBanner
                senderVerified={false}
                hasSequences={false}
                hasMessages={false}
            />
        );

        expect(screen.getByText("Next step:")).toBeInTheDocument();
        expect(screen.getByText(/Sender Setup/)).toBeInTheDocument();
    });

    it("should call onClose when dismissed", () => {
        const onClose = vi.fn();

        render(
            <OnboardingBanner
                senderVerified={false}
                hasSequences={false}
                hasMessages={false}
                onClose={onClose}
            />
        );

        const dismissButton = screen.getAllByRole("button")[0];
        fireEvent.click(dismissButton);

        expect(onClose).toHaveBeenCalled();
    });
});
