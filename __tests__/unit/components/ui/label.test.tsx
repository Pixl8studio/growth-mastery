/**
 * Label Component Tests
 * Test label functionality
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Label } from "@/components/ui/label";

describe("Label", () => {
    it("should render label with text", () => {
        render(<Label>Username</Label>);
        expect(screen.getByText("Username")).toBeInTheDocument();
    });

    it("should render label with htmlFor attribute", () => {
        render(<Label htmlFor="email">Email Address</Label>);
        const label = screen.getByText("Email Address");
        expect(label).toHaveAttribute("for", "email");
    });

    it("should handle custom className", () => {
        render(<Label className="custom-label">Custom Label</Label>);
        const label = screen.getByText("Custom Label");
        expect(label.className).toContain("custom-label");
    });

    it("should associate with input via htmlFor", () => {
        render(
            <div>
                <Label htmlFor="test-input">Test Label</Label>
                <input id="test-input" />
            </div>
        );
        const label = screen.getByText("Test Label");
        const input = document.getElementById("test-input");
        expect(label).toHaveAttribute("for", "test-input");
        expect(input).toBeInTheDocument();
    });

    it("should render with children elements", () => {
        render(
            <Label>
                Email <span className="required">*</span>
            </Label>
        );
        expect(screen.getByText("Email")).toBeInTheDocument();
        expect(screen.getByText("*")).toBeInTheDocument();
    });

    it("should handle peer-disabled styling context", () => {
        render(
            <div>
                <input id="disabled-input" disabled className="peer" />
                <Label htmlFor="disabled-input">Disabled Input Label</Label>
            </div>
        );
        const label = screen.getByText("Disabled Input Label");
        expect(label).toBeInTheDocument();
    });
});
