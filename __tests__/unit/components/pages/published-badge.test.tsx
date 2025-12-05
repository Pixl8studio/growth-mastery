/**
 * PublishedBadge Component Tests
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PublishedBadge } from "@/components/pages/published-badge";

describe("PublishedBadge", () => {
    it("should render Published badge when isPublished is true", () => {
        render(<PublishedBadge isPublished={true} />);

        const badge = screen.getByText("Published");
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass("bg-green-100", "text-green-800");
    });

    it("should render Draft badge when isPublished is false", () => {
        render(<PublishedBadge isPublished={false} />);

        const badge = screen.getByText("Draft");
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass("bg-muted", "text-foreground");
    });

    it("should show check icon when published", () => {
        const { container } = render(<PublishedBadge isPublished={true} />);

        const icon = container.querySelector("svg");
        expect(icon).toBeInTheDocument();
    });

    it("should not show check icon when draft", () => {
        const { container } = render(<PublishedBadge isPublished={false} />);

        const icon = container.querySelector("svg");
        expect(icon).not.toBeInTheDocument();
    });

    it("should have correct base classes for published state", () => {
        render(<PublishedBadge isPublished={true} />);

        const badge = screen.getByText("Published");
        expect(badge).toHaveClass(
            "inline-flex",
            "items-center",
            "gap-1",
            "rounded-full",
            "px-2.5",
            "py-0.5",
            "text-xs",
            "font-medium"
        );
    });

    it("should have correct base classes for draft state", () => {
        render(<PublishedBadge isPublished={false} />);

        const badge = screen.getByText("Draft");
        expect(badge).toHaveClass(
            "inline-flex",
            "items-center",
            "rounded-full",
            "px-2.5",
            "py-0.5",
            "text-xs",
            "font-medium"
        );
    });
});
