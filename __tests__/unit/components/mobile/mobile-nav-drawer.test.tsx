/**
 * MobileNavDrawer Component Tests
 * Tests mobile navigation drawer functionality
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileNavDrawer } from "@/components/mobile/mobile-nav-drawer";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
    usePathname: () => "/funnel-builder",
}));

// Mock Next.js Link
vi.mock("next/link", () => ({
    default: ({ children, href, onClick, className }: any) => (
        <a href={href} onClick={onClick} className={className}>
            {children}
        </a>
    ),
}));

describe("MobileNavDrawer", () => {
    const mockOnClose = vi.fn();
    const defaultProps = {
        isOpen: true,
        onClose: mockOnClose,
        userEmail: "test@example.com",
    };

    beforeEach(() => {
        vi.clearAllMocks();
        document.body.style.overflow = "";
    });

    it("should not render when closed", () => {
        const { container } = render(<MobileNavDrawer {...defaultProps} isOpen={false} />);

        expect(container.firstChild).toBeNull();
    });

    it("should render when open", () => {
        render(<MobileNavDrawer {...defaultProps} />);

        expect(screen.getByText("Growth Mastery AI")).toBeInTheDocument();
    });

    it("should display user email", () => {
        render(<MobileNavDrawer {...defaultProps} />);

        expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    it("should display all navigation items", () => {
        render(<MobileNavDrawer {...defaultProps} />);

        expect(screen.getByText("Funnels")).toBeInTheDocument();
        expect(screen.getByText("Pages")).toBeInTheDocument();
        expect(screen.getByText("AI Followup")).toBeInTheDocument();
        expect(screen.getByText("Contacts")).toBeInTheDocument();
        expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("should highlight active navigation item", () => {
        render(<MobileNavDrawer {...defaultProps} />);

        const funnelsLink = screen.getByText("Funnels").closest("a");
        expect(funnelsLink).toHaveClass("bg-primary", "text-primary-foreground");
    });

    it("should render sign out button", () => {
        render(<MobileNavDrawer {...defaultProps} />);

        expect(screen.getByText("Sign Out")).toBeInTheDocument();
    });

    it("should call onClose when backdrop clicked", () => {
        const { container } = render(<MobileNavDrawer {...defaultProps} />);

        const backdrop = container.querySelector(".fixed.inset-0.bg-black\\/50");
        if (backdrop) {
            fireEvent.click(backdrop);
            expect(mockOnClose).toHaveBeenCalled();
        }
    });

    it("should call onClose when X button clicked", () => {
        render(<MobileNavDrawer {...defaultProps} />);

        const closeButtons = screen.getAllByRole("button");
        const closeButton = closeButtons[0]; // First button should be the X button
        fireEvent.click(closeButton);

        expect(mockOnClose).toHaveBeenCalled();
    });

    it("should call onClose when navigation link clicked", () => {
        render(<MobileNavDrawer {...defaultProps} />);

        const pagesLink = screen.getByText("Pages");
        fireEvent.click(pagesLink);

        expect(mockOnClose).toHaveBeenCalled();
    });

    it("should prevent body scroll when open", () => {
        render(<MobileNavDrawer {...defaultProps} />);

        expect(document.body.style.overflow).toBe("hidden");
    });

    it("should restore body scroll when closed", () => {
        const { rerender } = render(<MobileNavDrawer {...defaultProps} />);

        expect(document.body.style.overflow).toBe("hidden");

        rerender(<MobileNavDrawer {...defaultProps} isOpen={false} />);

        expect(document.body.style.overflow).toBe("");
    });

    it("should have correct navigation links", () => {
        render(<MobileNavDrawer {...defaultProps} />);

        const funnelsLink = screen.getByText("Funnels").closest("a");
        expect(funnelsLink).toHaveAttribute("href", "/funnel-builder");

        const pagesLink = screen.getByText("Pages").closest("a");
        expect(pagesLink).toHaveAttribute("href", "/pages");

        const followupLink = screen.getByText("AI Followup").closest("a");
        expect(followupLink).toHaveAttribute("href", "/ai-followup");

        const contactsLink = screen.getByText("Contacts").closest("a");
        expect(contactsLink).toHaveAttribute("href", "/contacts");

        const settingsLink = screen.getByText("Settings").closest("a");
        expect(settingsLink).toHaveAttribute("href", "/settings");
    });

    it("should have sign out form with correct action", () => {
        const { container } = render(<MobileNavDrawer {...defaultProps} />);

        const form = container.querySelector('form[action="/api/auth/signout"]');
        expect(form).toBeInTheDocument();
        expect(form).toHaveAttribute("method", "POST");
    });

    it("should render logo link", () => {
        render(<MobileNavDrawer {...defaultProps} />);

        const logoLink = screen.getByText("Growth Mastery AI").closest("a");
        expect(logoLink).toHaveAttribute("href", "/funnel-builder");
    });

    it("should call onClose when logo clicked", () => {
        render(<MobileNavDrawer {...defaultProps} />);

        const logoLink = screen.getByText("Growth Mastery AI");
        fireEvent.click(logoLink);

        expect(mockOnClose).toHaveBeenCalled();
    });

    it("should not display user email if not provided", () => {
        render(<MobileNavDrawer {...defaultProps} userEmail={undefined} />);

        expect(screen.queryByText("test@example.com")).not.toBeInTheDocument();
    });

    it("should have animation classes", () => {
        const { container } = render(<MobileNavDrawer {...defaultProps} />);

        const drawer = container.querySelector(".fixed.top-0.left-0");
        expect(drawer).toHaveClass("transition-transform", "duration-300");

        const backdrop = container.querySelector(".fixed.inset-0.bg-black\\/50");
        expect(backdrop).toHaveClass("transition-opacity", "duration-300");
    });
});
