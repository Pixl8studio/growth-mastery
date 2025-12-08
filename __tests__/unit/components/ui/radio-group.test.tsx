/**
 * Radio Group Component Tests
 * Test radio group functionality
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

describe("RadioGroup", () => {
    it("should render radio group with items", () => {
        render(
            <RadioGroup>
                <div>
                    <RadioGroupItem value="option1" id="option1" />
                    <Label htmlFor="option1">Option 1</Label>
                </div>
            </RadioGroup>
        );
        expect(screen.getByLabelText("Option 1")).toBeInTheDocument();
    });

    it("should render multiple radio items", () => {
        render(
            <RadioGroup>
                <div>
                    <RadioGroupItem value="option1" id="option1" />
                    <Label htmlFor="option1">Option 1</Label>
                </div>
                <div>
                    <RadioGroupItem value="option2" id="option2" />
                    <Label htmlFor="option2">Option 2</Label>
                </div>
                <div>
                    <RadioGroupItem value="option3" id="option3" />
                    <Label htmlFor="option3">Option 3</Label>
                </div>
            </RadioGroup>
        );
        expect(screen.getByLabelText("Option 1")).toBeInTheDocument();
        expect(screen.getByLabelText("Option 2")).toBeInTheDocument();
        expect(screen.getByLabelText("Option 3")).toBeInTheDocument();
    });

    it("should handle default value", () => {
        render(
            <RadioGroup defaultValue="option2">
                <div>
                    <RadioGroupItem value="option1" id="option1" />
                    <Label htmlFor="option1">Option 1</Label>
                </div>
                <div>
                    <RadioGroupItem value="option2" id="option2" />
                    <Label htmlFor="option2">Option 2</Label>
                </div>
            </RadioGroup>
        );
        const option2 = screen.getByLabelText("Option 2");
        expect(option2).toHaveAttribute("data-state", "checked");
    });

    it("should handle value changes", async () => {
        const user = userEvent.setup();
        const onValueChange = vi.fn();
        render(
            <RadioGroup onValueChange={onValueChange}>
                <div>
                    <RadioGroupItem value="option1" id="option1" />
                    <Label htmlFor="option1">Option 1</Label>
                </div>
                <div>
                    <RadioGroupItem value="option2" id="option2" />
                    <Label htmlFor="option2">Option 2</Label>
                </div>
            </RadioGroup>
        );

        await user.click(screen.getByLabelText("Option 1"));
        expect(onValueChange).toHaveBeenCalledWith("option1");

        await user.click(screen.getByLabelText("Option 2"));
        expect(onValueChange).toHaveBeenCalledWith("option2");
    });

    it("should handle disabled state", () => {
        render(
            <RadioGroup disabled>
                <div>
                    <RadioGroupItem value="option1" id="option1" />
                    <Label htmlFor="option1">Option 1</Label>
                </div>
            </RadioGroup>
        );
        const radio = screen.getByLabelText("Option 1");
        expect(radio).toHaveAttribute("disabled");
    });

    it("should handle disabled individual items", () => {
        render(
            <RadioGroup>
                <div>
                    <RadioGroupItem value="option1" id="option1" />
                    <Label htmlFor="option1">Option 1</Label>
                </div>
                <div>
                    <RadioGroupItem value="option2" id="option2" disabled />
                    <Label htmlFor="option2">Option 2 (disabled)</Label>
                </div>
            </RadioGroup>
        );
        const option1 = screen.getByLabelText("Option 1");
        const option2 = screen.getByLabelText("Option 2 (disabled)");
        expect(option1).not.toHaveAttribute("disabled");
        expect(option2).toHaveAttribute("disabled");
    });

    it("should handle custom className on RadioGroup", () => {
        render(
            <RadioGroup className="custom-group">
                <div>
                    <RadioGroupItem value="option1" id="option1" />
                    <Label htmlFor="option1">Option 1</Label>
                </div>
            </RadioGroup>
        );
        const group = screen.getByLabelText("Option 1").closest('[role="radiogroup"]');
        expect(group?.className).toContain("custom-group");
    });

    it("should handle custom className on RadioGroupItem", () => {
        render(
            <RadioGroup>
                <div>
                    <RadioGroupItem
                        value="option1"
                        id="option1"
                        className="custom-item"
                    />
                    <Label htmlFor="option1">Option 1</Label>
                </div>
            </RadioGroup>
        );
        const item = screen.getByLabelText("Option 1");
        expect(item.className).toContain("custom-item");
    });

    it("should only allow one selection at a time", async () => {
        const user = userEvent.setup();
        render(
            <RadioGroup>
                <div>
                    <RadioGroupItem value="option1" id="option1" />
                    <Label htmlFor="option1">Option 1</Label>
                </div>
                <div>
                    <RadioGroupItem value="option2" id="option2" />
                    <Label htmlFor="option2">Option 2</Label>
                </div>
            </RadioGroup>
        );

        const option1 = screen.getByLabelText("Option 1");
        const option2 = screen.getByLabelText("Option 2");

        await user.click(option1);
        expect(option1).toHaveAttribute("data-state", "checked");
        expect(option2).toHaveAttribute("data-state", "unchecked");

        await user.click(option2);
        expect(option1).toHaveAttribute("data-state", "unchecked");
        expect(option2).toHaveAttribute("data-state", "checked");
    });
});
