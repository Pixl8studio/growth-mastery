/**
 * Horizontal Progress Component Tests
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HorizontalProgress } from "@/components/funnel/horizontal-progress";

// Mock Next.js Link
vi.mock("next/link", () => ({
    default: ({
        children,
        href,
        ...props
    }: {
        children: React.ReactNode;
        href: string;
    }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

describe("HorizontalProgress", () => {
    const defaultProps = {
        projectId: "test-project-id",
        currentStep: 3,
        completedSteps: [1, 2],
    };

    it("renders all 15 steps", () => {
        render(<HorizontalProgress {...defaultProps} />);

        // Check that we have 15 links (one for each step)
        const links = screen.getAllByRole("link");
        expect(links).toHaveLength(15);
    });

    it("displays correct completion percentage", () => {
        render(<HorizontalProgress {...defaultProps} />);

        // 2 completed out of 15 = 13%
        expect(screen.getByText("13%")).toBeInTheDocument();
    });

    it("shows step numbers for non-completed steps", () => {
        render(<HorizontalProgress {...defaultProps} />);

        // Step 3 is current (not completed), should show number
        expect(screen.getByText("3")).toBeInTheDocument();

        // Step 4 is future (not completed), should show number
        expect(screen.getByText("4")).toBeInTheDocument();
    });

    it("highlights the current step", () => {
        render(<HorizontalProgress {...defaultProps} />);

        // The current step (3) should be displayed
        const step3 = screen.getByText("3");
        expect(step3).toBeInTheDocument();
    });

    it("shows correct step count summary", () => {
        render(<HorizontalProgress {...defaultProps} />);

        expect(screen.getByText("2 completed")).toBeInTheDocument();
        expect(screen.getByText("1 active")).toBeInTheDocument();
        expect(screen.getByText("12 remaining")).toBeInTheDocument();
    });

    it("generates correct links for each step", () => {
        render(<HorizontalProgress {...defaultProps} />);

        const links = screen.getAllByRole("link");
        expect(links[0]).toHaveAttribute(
            "href",
            "/funnel-builder/test-project-id/step/1"
        );
        expect(links[2]).toHaveAttribute(
            "href",
            "/funnel-builder/test-project-id/step/3"
        );
    });

    it("handles 0% completion", () => {
        render(
            <HorizontalProgress
                projectId="test-id"
                currentStep={1}
                completedSteps={[]}
            />
        );

        expect(screen.getByText("0%")).toBeInTheDocument();
        expect(screen.getByText("0 completed")).toBeInTheDocument();
    });

    it("handles 100% completion", () => {
        const allSteps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
        render(
            <HorizontalProgress
                projectId="test-id"
                currentStep={15}
                completedSteps={allSteps}
            />
        );

        expect(screen.getByText("100%")).toBeInTheDocument();
        expect(screen.getByText("15 completed")).toBeInTheDocument();
    });
});
