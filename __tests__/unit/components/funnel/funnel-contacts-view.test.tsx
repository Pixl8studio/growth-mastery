/**
 * FunnelContactsView Component Tests
 * Tests contacts display with filtering and stats
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { FunnelContactsView } from "@/components/funnel/funnel-contacts-view";

// Mock dependencies
vi.mock("@/lib/supabase/client", () => ({
    createClient: () => ({
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    order: vi.fn(() => ({
                        limit: vi.fn(() => ({ data: [] })),
                    })),
                    eq: vi.fn(() => ({ data: [] })),
                })),
            })),
        })),
    }),
}));

vi.mock("@/lib/client-logger", () => ({
    logger: {
        error: vi.fn(),
    },
}));

vi.mock("@/components/contacts/contacts-stats", () => ({
    ContactsStats: ({ stats }: any) => (
        <div data-testid="contacts-stats">Total: {stats.total}</div>
    ),
}));

describe("FunnelContactsView", () => {
    const defaultProps = {
        projectId: "test-project-123",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render loading state initially", () => {
        render(<FunnelContactsView {...defaultProps} />);

        const loadingElements = document.querySelectorAll(".animate-pulse");
        expect(loadingElements.length).toBeGreaterThan(0);
    });

    it("should render contacts stats", async () => {
        render(<FunnelContactsView {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByTestId("contacts-stats")).toBeInTheDocument();
        });
    });

    it("should render stage filter buttons", async () => {
        render(<FunnelContactsView {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /All/i })).toBeInTheDocument();
            expect(
                screen.getByRole("button", { name: /Registered/i })
            ).toBeInTheDocument();
            expect(
                screen.getByRole("button", { name: /Watched/i })
            ).toBeInTheDocument();
            expect(
                screen.getByRole("button", { name: /Enrolled/i })
            ).toBeInTheDocument();
            expect(
                screen.getByRole("button", { name: /Purchased/i })
            ).toBeInTheDocument();
        });
    });

    it("should render contacts table headers", async () => {
        render(<FunnelContactsView {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Contact")).toBeInTheDocument();
            expect(screen.getByText("Stage")).toBeInTheDocument();
            expect(screen.getByText("Watch %")).toBeInTheDocument();
            expect(screen.getByText("Registered")).toBeInTheDocument();
        });
    });

    it("should render empty state when no contacts", async () => {
        render(<FunnelContactsView {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("No contacts found")).toBeInTheDocument();
        });
    });

    it("should toggle stage filter", async () => {
        render(<FunnelContactsView {...defaultProps} />);

        await waitFor(() => {
            const registeredButton = screen.getByRole("button", {
                name: /Registered/i,
            });
            fireEvent.click(registeredButton);
            expect(registeredButton).toHaveClass("bg-primary");
        });
    });
});
