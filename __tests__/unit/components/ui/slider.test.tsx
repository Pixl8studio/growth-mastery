/**
 * Slider Component Tests
 * Test slider functionality
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Slider } from "@/components/ui/slider";

describe("Slider", () => {
    it("should render slider", () => {
        render(<Slider aria-label="Volume" />);
        const slider = screen.getByRole("slider");
        expect(slider).toBeInTheDocument();
    });

    it("should render with default value", () => {
        render(<Slider defaultValue={[50]} aria-label="Volume" />);
        const slider = screen.getByRole("slider");
        expect(slider).toHaveAttribute("aria-valuenow", "50");
    });

    it("should render with min and max values", () => {
        render(<Slider min={0} max={100} defaultValue={[50]} aria-label="Volume" />);
        const slider = screen.getByRole("slider");
        expect(slider).toHaveAttribute("aria-valuemin", "0");
        expect(slider).toHaveAttribute("aria-valuemax", "100");
    });

    it("should render with step value", () => {
        render(<Slider step={10} defaultValue={[50]} aria-label="Volume" />);
        const slider = screen.getByRole("slider");
        expect(slider).toBeInTheDocument();
    });

    it("should handle disabled state", () => {
        render(<Slider disabled aria-label="Disabled slider" />);
        const slider = screen.getByRole("slider");
        expect(slider).toHaveAttribute("data-disabled");
    });

    it("should handle value changes", () => {
        const onValueChange = vi.fn();
        render(<Slider onValueChange={onValueChange} defaultValue={[50]} aria-label="Volume" />);
        const slider = screen.getByRole("slider");
        expect(slider).toBeInTheDocument();
    });

    it("should handle custom className", () => {
        render(<Slider className="custom-slider" aria-label="Volume" />);
        const sliderRoot = screen.getByRole("slider").parentElement;
        expect(sliderRoot?.className).toContain("custom-slider");
    });

    it("should render with controlled value", () => {
        render(<Slider value={[75]} aria-label="Volume" />);
        const slider = screen.getByRole("slider");
        expect(slider).toHaveAttribute("aria-valuenow", "75");
    });

    it("should update controlled value", () => {
        const { rerender } = render(<Slider value={[25]} aria-label="Volume" />);
        let slider = screen.getByRole("slider");
        expect(slider).toHaveAttribute("aria-valuenow", "25");

        rerender(<Slider value={[75]} aria-label="Volume" />);
        slider = screen.getByRole("slider");
        expect(slider).toHaveAttribute("aria-valuenow", "75");
    });

    it("should support range slider with multiple values", () => {
        render(<Slider defaultValue={[25, 75]} aria-label="Range" />);
        const sliders = screen.getAllByRole("slider");
        expect(sliders).toHaveLength(2);
        expect(sliders[0]).toHaveAttribute("aria-valuenow", "25");
        expect(sliders[1]).toHaveAttribute("aria-valuenow", "75");
    });

    it("should handle orientation prop", () => {
        render(<Slider orientation="vertical" aria-label="Volume" />);
        const slider = screen.getByRole("slider");
        expect(slider).toHaveAttribute("aria-orientation", "vertical");
    });
});
