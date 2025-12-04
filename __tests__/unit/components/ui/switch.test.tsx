/**
 * Switch Component Tests
 * Test switch toggle functionality
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Switch } from "@/components/ui/switch";

describe("Switch", () => {
    it("should render switch", () => {
        render(<Switch aria-label="Toggle notifications" />);
        const switchElement = screen.getByRole("switch");
        expect(switchElement).toBeInTheDocument();
    });

    it("should handle checked state", () => {
        render(<Switch checked aria-label="Enabled switch" />);
        const switchElement = screen.getByRole("switch");
        expect(switchElement).toHaveAttribute("data-state", "checked");
    });

    it("should handle unchecked state", () => {
        render(<Switch checked={false} aria-label="Disabled switch" />);
        const switchElement = screen.getByRole("switch");
        expect(switchElement).toHaveAttribute("data-state", "unchecked");
    });

    it("should handle disabled state", () => {
        render(<Switch disabled aria-label="Disabled switch" />);
        const switchElement = screen.getByRole("switch");
        expect(switchElement).toHaveAttribute("disabled");
    });

    it("should toggle state when clicked", async () => {
        const user = userEvent.setup();
        const onCheckedChange = vi.fn();
        render(<Switch onCheckedChange={onCheckedChange} aria-label="Toggle switch" />);

        const switchElement = screen.getByRole("switch");
        await user.click(switchElement);

        expect(onCheckedChange).toHaveBeenCalledWith(true);
    });

    it("should not toggle when disabled", async () => {
        const user = userEvent.setup();
        const onCheckedChange = vi.fn();
        render(
            <Switch disabled onCheckedChange={onCheckedChange} aria-label="Disabled switch" />
        );

        const switchElement = screen.getByRole("switch");
        await user.click(switchElement);

        expect(onCheckedChange).not.toHaveBeenCalled();
    });

    it("should handle custom className", () => {
        render(<Switch className="custom-switch" aria-label="Custom switch" />);
        const switchElement = screen.getByRole("switch");
        expect(switchElement.className).toContain("custom-switch");
    });

    it("should handle default checked state", () => {
        render(<Switch defaultChecked aria-label="Default checked" />);
        const switchElement = screen.getByRole("switch");
        expect(switchElement).toHaveAttribute("data-state", "checked");
    });

    it("should toggle from checked to unchecked", async () => {
        const user = userEvent.setup();
        const onCheckedChange = vi.fn();
        render(
            <Switch
                defaultChecked
                onCheckedChange={onCheckedChange}
                aria-label="Toggle switch"
            />
        );

        const switchElement = screen.getByRole("switch");
        expect(switchElement).toHaveAttribute("data-state", "checked");

        await user.click(switchElement);
        expect(onCheckedChange).toHaveBeenCalledWith(false);
    });

    it("should work with form integration", () => {
        render(
            <form>
                <Switch name="notifications" aria-label="Notifications" />
            </form>
        );
        const switchElement = screen.getByRole("switch");
        expect(switchElement).toHaveAttribute("name", "notifications");
    });

    it("should handle controlled state", () => {
        const { rerender } = render(<Switch checked={false} aria-label="Controlled switch" />);
        let switchElement = screen.getByRole("switch");
        expect(switchElement).toHaveAttribute("data-state", "unchecked");

        rerender(<Switch checked={true} aria-label="Controlled switch" />);
        switchElement = screen.getByRole("switch");
        expect(switchElement).toHaveAttribute("data-state", "checked");
    });
});
