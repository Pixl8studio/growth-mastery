/**
 * ProjectCard Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ProjectCard } from "@/components/funnel-builder/project-card";

// Mock next/link
vi.mock("next/link", () => ({
    default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock utils
vi.mock("@/lib/utils", () => ({
    formatDate: (date: string) => new Date(date).toLocaleDateString(),
}));

// Mock completion utils
const mockGetStepCompletionStatus = vi.fn();
const mockCalculateCompletionPercentage = vi.fn();

vi.mock("@/app/funnel-builder/completion-utils", () => ({
    getStepCompletionStatus: (...args: any[]) => mockGetStepCompletionStatus(...args),
}));

vi.mock("@/app/funnel-builder/completion-types", () => ({
    calculateCompletionPercentage: (...args: any[]) =>
        mockCalculateCompletionPercentage(...args),
}));

describe("ProjectCard", () => {
    const mockProject = {
        id: "project-123",
        name: "My Webinar Funnel",
        status: "active",
        current_step: 5,
        updated_at: "2024-01-01T00:00:00Z",
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Default mocks
        mockGetStepCompletionStatus.mockResolvedValue({
            completedSteps: [1, 2, 3],
            totalSteps: 15,
        });
        mockCalculateCompletionPercentage.mockReturnValue(20);
    });

    it("should render project name", () => {
        render(<ProjectCard project={mockProject} />);

        expect(screen.getByText("My Webinar Funnel")).toBeInTheDocument();
    });

    it("should render status badge", () => {
        render(<ProjectCard project={mockProject} />);

        expect(screen.getByText("active")).toBeInTheDocument();
    });

    it("should display completion percentage after loading", async () => {
        render(<ProjectCard project={mockProject} />);

        await waitFor(() => {
            expect(screen.getByText("20%")).toBeInTheDocument();
        });
    });

    it("should show loading state for completion", () => {
        render(<ProjectCard project={mockProject} />);

        expect(screen.getByText("...")).toBeInTheDocument();
    });

    it("should display last updated date", () => {
        render(<ProjectCard project={mockProject} />);

        expect(screen.getByText(/Last updated/)).toBeInTheDocument();
    });

    it("should render Continue button", () => {
        render(<ProjectCard project={mockProject} />);

        expect(screen.getByText("Continue")).toBeInTheDocument();
    });

    it("should render Analytics button for active projects", () => {
        render(<ProjectCard project={mockProject} />);

        expect(screen.getByText("Analytics")).toBeInTheDocument();
    });

    it("should not render Analytics button for non-active projects", () => {
        const archivedProject = {
            ...mockProject,
            status: "archived",
        };

        render(<ProjectCard project={archivedProject} />);

        expect(screen.queryByText("Analytics")).not.toBeInTheDocument();
    });

    it("should link to project builder page", () => {
        render(<ProjectCard project={mockProject} />);

        const continueLink = screen.getByText("Continue").closest("a");
        expect(continueLink).toHaveAttribute("href", "/funnel-builder/project-123");
    });

    it("should link to analytics page", () => {
        render(<ProjectCard project={mockProject} />);

        const analyticsLink = screen.getByText("Analytics").closest("a");
        expect(analyticsLink).toHaveAttribute(
            "href",
            "/funnel-builder/project-123/analytics"
        );
    });

    it("should handle completion loading error gracefully", async () => {
        mockGetStepCompletionStatus.mockRejectedValue(new Error("Failed to load"));
        mockCalculateCompletionPercentage.mockReturnValue(0);

        render(<ProjectCard project={mockProject} />);

        await waitFor(() => {
            expect(screen.getByText("0%")).toBeInTheDocument();
        });
    });

    it("should display 100% completion when fully complete", async () => {
        mockGetStepCompletionStatus.mockResolvedValue({
            completedSteps: Array.from({ length: 15 }, (_, i) => i + 1),
            totalSteps: 15,
        });
        mockCalculateCompletionPercentage.mockReturnValue(100);

        render(<ProjectCard project={mockProject} />);

        await waitFor(() => {
            expect(screen.getByText("100%")).toBeInTheDocument();
        });
    });

    it("should display archived status badge", () => {
        const archivedProject = {
            ...mockProject,
            status: "archived",
        };

        render(<ProjectCard project={archivedProject} />);

        expect(screen.getByText("archived")).toBeInTheDocument();
    });
});
