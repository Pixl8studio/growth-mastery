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
        expect(screen.getByText(/Step 5 of 11/i)).toBeInTheDocument();
    });

    it("should calculate percentage correctly", () => {
        render(<ProgressBar currentStep={6} />);
        // 6/11 = 54.5% -> rounds to 55%
        expect(screen.getByText(/55%/i)).toBeInTheDocument();
    });

    it("should show 100% on last step", () => {
        render(<ProgressBar currentStep={11} />);
        expect(screen.getByText(/100%/i)).toBeInTheDocument();
    });

    it("should show 9% on first step", () => {
        render(<ProgressBar currentStep={1} />);
        // 1/11 = 9.09% -> rounds to 9%
        expect(screen.getByText(/9%/i)).toBeInTheDocument();
    });

    it("should accept custom className", () => {
        const { container } = render(
            <ProgressBar currentStep={5} className="custom-progress" />
        );
        expect(container.querySelector(".custom-progress")).toBeInTheDocument();
    });
});
