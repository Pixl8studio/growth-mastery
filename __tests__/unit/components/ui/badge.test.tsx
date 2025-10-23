/**
 * Badge Component Tests
 * Test badge variants
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";

describe("Badge", () => {
    it("should render with default variant", () => {
        render(<Badge>Default</Badge>);
        expect(screen.getByText("Default")).toBeInTheDocument();
    });

    it("should render different variants", () => {
        const { rerender } = render(<Badge variant="success">Success</Badge>);
        expect(screen.getByText("Success")).toBeInTheDocument();

        rerender(<Badge variant="destructive">Error</Badge>);
        expect(screen.getByText("Error")).toBeInTheDocument();

        rerender(<Badge variant="warning">Warning</Badge>);
        expect(screen.getByText("Warning")).toBeInTheDocument();
    });

    it("should handle custom className", () => {
        render(<Badge className="custom-badge">Custom</Badge>);
        const badge = screen.getByText("Custom");
        expect(badge.className).toContain("custom-badge");
    });
});
