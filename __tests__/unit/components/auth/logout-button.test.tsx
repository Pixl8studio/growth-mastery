/**
 * LogoutButton Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LogoutButton } from "@/components/auth/logout-button";

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: mockPush,
        refresh: mockRefresh,
    }),
}));

// Mock Supabase client
const mockSignOut = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
    createClient: () => ({
        auth: {
            signOut: mockSignOut,
        },
    }),
}));

describe("LogoutButton", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSignOut.mockResolvedValue({ error: null });
    });

    it("should render logout button", () => {
        render(<LogoutButton />);

        expect(screen.getByText("Sign out")).toBeInTheDocument();
    });

    it("should handle logout click", async () => {
        render(<LogoutButton />);

        const button = screen.getByRole("button");
        fireEvent.click(button);

        await waitFor(() => {
            expect(mockSignOut).toHaveBeenCalled();
        });
    });

    it("should redirect to login after logout", async () => {
        render(<LogoutButton />);

        const button = screen.getByRole("button");
        fireEvent.click(button);

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith("/login");
        });
    });

    it("should refresh router after logout", async () => {
        render(<LogoutButton />);

        const button = screen.getByRole("button");
        fireEvent.click(button);

        await waitFor(() => {
            expect(mockRefresh).toHaveBeenCalled();
        });
    });

    it("should show loading state during logout", async () => {
        let resolveSignOut: any;
        mockSignOut.mockImplementation(
            () => new Promise((resolve) => (resolveSignOut = resolve))
        );

        render(<LogoutButton />);

        const button = screen.getByRole("button");
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByText("Signing out...")).toBeInTheDocument();
        });

        resolveSignOut({ error: null });
    });

    it("should disable button during logout", async () => {
        let resolveSignOut: any;
        mockSignOut.mockImplementation(
            () => new Promise((resolve) => (resolveSignOut = resolve))
        );

        render(<LogoutButton />);

        const button = screen.getByRole("button");
        fireEvent.click(button);

        await waitFor(() => {
            expect(button).toBeDisabled();
        });

        resolveSignOut({ error: null });
    });

    it("should handle logout error", async () => {
        mockSignOut.mockRejectedValue(new Error("Logout failed"));

        render(<LogoutButton />);

        const button = screen.getByRole("button");
        fireEvent.click(button);

        await waitFor(() => {
            expect(button).not.toBeDisabled();
        });

        expect(mockPush).not.toHaveBeenCalled();
    });

    it("should render logout icon", () => {
        render(<LogoutButton />);

        const button = screen.getByRole("button");
        const svg = button.querySelector("svg");
        expect(svg).toBeInTheDocument();
    });
});
