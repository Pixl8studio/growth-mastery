/**
 * Checkbox Component Tests
 * Test checkbox functionality and states
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "@/components/ui/checkbox";

describe("Checkbox", () => {
    it("should render checkbox", () => {
        render(<Checkbox aria-label="Accept terms" />);
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).toBeInTheDocument();
    });

    it("should handle checked state", () => {
        render(<Checkbox checked aria-label="Checked checkbox" />);
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).toBeChecked();
    });

    it("should handle unchecked state", () => {
        render(<Checkbox checked={false} aria-label="Unchecked checkbox" />);
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).not.toBeChecked();
    });

    it("should handle disabled state", () => {
        render(<Checkbox disabled aria-label="Disabled checkbox" />);
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).toBeDisabled();
    });

    it("should handle click events", async () => {
        const user = userEvent.setup();
        const onCheckedChange = vi.fn();
        render(<Checkbox onCheckedChange={onCheckedChange} aria-label="Clickable checkbox" />);

        const checkbox = screen.getByRole("checkbox");
        await user.click(checkbox);

        expect(onCheckedChange).toHaveBeenCalledWith(true);
    });

    it("should handle onChange events", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<Checkbox onChange={onChange} aria-label="Checkbox with onChange" />);

        const checkbox = screen.getByRole("checkbox");
        await user.click(checkbox);

        expect(onChange).toHaveBeenCalled();
    });

    it("should handle custom className", () => {
        render(<Checkbox className="custom-checkbox" aria-label="Custom checkbox" />);
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox.className).toContain("custom-checkbox");
    });

    it("should toggle checked state when clicked", async () => {
        const user = userEvent.setup();
        render(<Checkbox aria-label="Toggle checkbox" />);

        const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
        expect(checkbox.checked).toBe(false);

        await user.click(checkbox);
        expect(checkbox.checked).toBe(true);

        await user.click(checkbox);
        expect(checkbox.checked).toBe(false);
    });

    it("should not toggle when disabled", async () => {
        const user = userEvent.setup();
        const onCheckedChange = vi.fn();
        render(
            <Checkbox
                disabled
                onCheckedChange={onCheckedChange}
                aria-label="Disabled checkbox"
            />
        );

        const checkbox = screen.getByRole("checkbox");
        await user.click(checkbox);

        expect(onCheckedChange).not.toHaveBeenCalled();
    });
});
