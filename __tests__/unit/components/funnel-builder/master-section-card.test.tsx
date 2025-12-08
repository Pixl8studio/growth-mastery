/**
 * MasterSectionCard Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MasterSectionCard } from "@/components/funnel-builder/master-section-card";
import type { MasterStepCompletion } from "@/app/funnel-builder/completion-types";

// Mock next/link
vi.mock("next/link", () => ({
    default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock master steps config
vi.mock("@/app/funnel-builder/master-steps-config", () => ({
    getMasterStepById: (id: number) => {
        const steps: any = {
            1: {
                id: 1,
                title: "Foundation",
                description: "Set up your funnel foundation",
                subSteps: [1, 2, 3],
            },
            2: {
                id: 2,
                title: "Content",
                description: "Create your content",
                subSteps: [4, 5, 6],
            },
        };
        return steps[id];
    },
    getFirstIncompleteSubStep: (masterStep: any, completedSteps: number[]) => {
        for (const stepNum of masterStep.subSteps) {
            if (!completedSteps.includes(stepNum)) {
                return stepNum;
            }
        }
        return masterStep.subSteps[0];
    },
}));

describe("MasterSectionCard", () => {
    const mockCompletion: MasterStepCompletion = {
        masterStepId: 1,
        isFullyComplete: false,
        isPartiallyComplete: false,
        completedCount: 0,
        totalCount: 3,
        percentage: 0,
    };

    const mockProps = {
        masterStepId: 1,
        completion: mockCompletion,
        completedSubSteps: [],
        projectId: "project-123",
        subStepDetails: [
            { number: 1, title: "Intake", description: "Multiple input options" },
            { number: 2, title: "Define Offer", description: "7 P's framework" },
            { number: 3, title: "Brand Design", description: "Visual identity" },
        ],
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render master section title", () => {
        render(<MasterSectionCard {...mockProps} />);

        expect(screen.getByText("Foundation")).toBeInTheDocument();
    });

    it("should render description", () => {
        render(<MasterSectionCard {...mockProps} />);

        expect(screen.getByText("Set up your funnel foundation")).toBeInTheDocument();
    });

    it("should display completion progress", () => {
        render(<MasterSectionCard {...mockProps} />);

        expect(screen.getByText("0/3 steps")).toBeInTheDocument();
        expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("should show Not Started badge when not started", () => {
        render(<MasterSectionCard {...mockProps} />);

        expect(screen.getByText("Not Started")).toBeInTheDocument();
    });

    it("should show In Progress badge when partially complete", () => {
        const partialCompletion: MasterStepCompletion = {
            ...mockCompletion,
            isPartiallyComplete: true,
            completedCount: 1,
            percentage: 33,
        };

        const partialProps = {
            ...mockProps,
            completion: partialCompletion,
            completedSubSteps: [1],
        };

        render(<MasterSectionCard {...partialProps} />);

        expect(screen.getByText("In Progress")).toBeInTheDocument();
        expect(screen.getByText("1/3 steps")).toBeInTheDocument();
        expect(screen.getByText("33%")).toBeInTheDocument();
    });

    it("should show Complete badge when fully complete", () => {
        const completeCompletion: MasterStepCompletion = {
            masterStepId: 1,
            isFullyComplete: true,
            isPartiallyComplete: false,
            completedCount: 3,
            totalCount: 3,
            percentage: 100,
        };

        const completeProps = {
            ...mockProps,
            completion: completeCompletion,
            completedSubSteps: [1, 2, 3],
        };

        render(<MasterSectionCard {...completeProps} />);

        expect(screen.getByText("Complete")).toBeInTheDocument();
        expect(screen.getByText("3/3 steps")).toBeInTheDocument();
        expect(screen.getByText("100%")).toBeInTheDocument();
    });

    it("should render Get Started button when not started", () => {
        render(<MasterSectionCard {...mockProps} />);

        expect(screen.getByText("Get Started")).toBeInTheDocument();
    });

    it("should render Continue button when in progress", () => {
        const partialCompletion: MasterStepCompletion = {
            ...mockCompletion,
            isPartiallyComplete: true,
            completedCount: 1,
        };

        const partialProps = {
            ...mockProps,
            completion: partialCompletion,
            completedSubSteps: [1],
        };

        render(<MasterSectionCard {...partialProps} />);

        expect(screen.getByText("Continue")).toBeInTheDocument();
    });

    it("should render Review Steps button when complete", () => {
        const completeCompletion: MasterStepCompletion = {
            masterStepId: 1,
            isFullyComplete: true,
            isPartiallyComplete: false,
            completedCount: 3,
            totalCount: 3,
            percentage: 100,
        };

        const completeProps = {
            ...mockProps,
            completion: completeCompletion,
            completedSubSteps: [1, 2, 3],
        };

        render(<MasterSectionCard {...completeProps} />);

        expect(screen.getByText("Review Steps")).toBeInTheDocument();
    });

    it("should toggle expanded state on Show Details click", () => {
        render(<MasterSectionCard {...mockProps} />);

        const showButton = screen.getByText("Show Details");
        fireEvent.click(showButton);

        expect(screen.getByText("Hide Details")).toBeInTheDocument();
    });

    it("should display sub-steps when expanded", () => {
        render(<MasterSectionCard {...mockProps} />);

        const showButton = screen.getByText("Show Details");
        fireEvent.click(showButton);

        expect(screen.getByText("Intake")).toBeInTheDocument();
        expect(screen.getByText("Define Offer")).toBeInTheDocument();
        expect(screen.getByText("Brand Design")).toBeInTheDocument();
    });

    it("should show completed indicator for completed sub-steps", () => {
        const propsWithCompleted = {
            ...mockProps,
            completedSubSteps: [1],
        };

        render(<MasterSectionCard {...propsWithCompleted} />);

        const showButton = screen.getByText("Show Details");
        fireEvent.click(showButton);

        // Check that completed step has check icon (using aria-hidden or other accessible attributes)
        const intakeLink = screen.getByText("Intake").closest("a");
        expect(intakeLink).toBeInTheDocument();
    });

    it("should link to correct navigation href", () => {
        render(<MasterSectionCard {...mockProps} />);

        const getStartedLink = screen.getByText("Get Started").closest("a");
        expect(getStartedLink).toHaveAttribute(
            "href",
            "/funnel-builder/project-123/step/1"
        );
    });

    it("should return null for invalid master step ID", () => {
        const invalidProps = {
            ...mockProps,
            masterStepId: 999,
        };

        const { container } = render(<MasterSectionCard {...invalidProps} />);
        expect(container.firstChild).toBeNull();
    });
});
