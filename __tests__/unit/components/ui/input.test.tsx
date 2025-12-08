/**
 * Input Component Tests
 * Test input functionality and states
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "@/components/ui/input";

describe("Input", () => {
    it("should render input with default type", () => {
        render(<Input placeholder="Enter text" />);
        const input = screen.getByPlaceholderText("Enter text") as HTMLInputElement;
        expect(input).toBeInTheDocument();
        // When type is not provided, browsers default to "text" behavior
        // The type attribute may not be explicitly set, but the input functions as text
        expect(input.type).toBe("text");
    });

    it("should render input with different types", () => {
        const { rerender } = render(<Input type="email" placeholder="Email" />);
        expect(screen.getByPlaceholderText("Email")).toHaveAttribute("type", "email");

        rerender(<Input type="password" placeholder="Password" />);
        expect(screen.getByPlaceholderText("Password")).toHaveAttribute("type", "password");

        rerender(<Input type="number" placeholder="Number" />);
        expect(screen.getByPlaceholderText("Number")).toHaveAttribute("type", "number");
    });

    it("should handle value prop", () => {
        render(<Input value="test value" onChange={() => {}} />);
        const input = screen.getByDisplayValue("test value");
        expect(input).toBeInTheDocument();
    });

    it("should handle disabled state", () => {
        render(<Input disabled placeholder="Disabled input" />);
        const input = screen.getByPlaceholderText("Disabled input");
        expect(input).toBeDisabled();
    });

    it("should handle readonly state", () => {
        render(<Input readOnly value="readonly text" />);
        const input = screen.getByDisplayValue("readonly text");
        expect(input).toHaveAttribute("readonly");
    });

    it("should handle onChange events", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<Input onChange={onChange} placeholder="Type here" />);

        const input = screen.getByPlaceholderText("Type here");
        await user.type(input, "test");

        expect(onChange).toHaveBeenCalled();
    });

    it("should handle custom className", () => {
        render(<Input className="custom-input" placeholder="Custom input" />);
        const input = screen.getByPlaceholderText("Custom input");
        expect(input.className).toContain("custom-input");
    });

    it("should handle placeholder text", () => {
        render(<Input placeholder="Enter your name" />);
        const input = screen.getByPlaceholderText("Enter your name");
        expect(input).toBeInTheDocument();
    });

    it("should allow typing when not disabled", async () => {
        const user = userEvent.setup();
        render(<Input placeholder="Type here" />);

        const input = screen.getByPlaceholderText("Type here") as HTMLInputElement;
        await user.type(input, "Hello World");

        expect(input.value).toBe("Hello World");
    });

    it("should not allow typing when disabled", async () => {
        const user = userEvent.setup();
        render(<Input disabled placeholder="Disabled" />);

        const input = screen.getByPlaceholderText("Disabled") as HTMLInputElement;
        await user.type(input, "test");

        expect(input.value).toBe("");
    });

    it("should handle required attribute", () => {
        render(<Input required placeholder="Required input" />);
        const input = screen.getByPlaceholderText("Required input");
        expect(input).toBeRequired();
    });

    it("should handle maxLength attribute", () => {
        render(<Input maxLength={10} placeholder="Max 10 chars" />);
        const input = screen.getByPlaceholderText("Max 10 chars");
        expect(input).toHaveAttribute("maxLength", "10");
    });
});
