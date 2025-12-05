/**
 * PagesTable Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PagesTable } from "@/components/pages/pages-table";
import { useRouter } from "next/navigation";

// Mock Next.js router
vi.mock("next/navigation", () => ({
    useRouter: vi.fn(),
}));

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock page actions
vi.mock("@/app/pages/actions", () => ({
    deletePage: vi.fn(),
}));

// Mock window.open
global.window.open = vi.fn();

// Mock window.confirm
global.window.confirm = vi.fn(() => true);

describe("PagesTable", () => {
    const mockRefresh = vi.fn();

    const mockPages = [
        {
            id: "page-1",
            type: "enrollment" as const,
            headline: "Test Page 1",
            vanity_slug: "test-page-1",
            is_published: true,
            funnel_id: "funnel-1",
            funnel_name: "Test Funnel",
            created_at: new Date().toISOString(),
        },
        {
            id: "page-2",
            type: "watch" as const,
            headline: "Test Page 2",
            vanity_slug: null,
            is_published: false,
            funnel_id: "funnel-1",
            funnel_name: "Test Funnel",
            created_at: new Date().toISOString(),
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        (useRouter as any).mockReturnValue({
            refresh: mockRefresh,
        });
    });

    it("should render table headers", () => {
        render(<PagesTable pages={mockPages} username="testuser" />);

        expect(screen.getByText("Page Title")).toBeInTheDocument();
        expect(screen.getByText("Type")).toBeInTheDocument();
        expect(screen.getByText("Published")).toBeInTheDocument();
        expect(screen.getByText("Funnel")).toBeInTheDocument();
        expect(screen.getByText("Created")).toBeInTheDocument();
        expect(screen.getByText("Actions")).toBeInTheDocument();
    });

    it("should render page rows", () => {
        render(<PagesTable pages={mockPages} username="testuser" />);

        expect(screen.getByText("Test Page 1")).toBeInTheDocument();
        expect(screen.getByText("Test Page 2")).toBeInTheDocument();
    });

    it("should show empty state when no pages", () => {
        render(<PagesTable pages={[]} username="testuser" />);

        expect(screen.getByText("No pages found")).toBeInTheDocument();
        expect(
            screen.getByText(/Try adjusting your filters/)
        ).toBeInTheDocument();
    });

    it("should open preview in new window", () => {
        render(<PagesTable pages={mockPages} username="testuser" />);

        const previewButtons = screen.getAllByTitle("Preview");
        fireEvent.click(previewButtons[0]);

        expect(window.open).toHaveBeenCalledWith(
            expect.stringContaining("/funnel-builder/funnel-1/pages/enrollment/page-1"),
            "_blank"
        );
    });

    it("should open editor in new window", () => {
        render(<PagesTable pages={mockPages} username="testuser" />);

        const editButtons = screen.getAllByTitle("Edit with Visual Editor");
        fireEvent.click(editButtons[0]);

        expect(window.open).toHaveBeenCalledWith(
            expect.stringContaining("edit=true"),
            "_blank"
        );
    });

    it("should confirm before deleting", async () => {
        const { deletePage } = await import("@/app/pages/actions");

        render(<PagesTable pages={mockPages} username="testuser" />);

        const deleteButtons = screen.getAllByTitle("Delete");
        fireEvent.click(deleteButtons[0]);

        expect(window.confirm).toHaveBeenCalledWith(
            expect.stringContaining("Are you sure")
        );
    });

    it("should delete page on confirm", async () => {
        const { deletePage } = await import("@/app/pages/actions");
        (deletePage as any).mockResolvedValue(undefined);

        render(<PagesTable pages={mockPages} username="testuser" />);

        const deleteButtons = screen.getAllByTitle("Delete");
        fireEvent.click(deleteButtons[0]);

        await waitFor(() => {
            expect(deletePage).toHaveBeenCalledWith("enrollment", "page-1");
        });
    });

    it("should refresh after successful delete", async () => {
        const { deletePage } = await import("@/app/pages/actions");
        (deletePage as any).mockResolvedValue(undefined);

        render(<PagesTable pages={mockPages} username="testuser" />);

        const deleteButtons = screen.getAllByTitle("Delete");
        fireEvent.click(deleteButtons[0]);

        await waitFor(() => {
            expect(mockRefresh).toHaveBeenCalled();
        });
    });

    it("should not delete if user cancels", () => {
        (window.confirm as any).mockReturnValue(false);

        render(<PagesTable pages={mockPages} username="testuser" />);

        const deleteButtons = screen.getAllByTitle("Delete");
        fireEvent.click(deleteButtons[0]);

        expect(window.confirm).toHaveBeenCalled();
    });

    it("should handle delete error", async () => {
        const { deletePage } = await import("@/app/pages/actions");
        (deletePage as any).mockRejectedValue(new Error("Delete failed"));

        global.alert = vi.fn();

        render(<PagesTable pages={mockPages} username="testuser" />);

        const deleteButtons = screen.getAllByTitle("Delete");
        fireEvent.click(deleteButtons[0]);

        await waitFor(() => {
            expect(global.alert).toHaveBeenCalledWith(
                expect.stringContaining("Failed to delete")
            );
        });
    });

    it("should disable actions during delete", async () => {
        const { deletePage } = await import("@/app/pages/actions");
        (deletePage as any).mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100))
        );

        render(<PagesTable pages={mockPages} username="testuser" />);

        const deleteButtons = screen.getAllByTitle("Delete");
        fireEvent.click(deleteButtons[0]);

        await waitFor(() => {
            const allButtons = screen.getAllByRole("button");
            allButtons.forEach((button) => {
                if (button.hasAttribute("disabled")) {
                    expect(button).toBeDisabled();
                }
            });
        });
    });

    it("should show funnel name", () => {
        render(<PagesTable pages={mockPages} username="testuser" />);

        expect(screen.getAllByText("Test Funnel")).toHaveLength(2);
    });

    it("should show relative created time", () => {
        render(<PagesTable pages={mockPages} username="testuser" />);

        expect(screen.getAllByText(/ago/)).toHaveLength(2);
    });
});
