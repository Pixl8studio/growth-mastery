/**
 * FunnelFollowupView Component Tests
 * Tests followup prospects and stats display
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { FunnelFollowupView } from "@/components/funnel/funnel-followup-view";

// Mock dependencies
vi.mock("@/lib/supabase/client", () => ({
    createClient: () => ({
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({ data: [] })),
            })),
        })),
    }),
}));

vi.mock("@/lib/client-logger", () => ({
    logger: {
        error: vi.fn(),
    },
}));

vi.mock("@/components/followup/prospect-list", () => ({
    ProspectList: () => <div>Prospect List</div>,
}));

describe("FunnelFollowupView", () => {
    const defaultProps = {
        projectId: "test-project-123",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render loading state initially", () => {
        render(<FunnelFollowupView {...defaultProps} />);

        const loadingElements = document.querySelectorAll(".animate-pulse");
        expect(loadingElements.length).toBeGreaterThan(0);
    });

    it("should render stats cards", async () => {
        render(<FunnelFollowupView {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Total Prospects")).toBeInTheDocument();
            expect(screen.getByText("Total Touches")).toBeInTheDocument();
            expect(screen.getByText("Conversion Rate")).toBeInTheDocument();
            expect(screen.getByText("Revenue Generated")).toBeInTheDocument();
        });
    });

    it("should display prospect list", async () => {
        render(<FunnelFollowupView {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Prospect List")).toBeInTheDocument();
        });
    });

    it("should display prospects heading", async () => {
        render(<FunnelFollowupView {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Prospects")).toBeInTheDocument();
        });
    });
});
