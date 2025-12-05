/**
 * PagesList Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PagesList } from "@/components/funnel-builder/pages-list";

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock Supabase client
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
    createClient: () => ({
        from: mockFrom,
    }),
}));

// Mock useToast
const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
    useToast: () => ({ toast: mockToast }),
}));

// Mock child components
vi.mock("@/components/pages/publish-toggle", () => ({
    PublishToggle: ({ page }: any) => (
        <div data-testid="publish-toggle">{page.headline}</div>
    ),
}));

vi.mock("@/components/pages/slug-editor", () => ({
    SlugEditor: ({ initialSlug, onUpdate }: any) => (
        <div data-testid="slug-editor">
            <button onClick={() => onUpdate("new-slug")}>Update Slug</button>
            {initialSlug}
        </div>
    ),
}));

// Mock utils
vi.mock("@/lib/utils", () => ({
    formatDate: (date: string) => new Date(date).toLocaleDateString(),
}));

// Mock next/link
vi.mock("next/link", () => ({
    default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

describe("PagesList", () => {
    const mockProps = {
        userId: "user-123",
        username: "testuser",
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mock chain
        const mockData = {
            registration_pages: [
                {
                    id: "reg-1",
                    headline: "Register Now",
                    vanity_slug: "register-webinar",
                    is_published: true,
                    updated_at: "2024-01-01T00:00:00Z",
                    funnel_projects: { id: "project-1", name: "My Funnel" },
                },
            ],
            watch_pages: [],
            enrollment_pages: [],
        };

        mockOrder.mockResolvedValue({
            data: mockData.registration_pages,
            error: null,
        });
        mockEq.mockReturnValue({ order: mockOrder });
        mockSelect.mockReturnValue({ eq: mockEq });
        mockFrom.mockReturnValue({ select: mockSelect });
    });

    it("should render loading state initially", () => {
        render(<PagesList {...mockProps} />);

        expect(screen.getByText("Loading pages...")).toBeInTheDocument();
    });

    it("should render pages after loading", async () => {
        render(<PagesList {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Register Now")).toBeInTheDocument();
        });
    });

    it("should display page type badge", async () => {
        render(<PagesList {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Registration")).toBeInTheDocument();
        });
    });

    it("should display project name", async () => {
        render(<PagesList {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText(/Project: My Funnel/)).toBeInTheDocument();
        });
    });

    it("should display public URL when slug exists", async () => {
        render(<PagesList {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText(/testuser\/register-webinar/)).toBeInTheDocument();
        });
    });

    it("should handle copy URL button click", async () => {
        const mockClipboard = {
            writeText: vi.fn().mockResolvedValue(undefined),
        };
        Object.assign(navigator, { clipboard: mockClipboard });

        render(<PagesList {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Register Now")).toBeInTheDocument();
        });

        const copyButton = screen.getAllByRole("button", { name: "" })[0];
        fireEvent.click(copyButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "URL copied!",
                })
            );
        });
    });

    it("should show error toast when copying without slug", async () => {
        mockOrder.mockResolvedValue({
            data: [
                {
                    id: "reg-1",
                    headline: "Register Now",
                    vanity_slug: null,
                    is_published: true,
                    updated_at: "2024-01-01T00:00:00Z",
                    funnel_projects: { id: "project-1", name: "My Funnel" },
                },
            ],
            error: null,
        });

        const mockClipboard = {
            writeText: vi.fn().mockResolvedValue(undefined),
        };
        Object.assign(navigator, { clipboard: mockClipboard });

        render(<PagesList {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Register Now")).toBeInTheDocument();
        });

        const copyButtons = screen.getAllByRole("button", { name: "" });
        if (copyButtons.length > 0) {
            fireEvent.click(copyButtons[0]);

            await waitFor(() => {
                expect(mockToast).toHaveBeenCalledWith(
                    expect.objectContaining({
                        title: "No slug set",
                        variant: "destructive",
                    })
                );
            });
        }
    });

    it("should display no pages message when empty", async () => {
        mockOrder.mockResolvedValue({
            data: [],
            error: null,
        });

        render(<PagesList {...mockProps} />);

        await waitFor(() => {
            expect(
                screen.getByText(
                    "No pages created yet. Create your first funnel to get started!"
                )
            ).toBeInTheDocument();
        });
    });

    it("should handle slug update callback", async () => {
        render(<PagesList {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Register Now")).toBeInTheDocument();
        });

        const updateButton = screen.getByText("Update Slug");
        fireEvent.click(updateButton);

        // Check that slug was updated in the component state
        await waitFor(() => {
            expect(screen.getByText("new-slug")).toBeInTheDocument();
        });
    });

    it("should render edit page links", async () => {
        render(<PagesList {...mockProps} />);

        await waitFor(() => {
            const editLink = screen.getByText("Edit Page").closest("a");
            expect(editLink).toHaveAttribute(
                "href",
                expect.stringContaining("/funnel-builder/project-1/pages/registration/")
            );
        });
    });

    it("should render view public links when slug exists", async () => {
        render(<PagesList {...mockProps} />);

        await waitFor(() => {
            const viewLink = screen.getByText("View Public").closest("a");
            expect(viewLink).toHaveAttribute("href", "/testuser/register-webinar");
        });
    });
});
