/**
 * StepLayout Component Tests
 * Tests step layout with navigation and sidebar
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StepLayout } from "@/components/funnel/step-layout";

// Mock child components
vi.mock("@/components/funnel/stepper-nav", () => ({
    StepperNav: () => <div>Stepper Nav</div>,
}));

vi.mock("@/components/layout/generation-progress-tracker", () => ({
    GenerationProgressTracker: () => <div>Progress Tracker</div>,
}));

vi.mock("@/app/funnel-builder/master-steps-config", () => ({
    getMasterStepForSubStep: vi.fn(() => ({ id: 1, name: "Business Context" })),
    MASTER_STEPS: [],
    getFirstIncompleteSubStep: vi.fn(),
}));

describe("StepLayout", () => {
    const defaultProps = {
        currentStep: 1,
        projectId: "test-project-123",
        children: <div>Step Content</div>,
    };

    it("should render children content", () => {
        render(<StepLayout {...defaultProps} />);

        expect(screen.getByText("Step Content")).toBeInTheDocument();
    });

    it("should render stepper navigation", () => {
        render(<StepLayout {...defaultProps} />);

        expect(screen.getByText("Stepper Nav")).toBeInTheDocument();
    });

    it("should display step title when provided", () => {
        render(<StepLayout {...defaultProps} stepTitle="Business Context" />);

        expect(screen.getByText("Business Context")).toBeInTheDocument();
    });

    it("should display step description when provided", () => {
        render(
            <StepLayout
                {...defaultProps}
                stepDescription="Set up your business profile"
            />
        );

        expect(screen.getByText("Set up your business profile")).toBeInTheDocument();
    });

    it("should display funnel name when provided", () => {
        render(<StepLayout {...defaultProps} funnelName="My Funnel" />);

        expect(screen.getByText("My Funnel")).toBeInTheDocument();
    });

    it("should render continue button", () => {
        render(<StepLayout {...defaultProps} />);

        expect(screen.getByRole("button", { name: /Continue/i })).toBeInTheDocument();
    });

    it("should render save button when showSaveButton is true", () => {
        render(<StepLayout {...defaultProps} showSaveButton={true} />);

        expect(
            screen.getByRole("button", { name: /Save Progress/i })
        ).toBeInTheDocument();
    });

    it("should use custom next label", () => {
        render(<StepLayout {...defaultProps} nextLabel="Next Step" />);

        expect(screen.getByRole("button", { name: /Next Step/i })).toBeInTheDocument();
    });

    it("should use custom save label", () => {
        render(
            <StepLayout
                {...defaultProps}
                showSaveButton={true}
                saveLabel="Save Draft"
            />
        );

        expect(screen.getByRole("button", { name: /Save Draft/i })).toBeInTheDocument();
    });

    it("should disable next button when nextDisabled is true", () => {
        render(<StepLayout {...defaultProps} nextDisabled={true} />);

        const nextButton = screen.getByRole("button", { name: /Continue/i });
        expect(nextButton).toBeDisabled();
    });
});
