/**
 * FunnelPagesView Component Tests
 * Tests pages display with edit and view functionality
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { FunnelPagesView } from "@/components/funnel/funnel-pages-view";

// Mock dependencies
vi.mock("@/lib/supabase/client", () => ({
    createClient: () => ({
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: [] })),
            })),
        })),
    }),
}));

vi.mock("@/lib/client-logger", () => ({
    logger: {
        error: vi.fn(),
    },
}));

describe("FunnelPagesView", () => {
    const defaultProps = {
        projectId: "test-project-123",
        username: "testuser",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render loading state initially", () => {
        render(<FunnelPagesView {...defaultProps} />);

        const loadingElements = document.querySelectorAll(".animate-pulse");
        expect(loadingElements.length).toBeGreaterThan(0);
    });

    it("should render empty state when no pages", async () => {
        render(<FunnelPagesView {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("No Pages Yet")).toBeInTheDocument();
            expect(
                screen.getByText(/Complete the funnel builder steps/i)
            ).toBeInTheDocument();
        });
    });
});
