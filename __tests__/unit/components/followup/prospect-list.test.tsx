/**
 * ProspectList Component Tests
 * Simplified tests focusing on basic rendering
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProspectList } from "@/components/followup/prospect-list";

// Mock dependencies
vi.mock("@/components/ui/use-toast", () => ({
    useToast: () => ({
        toast: vi.fn(),
    }),
}));

vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock("@/lib/supabase/client", () => ({
    createClient: () => ({
        from: () => ({
            select: () => ({
                eq: () => ({
                    order: () => Promise.resolve({ data: [], error: null }),
                }),
            }),
        }),
    }),
}));

describe("ProspectList", () => {
    const defaultProps = {
        funnelProjectId: "test-funnel-123",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render loading state initially", () => {
        render(<ProspectList {...defaultProps} />);
        expect(screen.getByText("Loading prospects...")).toBeInTheDocument();
    });

    it("should accept required props", () => {
        const { container } = render(<ProspectList {...defaultProps} />);
        expect(container).toBeInTheDocument();
    });
});
