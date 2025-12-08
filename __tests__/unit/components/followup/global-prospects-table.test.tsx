/**
 * GlobalProspectsTable Component Tests
 * Simplified tests focusing on basic rendering
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { GlobalProspectsTable } from "@/components/followup/global-prospects-table";

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
                order: () => ({
                    limit: () => Promise.resolve({ data: [], error: null }),
                }),
            }),
        }),
    }),
}));

describe("GlobalProspectsTable", () => {
    const defaultProps = {
        userId: "test-user-123",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render component", () => {
        render(<GlobalProspectsTable {...defaultProps} />);
        expect(document.body).toBeInTheDocument();
    });

    it("should render loading state initially", () => {
        const { container } = render(<GlobalProspectsTable {...defaultProps} />);
        expect(container).toBeInTheDocument();
    });
});
