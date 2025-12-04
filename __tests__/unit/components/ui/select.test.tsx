/**
 * Select Component Tests
 * Test select dropdown functionality
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectGroup,
} from "@/components/ui/select";

describe("Select", () => {
    it("should render select trigger", () => {
        render(
            <Select>
                <SelectTrigger>
                    <SelectValue placeholder="Select option" />
                </SelectTrigger>
            </Select>
        );
        expect(screen.getByText("Select option")).toBeInTheDocument();
    });

    it("should open select when trigger is clicked", async () => {
        const user = userEvent.setup();
        render(
            <Select>
                <SelectTrigger>
                    <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="option1">Option 1</SelectItem>
                </SelectContent>
            </Select>
        );

        await user.click(screen.getByRole("combobox"));
        expect(screen.getByText("Option 1")).toBeInTheDocument();
    });

    it("should render multiple select items", async () => {
        const user = userEvent.setup();
        render(
            <Select>
                <SelectTrigger>
                    <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="option1">Option 1</SelectItem>
                    <SelectItem value="option2">Option 2</SelectItem>
                    <SelectItem value="option3">Option 3</SelectItem>
                </SelectContent>
            </Select>
        );

        await user.click(screen.getByRole("combobox"));
        expect(screen.getByText("Option 1")).toBeInTheDocument();
        expect(screen.getByText("Option 2")).toBeInTheDocument();
        expect(screen.getByText("Option 3")).toBeInTheDocument();
    });

    it("should handle value changes", async () => {
        const user = userEvent.setup();
        const onValueChange = vi.fn();
        render(
            <Select onValueChange={onValueChange}>
                <SelectTrigger>
                    <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="option1">Option 1</SelectItem>
                    <SelectItem value="option2">Option 2</SelectItem>
                </SelectContent>
            </Select>
        );

        await user.click(screen.getByRole("combobox"));
        await user.click(screen.getByText("Option 1"));
        expect(onValueChange).toHaveBeenCalledWith("option1");
    });

    it("should render with default value", () => {
        render(
            <Select defaultValue="option2">
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="option1">Option 1</SelectItem>
                    <SelectItem value="option2">Option 2</SelectItem>
                </SelectContent>
            </Select>
        );
        expect(screen.getByText("Option 2")).toBeInTheDocument();
    });

    it("should handle disabled state", () => {
        render(
            <Select disabled>
                <SelectTrigger>
                    <SelectValue placeholder="Disabled select" />
                </SelectTrigger>
            </Select>
        );
        const trigger = screen.getByRole("combobox");
        expect(trigger).toHaveAttribute("disabled");
    });

    it("should render select with groups", async () => {
        const user = userEvent.setup();
        render(
            <Select>
                <SelectTrigger>
                    <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        <SelectLabel>Fruits</SelectLabel>
                        <SelectItem value="apple">Apple</SelectItem>
                        <SelectItem value="banana">Banana</SelectItem>
                    </SelectGroup>
                </SelectContent>
            </Select>
        );

        await user.click(screen.getByRole("combobox"));
        expect(screen.getByText("Fruits")).toBeInTheDocument();
        expect(screen.getByText("Apple")).toBeInTheDocument();
    });

    it("should render select with separator", async () => {
        const user = userEvent.setup();
        render(
            <Select>
                <SelectTrigger>
                    <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="option1">Option 1</SelectItem>
                    <SelectSeparator />
                    <SelectItem value="option2">Option 2</SelectItem>
                </SelectContent>
            </Select>
        );

        await user.click(screen.getByRole("combobox"));
        const separator = screen.getByText("Option 1").nextElementSibling;
        expect(separator).toBeInTheDocument();
    });

    it("should handle custom className on trigger", () => {
        render(
            <Select>
                <SelectTrigger className="custom-trigger">
                    <SelectValue placeholder="Select option" />
                </SelectTrigger>
            </Select>
        );
        const trigger = screen.getByRole("combobox");
        expect(trigger.className).toContain("custom-trigger");
    });

    it("should handle custom className on content", async () => {
        const user = userEvent.setup();
        render(
            <Select>
                <SelectTrigger>
                    <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent className="custom-content">
                    <SelectItem value="option1">Option 1</SelectItem>
                </SelectContent>
            </Select>
        );

        await user.click(screen.getByRole("combobox"));
        const content = screen.getByText("Option 1").closest('[role="listbox"]');
        expect(content?.className).toContain("custom-content");
    });

    it("should handle disabled select items", async () => {
        const user = userEvent.setup();
        const onValueChange = vi.fn();
        render(
            <Select onValueChange={onValueChange}>
                <SelectTrigger>
                    <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="option1">Option 1</SelectItem>
                    <SelectItem value="option2" disabled>
                        Option 2 (disabled)
                    </SelectItem>
                </SelectContent>
            </Select>
        );

        await user.click(screen.getByRole("combobox"));
        await user.click(screen.getByText("Option 2 (disabled)"));
        expect(onValueChange).not.toHaveBeenCalled();
    });
});
