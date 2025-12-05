/**
 * MobileHeader Component Tests
 * Tests mobile header functionality and navigation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileHeader } from "@/components/layout/mobile-header";
import type { User } from "@supabase/supabase-js";

// Mock Next.js Link
vi.mock("next/link", () => ({
    default: ({ children, href, ...props }: any) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

// Mock MobileNavDrawer
vi.mock("@/components/mobile/mobile-nav-drawer", () => ({
    MobileNavDrawer: ({ isOpen, onClose, userEmail }: any) =>
        isOpen ? (
            <div data-testid="mobile-nav-drawer">
                <div>Mobile Nav Drawer</div>
                <div>{userEmail}</div>
                <button onClick={onClose}>Close Drawer</button>
            </div>
        ) : null,
}));

describe("MobileHeader", () => {
    const mockUser: User = {
        id: "test-user-123",
        email: "test@example.com",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render header with logo", () => {
        render(<MobileHeader user={null} />);

        expect(screen.getByText("Growth Mastery AI")).toBeInTheDocument();
    });

    it("should show login button when user not logged in", () => {
        render(<MobileHeader user={null} />);

        expect(screen.getByText("Login")).toBeInTheDocument();
    });

    it("should show hamburger menu when user is logged in", () => {
        render(<MobileHeader user={mockUser} />);

        expect(screen.getByLabelText("Open menu")).toBeInTheDocument();
    });

    it("should not show hamburger menu when user not logged in", () => {
        render(<MobileHeader user={null} />);

        expect(screen.queryByLabelText("Open menu")).not.toBeInTheDocument();
    });

    it("should link to homepage when not logged in", () => {
        render(<MobileHeader user={null} />);

        const logo = screen.getByText("Growth Mastery AI").closest("a");
        expect(logo).toHaveAttribute("href", "/");
    });

    it("should link to funnel builder when logged in", () => {
        render(<MobileHeader user={mockUser} />);

        const logo = screen.getByText("Growth Mastery AI").closest("a");
        expect(logo).toHaveAttribute("href", "/funnel-builder");
    });

    it("should open navigation drawer when hamburger clicked", () => {
        render(<MobileHeader user={mockUser} />);

        const menuButton = screen.getByLabelText("Open menu");
        fireEvent.click(menuButton);

        expect(screen.getByTestId("mobile-nav-drawer")).toBeInTheDocument();
        expect(screen.getByText("Mobile Nav Drawer")).toBeInTheDocument();
    });

    it("should close navigation drawer", () => {
        render(<MobileHeader user={mockUser} />);

        const menuButton = screen.getByLabelText("Open menu");
        fireEvent.click(menuButton);

        expect(screen.getByTestId("mobile-nav-drawer")).toBeInTheDocument();

        const closeButton = screen.getByText("Close Drawer");
        fireEvent.click(closeButton);

        expect(screen.queryByTestId("mobile-nav-drawer")).not.toBeInTheDocument();
    });

    it("should pass user email to drawer", () => {
        render(<MobileHeader user={mockUser} />);

        const menuButton = screen.getByLabelText("Open menu");
        fireEvent.click(menuButton);

        expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    it("should have sticky header styling", () => {
        const { container } = render(<MobileHeader user={null} />);

        const header = container.querySelector("header");
        expect(header).toHaveClass("sticky", "top-0", "z-50");
    });

    it("should not render drawer when user not logged in", () => {
        render(<MobileHeader user={null} />);

        expect(screen.queryByTestId("mobile-nav-drawer")).not.toBeInTheDocument();
    });

    it("should have login link with correct href", () => {
        render(<MobileHeader user={null} />);

        const loginLink = screen.getByText("Login").closest("a");
        expect(loginLink).toHaveAttribute("href", "/login");
    });
});
