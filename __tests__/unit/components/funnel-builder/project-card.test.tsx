/**
 * ProjectCard Component Tests
 * Tests for rendering, dropdown menu interactions, and user actions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectCard } from "@/components/funnel-builder/project-card";

// Mock dependencies
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock("@/app/funnel-builder/completion-utils", () => ({
    getStepCompletionStatus: vi.fn().mockResolvedValue({
        step1: true,
        step2: true,
        step3: false,
    }),
}));

vi.mock("@/app/funnel-builder/completion-types", () => ({
    calculateCompletionPercentage: vi.fn().mockReturnValue(67),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: vi.fn(),
    }),
}));

vi.mock("next/link", () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

describe("ProjectCard", () => {
    const defaultProps = {
        project: {
            id: "test-project-123",
            name: "Test Project",
            status: "draft" as const,
            current_step: 3,
            updated_at: new Date().toISOString(),
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock window.confirm
        vi.spyOn(window, "confirm").mockImplementation(() => true);
    });

    describe("Rendering", () => {
        it("should render the project name", () => {
            render(<ProjectCard {...defaultProps} />);
            expect(screen.getByText("Test Project")).toBeInTheDocument();
        });

        it("should render the status badge", () => {
            render(<ProjectCard {...defaultProps} />);
            expect(screen.getByText("draft")).toBeInTheDocument();
        });

        it("should render the Continue button", () => {
            render(<ProjectCard {...defaultProps} />);
            expect(
                screen.getByRole("button", { name: /continue/i })
            ).toBeInTheDocument();
        });

        it("should render Analytics button only for active projects", () => {
            const { rerender } = render(<ProjectCard {...defaultProps} />);
            expect(
                screen.queryByRole("button", { name: /analytics/i })
            ).not.toBeInTheDocument();

            rerender(
                <ProjectCard project={{ ...defaultProps.project, status: "active" }} />
            );
            expect(
                screen.getByRole("button", { name: /analytics/i })
            ).toBeInTheDocument();
        });

        it("should render the kebab menu trigger button", () => {
            render(<ProjectCard {...defaultProps} />);
            expect(
                screen.getByRole("button", { name: /funnel options/i })
            ).toBeInTheDocument();
        });
    });

    describe("Dropdown Menu", () => {
        it("should open dropdown menu when trigger is clicked", async () => {
            const user = userEvent.setup();
            render(<ProjectCard {...defaultProps} />);

            const menuTrigger = screen.getByRole("button", { name: /funnel options/i });
            await user.click(menuTrigger);

            await waitFor(() => {
                expect(screen.getByText("Settings")).toBeInTheDocument();
                expect(screen.getByText("Duplicate")).toBeInTheDocument();
                expect(screen.getByText("Archive")).toBeInTheDocument();
                expect(screen.getByText("Delete")).toBeInTheDocument();
            });
        });

        it("should have Settings link pointing to correct URL", async () => {
            const user = userEvent.setup();
            render(<ProjectCard {...defaultProps} />);

            const menuTrigger = screen.getByRole("button", { name: /funnel options/i });
            await user.click(menuTrigger);

            await waitFor(() => {
                const settingsLink = screen.getByText("Settings").closest("a");
                expect(settingsLink).toHaveAttribute(
                    "href",
                    "/funnel-builder/test-project-123/settings"
                );
            });
        });

        it("should call handleDuplicate when Duplicate is clicked", async () => {
            const { logger } = await import("@/lib/client-logger");
            const user = userEvent.setup();
            render(<ProjectCard {...defaultProps} />);

            const menuTrigger = screen.getByRole("button", { name: /funnel options/i });
            await user.click(menuTrigger);

            await waitFor(() => {
                expect(screen.getByText("Duplicate")).toBeInTheDocument();
            });

            await user.click(screen.getByText("Duplicate"));

            expect(logger.info).toHaveBeenCalledWith(
                { projectId: "test-project-123" },
                "Duplicate project clicked"
            );
        });

        it("should show confirmation dialog when Archive is clicked", async () => {
            const user = userEvent.setup();
            render(<ProjectCard {...defaultProps} />);

            const menuTrigger = screen.getByRole("button", { name: /funnel options/i });
            await user.click(menuTrigger);

            await waitFor(() => {
                expect(screen.getByText("Archive")).toBeInTheDocument();
            });

            await user.click(screen.getByText("Archive"));

            expect(window.confirm).toHaveBeenCalledWith(
                expect.stringContaining("Archive")
            );
        });

        it("should show confirmation dialog when Delete is clicked", async () => {
            const user = userEvent.setup();
            render(<ProjectCard {...defaultProps} />);

            const menuTrigger = screen.getByRole("button", { name: /funnel options/i });
            await user.click(menuTrigger);

            await waitFor(() => {
                expect(screen.getByText("Delete")).toBeInTheDocument();
            });

            await user.click(screen.getByText("Delete"));

            expect(window.confirm).toHaveBeenCalledWith(
                expect.stringContaining("delete")
            );
        });

        it("should not proceed with Archive if confirmation is cancelled", async () => {
            const { logger } = await import("@/lib/client-logger");
            vi.spyOn(window, "confirm").mockImplementation(() => false);

            const user = userEvent.setup();
            render(<ProjectCard {...defaultProps} />);

            const menuTrigger = screen.getByRole("button", { name: /funnel options/i });
            await user.click(menuTrigger);

            await waitFor(() => {
                expect(screen.getByText("Archive")).toBeInTheDocument();
            });

            await user.click(screen.getByText("Archive"));

            expect(logger.info).not.toHaveBeenCalledWith(
                expect.anything(),
                "Archive project confirmed"
            );
        });

        it("should not proceed with Delete if confirmation is cancelled", async () => {
            const { logger } = await import("@/lib/client-logger");
            vi.spyOn(window, "confirm").mockImplementation(() => false);

            const user = userEvent.setup();
            render(<ProjectCard {...defaultProps} />);

            const menuTrigger = screen.getByRole("button", { name: /funnel options/i });
            await user.click(menuTrigger);

            await waitFor(() => {
                expect(screen.getByText("Delete")).toBeInTheDocument();
            });

            await user.click(screen.getByText("Delete"));

            expect(logger.info).not.toHaveBeenCalledWith(
                expect.anything(),
                "Delete project confirmed"
            );
        });
    });

    describe("Status Badge Variants", () => {
        it("should render success variant for active status", () => {
            render(
                <ProjectCard project={{ ...defaultProps.project, status: "active" }} />
            );
            const badge = screen.getByText("active");
            expect(badge).toBeInTheDocument();
        });

        it("should render secondary variant for archived status", () => {
            render(
                <ProjectCard
                    project={{ ...defaultProps.project, status: "archived" }}
                />
            );
            const badge = screen.getByText("archived");
            expect(badge).toBeInTheDocument();
        });

        it("should render default variant for draft status", () => {
            render(<ProjectCard {...defaultProps} />);
            const badge = screen.getByText("draft");
            expect(badge).toBeInTheDocument();
        });
    });

    describe("Completion Percentage", () => {
        it("should display completion percentage after loading", async () => {
            render(<ProjectCard {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText("67%")).toBeInTheDocument();
            });
        });
    });
});
