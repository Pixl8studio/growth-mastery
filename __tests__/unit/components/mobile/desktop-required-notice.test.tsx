/**
 * DesktopRequiredNotice Component Tests
 * Tests desktop-required notice display and actions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DesktopRequiredNotice } from "@/components/mobile/desktop-required-notice";

// Mock Next.js Link
vi.mock("next/link", () => ({
    default: ({ children, href, className }: any) => (
        <a href={href} className={className}>
            {children}
        </a>
    ),
}));

describe("DesktopRequiredNotice", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock window.location
        Object.defineProperty(window, "location", {
            value: {
                href: "https://example.com/test-page",
            },
            writable: true,
        });
    });

    it("should render with feature name", () => {
        render(<DesktopRequiredNotice featureName="Funnel Editor" />);

        expect(screen.getByText("Desktop Required")).toBeInTheDocument();
        expect(screen.getByText("Funnel Editor")).toBeInTheDocument();
    });

    it("should display default description", () => {
        render(<DesktopRequiredNotice featureName="Test Feature" />);

        expect(screen.getByText("This feature requires a larger screen for the best experience.")).toBeInTheDocument();
    });

    it("should display custom description", () => {
        render(
            <DesktopRequiredNotice
                featureName="Test Feature"
                description="Custom description text"
            />
        );

        expect(screen.getByText("Custom description text")).toBeInTheDocument();
    });

    it("should display why desktop section", () => {
        render(<DesktopRequiredNotice featureName="Test Feature" />);

        expect(screen.getByText("Why Desktop?")).toBeInTheDocument();
        expect(screen.getByText("Complex editors need more screen space")).toBeInTheDocument();
        expect(screen.getByText("Drag-and-drop features work better with a mouse")).toBeInTheDocument();
        expect(screen.getByText("Multiple panels and tools are easier to navigate")).toBeInTheDocument();
    });

    it("should display what you can do on mobile section", () => {
        render(<DesktopRequiredNotice featureName="Test Feature" />);

        expect(screen.getByText("What You CAN Do on Mobile:")).toBeInTheDocument();
        expect(screen.getByText("View your funnels and projects")).toBeInTheDocument();
        expect(screen.getByText("Create new funnels")).toBeInTheDocument();
        expect(screen.getByText("Manage contacts")).toBeInTheDocument();
        expect(screen.getByText("View analytics and settings")).toBeInTheDocument();
    });

    it("should render email button", () => {
        render(<DesktopRequiredNotice featureName="Test Feature" />);

        expect(screen.getByText("Email This Link to Myself")).toBeInTheDocument();
    });

    it("should render back button with default path", () => {
        render(<DesktopRequiredNotice featureName="Test Feature" />);

        const backButton = screen.getByText("Back to Dashboard").closest("a");
        expect(backButton).toHaveAttribute("href", "/funnel-builder");
    });

    it("should render back button with custom return path", () => {
        render(
            <DesktopRequiredNotice
                featureName="Test Feature"
                returnPath="/custom-path"
            />
        );

        const backButton = screen.getByText("Back to Dashboard").closest("a");
        expect(backButton).toHaveAttribute("href", "/custom-path");
    });

    it("should handle email self click", async () => {
        const originalHref = window.location.href;

        render(<DesktopRequiredNotice featureName="Funnel Editor" />);

        const emailButton = screen.getByText("Email This Link to Myself");
        fireEvent.click(emailButton);

        await waitFor(() => {
            expect(window.location.href).toContain("mailto:");
            expect(window.location.href).toContain("Funnel Editor");
        });

        // Restore original href
        window.location.href = originalHref;
    });

    it("should display helpful tip", () => {
        render(<DesktopRequiredNotice featureName="Test Feature" />);

        expect(screen.getByText(/Tip: Bookmark this page on your desktop/i)).toBeInTheDocument();
    });

    it("should have correct card structure", () => {
        const { container } = render(<DesktopRequiredNotice featureName="Test Feature" />);

        expect(container.querySelector(".min-h-screen")).toBeInTheDocument();
        expect(container.querySelector(".shadow-float")).toBeInTheDocument();
    });

    it("should render monitor icon", () => {
        const { container } = render(<DesktopRequiredNotice featureName="Test Feature" />);

        // Check for the icon wrapper with correct styling
        const iconWrapper = container.querySelector(".rounded-full.bg-primary\\/10");
        expect(iconWrapper).toBeInTheDocument();
    });

    it("should have both action buttons", () => {
        render(<DesktopRequiredNotice featureName="Test Feature" />);

        const buttons = screen.getAllByRole("button");
        expect(buttons.length).toBeGreaterThanOrEqual(1);

        const links = screen.getAllByRole("link");
        expect(links.length).toBeGreaterThanOrEqual(1);
    });
});
