/**
 * Progress Bar Component Tests
 * Test progress bar calculation and rendering
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressBar } from "@/components/funnel/progress-bar";

describe("ProgressBar", () => {
    it("should render with current step", () => {
        render(<ProgressBar currentStep={5} />);
        expect(screen.getByText(/Step 5 of 15/i)).toBeInTheDocument();
    });

    it("should calculate percentage correctly", () => {
        render(<ProgressBar currentStep={8} />);
        // 8/15 = 53.33% -> rounds to 53%
        expect(screen.getByText(/53%/i)).toBeInTheDocument();
    });

    it("should show 100% on last step", () => {
        render(<ProgressBar currentStep={15} />);
        expect(screen.getByText(/100%/i)).toBeInTheDocument();
    });

    it("should show 7% on first step", () => {
        render(<ProgressBar currentStep={1} />);
        // 1/15 = 6.67% -> rounds to 7%
        expect(screen.getByText(/7%/i)).toBeInTheDocument();
    });

    it("should accept custom className", () => {
        const { container } = render(
            <ProgressBar currentStep={5} className="custom-progress" />
        );
        expect(container.querySelector(".custom-progress")).toBeInTheDocument();
    });
});
