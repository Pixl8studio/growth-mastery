/**
 * Footer Component Tests
 * Tests footer links and sections
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "@/components/layout/footer";

// Mock Next.js Link
vi.mock("next/link", () => ({
    default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

describe("Footer", () => {
    it("should render correctly", () => {
        render(<Footer />);

        expect(screen.getByText("Product")).toBeInTheDocument();
        expect(screen.getByText("Company")).toBeInTheDocument();
        expect(screen.getByText("Resources")).toBeInTheDocument();
        expect(screen.getByText("Legal")).toBeInTheDocument();
    });

    it("should display product links", () => {
        render(<Footer />);

        expect(screen.getByText("Funnel Builder")).toBeInTheDocument();
        expect(screen.getByText("Contacts")).toBeInTheDocument();
        expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    it("should display company links", () => {
        render(<Footer />);

        expect(screen.getByText("About")).toBeInTheDocument();
        expect(screen.getByText("Blog")).toBeInTheDocument();
        expect(screen.getByText("Contact")).toBeInTheDocument();
    });

    it("should display resources links", () => {
        render(<Footer />);

        expect(screen.getByText("Documentation")).toBeInTheDocument();
        expect(screen.getByText("Support")).toBeInTheDocument();
        expect(screen.getByText("API Reference")).toBeInTheDocument();
    });

    it("should display legal links", () => {
        render(<Footer />);

        expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
        expect(screen.getByText("Terms of Service")).toBeInTheDocument();
    });

    it("should display correct product link hrefs", () => {
        render(<Footer />);

        const funnelLink = screen.getByText("Funnel Builder").closest("a");
        expect(funnelLink).toHaveAttribute("href", "/funnel-builder");

        const contactsLink = screen.getByText("Contacts").closest("a");
        expect(contactsLink).toHaveAttribute("href", "/contacts");

        const dashboardLink = screen.getByText("Dashboard").closest("a");
        expect(dashboardLink).toHaveAttribute("href", "/dashboard");
    });

    it("should display correct legal link hrefs", () => {
        render(<Footer />);

        const privacyLink = screen.getByText("Privacy Policy").closest("a");
        expect(privacyLink).toHaveAttribute("href", "/privacy");

        const termsLink = screen.getByText("Terms of Service").closest("a");
        expect(termsLink).toHaveAttribute("href", "/terms");
    });

    it("should display copyright with current year", () => {
        render(<Footer />);

        const currentYear = new Date().getFullYear();
        expect(screen.getByText(new RegExp(`© ${currentYear} Growth Mastery AI`))).toBeInTheDocument();
    });

    it("should have correct footer structure", () => {
        const { container } = render(<Footer />);

        const footer = container.querySelector("footer");
        expect(footer).toBeInTheDocument();
        expect(footer).toHaveClass("border-t", "border-border", "bg-card");
    });

    it("should have grid layout for sections", () => {
        const { container } = render(<Footer />);

        const grid = container.querySelector(".grid.grid-cols-2");
        expect(grid).toBeInTheDocument();
    });

    it("should have all section headings", () => {
        render(<Footer />);

        const headings = screen.getAllByRole("heading", { level: 3 });
        expect(headings.length).toBe(4);
        expect(headings.map((h) => h.textContent)).toEqual([
            "Product",
            "Company",
            "Resources",
            "Legal",
        ]);
    });
});
