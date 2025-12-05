/**
 * DependencyWarning Component Tests
 * Tests dependency warning banner with navigation
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DependencyWarning } from "@/components/funnel/dependency-warning";

describe("DependencyWarning", () => {
    const defaultProps = {
        message: "You need to complete the offer definition first",
        requiredStep: 2,
        requiredStepName: "Define Offer",
        projectId: "test-project-123",
    };

    it("should render warning message", () => {
        render(<DependencyWarning {...defaultProps} />);

        expect(
            screen.getByText("You need to complete the offer definition first")
        ).toBeInTheDocument();
    });

    it("should display warning icon", () => {
        render(<DependencyWarning {...defaultProps} />);

        const icon = document.querySelector("svg");
        expect(icon).toBeInTheDocument();
    });

    it("should display heading", () => {
        render(<DependencyWarning {...defaultProps} />);

        expect(screen.getByText("⚠️ Missing Prerequisites")).toBeInTheDocument();
    });

    it("should render navigation button", () => {
        render(<DependencyWarning {...defaultProps} />);

        const button = screen.getByRole("button", {
            name: /Go to Step 2: Define Offer/i,
        });
        expect(button).toBeInTheDocument();
    });

    it("should render correct link href", () => {
        render(<DependencyWarning {...defaultProps} />);

        const link = screen.getByRole("button", { name: /Go to Step 2/i }).closest("a");
        expect(link).toHaveAttribute("href", "/funnel-builder/test-project-123/step/2");
    });

    it("should render with different step numbers", () => {
        render(
            <DependencyWarning
                {...defaultProps}
                requiredStep={5}
                requiredStepName="Create Presentation"
            />
        );

        expect(
            screen.getByRole("button", {
                name: /Go to Step 5: Create Presentation/i,
            })
        ).toBeInTheDocument();
    });

    it("should display custom message", () => {
        render(
            <DependencyWarning
                {...defaultProps}
                message="Please upload your video before proceeding"
            />
        );

        expect(
            screen.getByText("Please upload your video before proceeding")
        ).toBeInTheDocument();
    });

    it("should use amber styling", () => {
        const { container } = render(<DependencyWarning {...defaultProps} />);

        const warningDiv = container.querySelector(".border-amber-200");
        expect(warningDiv).toBeInTheDocument();
    });

    it("should render with different project IDs", () => {
        render(<DependencyWarning {...defaultProps} projectId="another-project-456" />);

        const link = screen.getByRole("button", { name: /Go to Step 2/i }).closest("a");
        expect(link).toHaveAttribute(
            "href",
            "/funnel-builder/another-project-456/step/2"
        );
    });
});
