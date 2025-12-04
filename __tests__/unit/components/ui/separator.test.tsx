/**
 * Separator Component Tests
 * Test separator (divider) functionality
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Separator } from "@/components/ui/separator";

describe("Separator", () => {
    it("should render separator with default horizontal orientation", () => {
        render(<Separator data-testid="separator" />);
        const separator = screen.getByTestId("separator");
        expect(separator).toBeInTheDocument();
        expect(separator).toHaveAttribute("data-orientation", "horizontal");
    });

    it("should render horizontal separator", () => {
        render(<Separator orientation="horizontal" data-testid="h-separator" />);
        const separator = screen.getByTestId("h-separator");
        expect(separator).toHaveAttribute("data-orientation", "horizontal");
    });

    it("should render vertical separator", () => {
        render(<Separator orientation="vertical" data-testid="v-separator" />);
        const separator = screen.getByTestId("v-separator");
        expect(separator).toHaveAttribute("data-orientation", "vertical");
    });

    it("should handle decorative prop", () => {
        render(<Separator decorative data-testid="decorative" />);
        const separator = screen.getByTestId("decorative");
        expect(separator).toHaveAttribute("role", "none");
    });

    it("should handle non-decorative (semantic) separator", () => {
        render(<Separator decorative={false} data-testid="semantic" />);
        const separator = screen.getByTestId("semantic");
        expect(separator).toHaveAttribute("role", "separator");
    });

    it("should handle custom className", () => {
        render(<Separator className="custom-separator" data-testid="custom" />);
        const separator = screen.getByTestId("custom");
        expect(separator.className).toContain("custom-separator");
    });

    it("should render in a layout with content", () => {
        render(
            <div>
                <div>Content above</div>
                <Separator data-testid="layout-separator" />
                <div>Content below</div>
            </div>
        );
        expect(screen.getByText("Content above")).toBeInTheDocument();
        expect(screen.getByTestId("layout-separator")).toBeInTheDocument();
        expect(screen.getByText("Content below")).toBeInTheDocument();
    });
});
