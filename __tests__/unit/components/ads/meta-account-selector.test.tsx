/**
 * MetaAccountSelector Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MetaAccountSelector } from "@/components/ads/meta-account-selector";

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock fetch
global.fetch = vi.fn();

describe("MetaAccountSelector", () => {
    const mockOnSelectAccount = vi.fn();

    const mockProps = {
        projectId: "project-123",
        onSelectAccount: mockOnSelectAccount,
        selectedAccount: null,
    };

    const mockAccounts = [
        {
            id: "acc-1",
            meta_ad_account_id: "act_123",
            account_name: "My Business Account",
            currency: "USD",
            timezone: "America/New_York",
            is_active: true,
            account_status: "ACTIVE",
        },
        {
            id: "acc-2",
            meta_ad_account_id: "act_456",
            account_name: "Secondary Account",
            currency: "USD",
            timezone: "America/Los_Angeles",
            is_active: true,
            account_status: "ACTIVE",
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ accounts: mockAccounts }),
        });
    });

    it("should render loading state initially", () => {
        render(<MetaAccountSelector {...mockProps} />);

        expect(screen.getByText("Loading ad accounts...")).toBeInTheDocument();
    });

    it("should render account selector after loading", async () => {
        render(<MetaAccountSelector {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Select Meta Ad Account")).toBeInTheDocument();
        });
    });

    it("should display ad accounts", async () => {
        render(<MetaAccountSelector {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("My Business Account")).toBeInTheDocument();
        });

        expect(screen.getByText("Secondary Account")).toBeInTheDocument();
    });

    it("should display account details", async () => {
        render(<MetaAccountSelector {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText(/ID: act_123/)).toBeInTheDocument();
        });

        expect(screen.getByText(/USD/)).toBeInTheDocument();
        expect(screen.getByText(/America\/New_York/)).toBeInTheDocument();
    });

    it("should handle account selection", async () => {
        render(<MetaAccountSelector {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("My Business Account")).toBeInTheDocument();
        });

        const accountCard = screen.getByText("My Business Account").closest("div");
        if (accountCard) {
            fireEvent.click(accountCard);
        }

        expect(mockOnSelectAccount).toHaveBeenCalledWith("act_123");
    });

    it("should auto-select first account when only one exists", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ accounts: [mockAccounts[0]] }),
        });

        render(<MetaAccountSelector {...mockProps} />);

        await waitFor(() => {
            expect(mockOnSelectAccount).toHaveBeenCalledWith("act_123");
        });
    });

    it("should show selected account styling", async () => {
        const propsWithSelected = {
            ...mockProps,
            selectedAccount: "act_123",
        };

        render(<MetaAccountSelector {...propsWithSelected} />);

        await waitFor(() => {
            const radio = screen.getByRole("radio", {
                name: /My Business Account/i,
            });
            expect(radio).toBeChecked();
        });
    });

    it("should display active indicator", async () => {
        render(<MetaAccountSelector {...mockProps} />);

        await waitFor(() => {
            // Check for active indicators (checkmarks)
            const activeIndicators = screen.getAllByRole("img", { hidden: true });
            expect(activeIndicators.length).toBeGreaterThan(0);
        });
    });

    it("should show no accounts message when empty", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ accounts: [] }),
        });

        render(<MetaAccountSelector {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText(/No ad accounts found/)).toBeInTheDocument();
        });
    });

    it("should handle fetch error", async () => {
        (global.fetch as any).mockRejectedValue(new Error("Network error"));

        render(<MetaAccountSelector {...mockProps} />);

        await waitFor(() => {
            expect(
                screen.getByText("Failed to load ad accounts. Please try again.")
            ).toBeInTheDocument();
        });
    });

    it("should handle non-ok response", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: false,
            json: async () => ({ error: "Unauthorized" }),
        });

        render(<MetaAccountSelector {...mockProps} />);

        await waitFor(() => {
            expect(
                screen.getByText("Failed to load ad accounts. Please try again.")
            ).toBeInTheDocument();
        });
    });

    it("should display account status", async () => {
        render(<MetaAccountSelector {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText(/Status: ACTIVE/)).toBeInTheDocument();
        });
    });
});
