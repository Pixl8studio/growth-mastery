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
        expect(screen.getByText(/Step 5 of 12/i)).toBeInTheDocument();
    });

    it("should calculate percentage correctly", () => {
        render(<ProgressBar currentStep={6} />);
        // 6/12 = 50%
        expect(screen.getByText(/50%/i)).toBeInTheDocument();
    });

    it("should show 100% on last step", () => {
        render(<ProgressBar currentStep={12} />);
        expect(screen.getByText(/100%/i)).toBeInTheDocument();
    });

    it("should show 8% on first step", () => {
        render(<ProgressBar currentStep={1} />);
        // 1/12 = 8.33% -> rounds to 8%
        expect(screen.getByText(/8%/i)).toBeInTheDocument();
    });

    it("should accept custom className", () => {
        const { container } = render(
            <ProgressBar currentStep={5} className="custom-progress" />
        );
        expect(container.querySelector(".custom-progress")).toBeInTheDocument();
    });
});
