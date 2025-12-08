/**
 * Progress Component Tests
 * Tests progress bar functionality
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Progress } from "@/components/ui/progress";

describe("Progress", () => {
    it("should render progress bar", () => {
        render(<Progress value={50} aria-label="Progress" />);
        const progress = screen.getByRole("progressbar");
        expect(progress).toBeInTheDocument();
    });

    it("should display correct progress value via aria-valuenow", () => {
        render(<Progress value={75} aria-label="75% complete" />);
        const progress = screen.getByRole("progressbar");
        expect(progress).toHaveAttribute("aria-valuenow", "75");
    });

    it("should handle 0% progress", () => {
        render(<Progress value={0} aria-label="0% complete" />);
        const progress = screen.getByRole("progressbar");
        expect(progress).toHaveAttribute("aria-valuenow", "0");
    });

    it("should handle 100% progress", () => {
        render(<Progress value={100} aria-label="100% complete" />);
        const progress = screen.getByRole("progressbar");
        expect(progress).toHaveAttribute("aria-valuenow", "100");
    });

    it("should handle undefined value", () => {
        render(<Progress aria-label="Unknown progress" />);
        const progress = screen.getByRole("progressbar");
        expect(progress).toBeInTheDocument();
    });

    it("should handle custom className", () => {
        render(<Progress value={50} className="custom-progress" aria-label="Progress" />);
        const progress = screen.getByRole("progressbar");
        expect(progress.className).toContain("custom-progress");
    });

    it("should render with aria-valuemax", () => {
        render(<Progress value={50} max={100} aria-label="Progress" />);
        const progress = screen.getByRole("progressbar");
        expect(progress).toHaveAttribute("aria-valuemax", "100");
    });

    it("should update progress value dynamically", () => {
        const { rerender } = render(<Progress value={25} aria-label="Progress" />);
        let progress = screen.getByRole("progressbar");
        expect(progress).toHaveAttribute("aria-valuenow", "25");

        rerender(<Progress value={75} aria-label="Progress" />);
        progress = screen.getByRole("progressbar");
        expect(progress).toHaveAttribute("aria-valuenow", "75");
    });
});
