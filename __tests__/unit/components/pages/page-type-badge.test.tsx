/**
 * PageTypeBadge Component Tests
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageTypeBadge } from "@/components/pages/page-type-badge";

describe("PageTypeBadge", () => {
    it("should render enrollment badge", () => {
        render(<PageTypeBadge type="enrollment" />);

        const badge = screen.getByText("Enrollment");
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass("bg-primary/10", "text-primary");
    });

    it("should render watch badge", () => {
        render(<PageTypeBadge type="watch" />);

        const badge = screen.getByText("Watch");
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass("bg-purple-100", "text-purple-800");
    });

    it("should render registration badge", () => {
        render(<PageTypeBadge type="registration" />);

        const badge = screen.getByText("Registration");
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass("bg-green-100", "text-green-800");
    });

    it("should have correct base classes", () => {
        render(<PageTypeBadge type="enrollment" />);

        const badge = screen.getByText("Enrollment");
        expect(badge).toHaveClass("inline-flex", "items-center", "rounded-full", "text-xs", "font-medium");
    });

    it("should be a span element", () => {
        const { container } = render(<PageTypeBadge type="enrollment" />);

        const badge = container.querySelector("span");
        expect(badge).toBeInTheDocument();
    });
});
