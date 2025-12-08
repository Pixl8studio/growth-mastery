/**
 * OnboardingBanner Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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
    const defaultProps = {
        senderVerified: false,
        hasSequences: false,
        hasMessages: false,
    };

    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    it("should not render when previously dismissed", () => {
        localStorageMock.setItem("onboarding_dismissed", "true");

        render(<OnboardingBanner {...defaultProps} />);

        expect(screen.queryByText("Welcome to AI Follow-Up! 🎉")).not.toBeInTheDocument();
    });

    it("should use gradient background styling", () => {
        const { container } = render(<OnboardingBanner {...defaultProps} />);

        const banner = container.querySelector(".bg-gradient-to-r");
        expect(banner).toBeInTheDocument();
    });

    it("should have proper spacing between steps", () => {
        const { container } = render(<OnboardingBanner {...defaultProps} />);

        const stepsContainer = container.querySelector(".grid");
        expect(stepsContainer).toBeInTheDocument();
    });
});
