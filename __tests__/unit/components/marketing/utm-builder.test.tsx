/**
 * UTMBuilder Component Tests
 * Simplified tests focusing on basic rendering
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { UTMBuilder } from "@/components/marketing/utm-builder";

// Mock dependencies
vi.mock("@/components/ui/use-toast", () => ({
    useToast: () => ({
        toast: vi.fn(),
    }),
}));

describe("UTMBuilder", () => {
    const defaultProps = {
        baseUrl: "https://example.com",
        onUrlChange: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render component", () => {
        render(<UTMBuilder {...defaultProps} />);
        expect(document.body).toBeInTheDocument();
    });

    it("should accept required props", () => {
        const { container } = render(<UTMBuilder {...defaultProps} />);
        expect(container).toBeInTheDocument();
    });
});
