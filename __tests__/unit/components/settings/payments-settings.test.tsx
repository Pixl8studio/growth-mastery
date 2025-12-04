/**
 * PaymentsSettings Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PaymentsSettings } from "@/components/settings/payments-settings";

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock Supabase client
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
    createClient: () => ({
        auth: {
            getUser: mockGetUser,
        },
        from: mockFrom,
    }),
}));

// Mock window.confirm
global.confirm = vi.fn(() => true);

// Mock window.location
delete (window as any).location;
window.location = { href: "" } as any;

describe("PaymentsSettings", () => {
    const mockUser = {
        id: "user-123",
        email: "test@example.com",
    };

    const mockProfile = {
        id: "user-123",
        stripe_account_id: null,
        stripe_account_type: null,
        stripe_charges_enabled: false,
        stripe_payouts_enabled: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();

        mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
        mockSingle.mockResolvedValue({ data: mockProfile, error: null });
        mockEq.mockReturnValue({ single: mockSingle });
        mockSelect.mockReturnValue({ eq: mockEq });
        mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate });
        mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    });

    it("should render loading state initially", () => {
        render(<PaymentsSettings />);

        expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("should render payment settings title", async () => {
        render(<PaymentsSettings />);

        await waitFor(() => {
            expect(screen.getByText("Payment Settings")).toBeInTheDocument();
        });
    });

    it("should display Stripe Connect section", async () => {
        render(<PaymentsSettings />);

        await waitFor(() => {
            expect(screen.getByText("Stripe Connect")).toBeInTheDocument();
        });
    });

    it("should show Connect Stripe button when not connected", async () => {
        render(<PaymentsSettings />);

        await waitFor(() => {
            expect(screen.getByText("Connect Stripe")).toBeInTheDocument();
        });
    });

    it("should show benefits when not connected", async () => {
        render(<PaymentsSettings />);

        await waitFor(() => {
            expect(screen.getByText("Why connect Stripe?")).toBeInTheDocument();
        });

        expect(
            screen.getByText(/Accept payments directly through your funnel pages/)
        ).toBeInTheDocument();
    });

    it("should handle connect Stripe button click", async () => {
        render(<PaymentsSettings />);

        await waitFor(() => {
            expect(screen.getByText("Connect Stripe")).toBeInTheDocument();
        });

        const connectButton = screen.getByText("Connect Stripe");
        fireEvent.click(connectButton);

        expect(window.location.href).toBe("/api/stripe/connect");
    });

    it("should show connected state with account ID", async () => {
        const connectedProfile = {
            ...mockProfile,
            stripe_account_id: "acct_123456",
            stripe_charges_enabled: true,
            stripe_payouts_enabled: true,
        };

        mockSingle.mockResolvedValue({ data: connectedProfile, error: null });

        render(<PaymentsSettings />);

        await waitFor(() => {
            expect(
                screen.getByText("Your Stripe account is connected")
            ).toBeInTheDocument();
        });

        expect(screen.getByText(/Account ID: acct_123456/)).toBeInTheDocument();
    });

    it("should display charges enabled status", async () => {
        const connectedProfile = {
            ...mockProfile,
            stripe_account_id: "acct_123456",
            stripe_charges_enabled: true,
            stripe_payouts_enabled: false,
        };

        mockSingle.mockResolvedValue({ data: connectedProfile, error: null });

        render(<PaymentsSettings />);

        await waitFor(() => {
            expect(screen.getByText("Charges enabled")).toBeInTheDocument();
        });
    });

    it("should display payouts enabled status", async () => {
        const connectedProfile = {
            ...mockProfile,
            stripe_account_id: "acct_123456",
            stripe_charges_enabled: true,
            stripe_payouts_enabled: true,
        };

        mockSingle.mockResolvedValue({ data: connectedProfile, error: null });

        render(<PaymentsSettings />);

        await waitFor(() => {
            expect(screen.getByText("Payouts enabled")).toBeInTheDocument();
        });
    });

    it("should show Disconnect button when connected", async () => {
        const connectedProfile = {
            ...mockProfile,
            stripe_account_id: "acct_123456",
        };

        mockSingle.mockResolvedValue({ data: connectedProfile, error: null });

        render(<PaymentsSettings />);

        await waitFor(() => {
            expect(screen.getByText("Disconnect")).toBeInTheDocument();
        });
    });

    it("should handle disconnect button click", async () => {
        const connectedProfile = {
            ...mockProfile,
            stripe_account_id: "acct_123456",
        };

        mockSingle.mockResolvedValue({ data: connectedProfile, error: null });

        render(<PaymentsSettings />);

        await waitFor(() => {
            expect(screen.getByText("Disconnect")).toBeInTheDocument();
        });

        const disconnectButton = screen.getByText("Disconnect");
        fireEvent.click(disconnectButton);

        expect(global.confirm).toHaveBeenCalled();

        await waitFor(() => {
            expect(mockUpdate).toHaveBeenCalledWith({
                stripe_account_id: null,
                stripe_account_type: null,
                stripe_charges_enabled: false,
                stripe_payouts_enabled: false,
            });
        });
    });

    it("should show warning when charges not enabled", async () => {
        const connectedProfile = {
            ...mockProfile,
            stripe_account_id: "acct_123456",
            stripe_charges_enabled: false,
        };

        mockSingle.mockResolvedValue({ data: connectedProfile, error: null });

        render(<PaymentsSettings />);

        await waitFor(() => {
            expect(screen.getByText("Complete Your Stripe Setup")).toBeInTheDocument();
        });

        expect(screen.getByText(/charges are not yet enabled/)).toBeInTheDocument();
    });

    it("should show link to Stripe dashboard", async () => {
        const connectedProfile = {
            ...mockProfile,
            stripe_account_id: "acct_123456",
            stripe_charges_enabled: false,
        };

        mockSingle.mockResolvedValue({ data: connectedProfile, error: null });

        render(<PaymentsSettings />);

        await waitFor(() => {
            const link = screen.getByText("Go to Stripe Dashboard").closest("a");
            expect(link).toHaveAttribute("href", "https://dashboard.stripe.com");
            expect(link).toHaveAttribute("target", "_blank");
        });
    });

    it("should not show charges warning when enabled", async () => {
        const connectedProfile = {
            ...mockProfile,
            stripe_account_id: "acct_123456",
            stripe_charges_enabled: true,
            stripe_payouts_enabled: true,
        };

        mockSingle.mockResolvedValue({ data: connectedProfile, error: null });

        render(<PaymentsSettings />);

        await waitFor(() => {
            expect(
                screen.queryByText("Complete Your Stripe Setup")
            ).not.toBeInTheDocument();
        });
    });

    it("should show charges not enabled status", async () => {
        const connectedProfile = {
            ...mockProfile,
            stripe_account_id: "acct_123456",
            stripe_charges_enabled: false,
        };

        mockSingle.mockResolvedValue({ data: connectedProfile, error: null });

        render(<PaymentsSettings />);

        await waitFor(() => {
            expect(screen.getByText("Charges not yet enabled")).toBeInTheDocument();
        });
    });

    it("should show payouts not enabled status", async () => {
        const connectedProfile = {
            ...mockProfile,
            stripe_account_id: "acct_123456",
            stripe_charges_enabled: true,
            stripe_payouts_enabled: false,
        };

        mockSingle.mockResolvedValue({ data: connectedProfile, error: null });

        render(<PaymentsSettings />);

        await waitFor(() => {
            expect(screen.getByText("Payouts not yet enabled")).toBeInTheDocument();
        });
    });

    it("should cancel disconnect on confirmation decline", async () => {
        global.confirm = vi.fn(() => false);

        const connectedProfile = {
            ...mockProfile,
            stripe_account_id: "acct_123456",
        };

        mockSingle.mockResolvedValue({ data: connectedProfile, error: null });

        render(<PaymentsSettings />);

        await waitFor(() => {
            expect(screen.getByText("Disconnect")).toBeInTheDocument();
        });

        const disconnectButton = screen.getByText("Disconnect");
        fireEvent.click(disconnectButton);

        expect(mockUpdate).not.toHaveBeenCalled();
    });
});
