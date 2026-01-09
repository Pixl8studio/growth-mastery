/**
 * StepperNav Component Tests
 * Tests sidebar navigation with steps and progress
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StepperNav } from "@/components/funnel/stepper-nav";

// Mock dependencies
vi.mock("next/navigation", () => ({
    usePathname: () => "/funnel-builder/test/step/1",
}));

vi.mock("@/app/funnel-builder/master-steps-config", () => ({
    MASTER_STEPS: [
        { id: 1, title: "Business Context", subSteps: [1] },
        { id: 2, title: "Define Offer", subSteps: [2] },
    ],
    getMasterStepForSubStep: vi.fn(() => ({ id: 1, title: "Business Context" })),
    calculateMasterStepCompletion: vi.fn(() => ({
        isFullyComplete: false,
        isPartiallyComplete: false,
        completedCount: 0,
        totalCount: 1,
        percentage: 0,
    })),
    TOTAL_FUNNEL_STEPS: 12,
}));

describe("StepperNav", () => {
    const defaultProps = {
        projectId: "test-project-123",
        currentStep: 1,
    };

    it("should render overall progress", () => {
        render(<StepperNav {...defaultProps} />);

        expect(screen.getByText("Overall Progress")).toBeInTheDocument();
    });

    it("should display completion percentage", () => {
        render(<StepperNav {...defaultProps} completedSteps={[1, 2]} />);

        expect(screen.getByText(/17%/)).toBeInTheDocument(); // 2/12 steps = 16.67% rounds to 17%
    });

    it("should render step navigation", () => {
        render(<StepperNav {...defaultProps} />);

        expect(screen.getByText("Define Context")).toBeInTheDocument();
        expect(screen.getByText("Define Offer")).toBeInTheDocument();
    });

    it("should highlight current step", () => {
        render(<StepperNav {...defaultProps} currentStep={1} />);

        const contextStep = screen.getByText("Define Context");
        const link = contextStep.closest("a");
        // The link should have primary styling when it's the active step
        expect(link).toHaveClass("border-primary/30");
    });

    it("should show completed steps", () => {
        render(<StepperNav {...defaultProps} completedSteps={[1]} />);

        // Check for the green checkmark indicator for completed steps
        const checkIcons = document.querySelectorAll(".bg-green-500");
        expect(checkIcons.length).toBeGreaterThan(0);
    });

    it("should render with custom className", () => {
        const { container } = render(
            <StepperNav {...defaultProps} className="custom-class" />
        );

        expect(container.firstChild).toHaveClass("custom-class");
    });

    it("should display step descriptions", () => {
        render(<StepperNav {...defaultProps} />);

        expect(screen.getByText("Business profile setup")).toBeInTheDocument();
    });

    it("should render correct link hrefs", () => {
        render(<StepperNav {...defaultProps} />);

        const contextLink = screen.getByText("Define Context").closest("a");
        expect(contextLink).toHaveAttribute(
            "href",
            "/funnel-builder/test-project-123/step/1"
        );
    });
});
