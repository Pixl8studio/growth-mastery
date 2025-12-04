/**
 * Textarea Component Tests
 * Test textarea functionality
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Textarea } from "@/components/ui/textarea";

describe("Textarea", () => {
    it("should render textarea", () => {
        render(<Textarea placeholder="Enter text" />);
        const textarea = screen.getByPlaceholderText("Enter text");
        expect(textarea).toBeInTheDocument();
    });

    it("should handle value prop", () => {
        render(<Textarea value="test value" onChange={() => {}} />);
        const textarea = screen.getByDisplayValue("test value");
        expect(textarea).toBeInTheDocument();
    });

    it("should handle disabled state", () => {
        render(<Textarea disabled placeholder="Disabled textarea" />);
        const textarea = screen.getByPlaceholderText("Disabled textarea");
        expect(textarea).toBeDisabled();
    });

    it("should handle readonly state", () => {
        render(<Textarea readOnly value="readonly text" />);
        const textarea = screen.getByDisplayValue("readonly text");
        expect(textarea).toHaveAttribute("readonly");
    });

    it("should handle onChange events", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<Textarea onChange={onChange} placeholder="Type here" />);

        const textarea = screen.getByPlaceholderText("Type here");
        await user.type(textarea, "test");

        expect(onChange).toHaveBeenCalled();
    });

    it("should handle custom className", () => {
        render(<Textarea className="custom-textarea" placeholder="Custom textarea" />);
        const textarea = screen.getByPlaceholderText("Custom textarea");
        expect(textarea.className).toContain("custom-textarea");
    });

    it("should handle placeholder text", () => {
        render(<Textarea placeholder="Enter your message" />);
        const textarea = screen.getByPlaceholderText("Enter your message");
        expect(textarea).toBeInTheDocument();
    });

    it("should allow typing when not disabled", async () => {
        const user = userEvent.setup();
        render(<Textarea placeholder="Type here" />);

        const textarea = screen.getByPlaceholderText("Type here") as HTMLTextAreaElement;
        await user.type(textarea, "Hello World");

        expect(textarea.value).toBe("Hello World");
    });

    it("should not allow typing when disabled", async () => {
        const user = userEvent.setup();
        render(<Textarea disabled placeholder="Disabled" />);

        const textarea = screen.getByPlaceholderText("Disabled") as HTMLTextAreaElement;
        await user.type(textarea, "test");

        expect(textarea.value).toBe("");
    });

    it("should handle required attribute", () => {
        render(<Textarea required placeholder="Required textarea" />);
        const textarea = screen.getByPlaceholderText("Required textarea");
        expect(textarea).toBeRequired();
    });

    it("should handle maxLength attribute", () => {
        render(<Textarea maxLength={100} placeholder="Max 100 chars" />);
        const textarea = screen.getByPlaceholderText("Max 100 chars");
        expect(textarea).toHaveAttribute("maxLength", "100");
    });

    it("should handle rows attribute", () => {
        render(<Textarea rows={5} placeholder="5 rows" />);
        const textarea = screen.getByPlaceholderText("5 rows");
        expect(textarea).toHaveAttribute("rows", "5");
    });

    it("should support multiline text", async () => {
        const user = userEvent.setup();
        render(<Textarea placeholder="Multiline text" />);

        const textarea = screen.getByPlaceholderText("Multiline text") as HTMLTextAreaElement;
        await user.type(textarea, "Line 1{Enter}Line 2{Enter}Line 3");

        expect(textarea.value).toContain("Line 1");
        expect(textarea.value).toContain("Line 2");
        expect(textarea.value).toContain("Line 3");
    });

    it("should handle default value", () => {
        render(<Textarea defaultValue="Default text" />);
        const textarea = screen.getByDisplayValue("Default text");
        expect(textarea).toBeInTheDocument();
    });
});
