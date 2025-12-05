/**
 * SlugEditor Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SlugEditor } from "@/components/pages/slug-editor";

// Mock toast
const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
    useToast: () => ({ toast: mockToast }),
}));

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock fetch
global.fetch = vi.fn();

describe("SlugEditor", () => {
    const mockProps = {
        pageId: "page-123",
        pageType: "registration" as const,
        initialSlug: "my-page-slug",
        username: "testuser",
        onUpdate: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ success: true }),
        });

        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockResolvedValue(undefined),
            },
        });
    });

    it("should display current slug", () => {
        render(<SlugEditor {...mockProps} />);

        expect(
            screen.getByText(/testuser\/my-page-slug/)
        ).toBeInTheDocument();
    });

    it("should show edit button", () => {
        render(<SlugEditor {...mockProps} />);

        const editButton = screen.getByTitle("Edit vanity slug");
        expect(editButton).toBeInTheDocument();
    });

    it("should show copy button", () => {
        render(<SlugEditor {...mockProps} />);

        const copyButton = screen.getByTitle("Copy vanity URL");
        expect(copyButton).toBeInTheDocument();
    });

    it("should enter edit mode when edit button clicked", () => {
        render(<SlugEditor {...mockProps} />);

        const editButton = screen.getByTitle("Edit vanity slug");
        fireEvent.click(editButton);

        expect(screen.getByPlaceholderText("my-page-slug")).toBeInTheDocument();
    });

    it("should show preview URL in edit mode", () => {
        render(<SlugEditor {...mockProps} />);

        const editButton = screen.getByTitle("Edit vanity slug");
        fireEvent.click(editButton);

        expect(
            screen.getByText(/URL will be: .*\/testuser\/my-page-slug/)
        ).toBeInTheDocument();
    });

    it("should update slug input", () => {
        render(<SlugEditor {...mockProps} />);

        const editButton = screen.getByTitle("Edit vanity slug");
        fireEvent.click(editButton);

        const input = screen.getByPlaceholderText(
            "my-page-slug"
        ) as HTMLInputElement;
        fireEvent.change(input, { target: { value: "new-slug" } });

        expect(input.value).toBe("new-slug");
    });

    it("should format slug on save", async () => {
        render(<SlugEditor {...mockProps} />);

        const editButton = screen.getByTitle("Edit vanity slug");
        fireEvent.click(editButton);

        const input = screen.getByPlaceholderText("my-page-slug");
        fireEvent.change(input, { target: { value: "New SLUG!" } });

        const saveButton = screen.getByRole("button", { name: "" });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining('"vanity_slug":"new-slug"'),
                })
            );
        });
    });

    it("should call API with correct parameters", async () => {
        render(<SlugEditor {...mockProps} />);

        const editButton = screen.getByTitle("Edit vanity slug");
        fireEvent.click(editButton);

        const input = screen.getByPlaceholderText("my-page-slug");
        fireEvent.change(input, { target: { value: "updated-slug" } });

        const saveButton = screen.getByRole("button", { name: "" });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/pages/registration/page-123",
                expect.objectContaining({
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                })
            );
        });
    });

    it("should show success toast after save", async () => {
        render(<SlugEditor {...mockProps} />);

        const editButton = screen.getByTitle("Edit vanity slug");
        fireEvent.click(editButton);

        const input = screen.getByPlaceholderText("my-page-slug");
        fireEvent.change(input, { target: { value: "updated-slug" } });

        const saveButton = screen.getByRole("button", { name: "" });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith({
                title: "Slug updated ✨",
                description: expect.stringContaining("updated-slug"),
            });
        });
    });

    it("should call onUpdate callback", async () => {
        render(<SlugEditor {...mockProps} />);

        const editButton = screen.getByTitle("Edit vanity slug");
        fireEvent.click(editButton);

        const input = screen.getByPlaceholderText("my-page-slug");
        fireEvent.change(input, { target: { value: "updated-slug" } });

        const saveButton = screen.getByRole("button", { name: "" });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockProps.onUpdate).toHaveBeenCalledWith("updated-slug");
        });
    });

    it("should exit edit mode after save", async () => {
        render(<SlugEditor {...mockProps} />);

        const editButton = screen.getByTitle("Edit vanity slug");
        fireEvent.click(editButton);

        const input = screen.getByPlaceholderText("my-page-slug");
        fireEvent.change(input, { target: { value: "updated-slug" } });

        const saveButton = screen.getByRole("button", { name: "" });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.queryByPlaceholderText("my-page-slug")).not.toBeInTheDocument();
        });
    });

    it("should cancel editing", () => {
        render(<SlugEditor {...mockProps} />);

        const editButton = screen.getByTitle("Edit vanity slug");
        fireEvent.click(editButton);

        const input = screen.getByPlaceholderText("my-page-slug");
        fireEvent.change(input, { target: { value: "changed" } });

        const cancelButtons = screen.getAllByRole("button");
        const cancelButton = cancelButtons[cancelButtons.length - 1];
        fireEvent.click(cancelButton);

        expect(screen.queryByPlaceholderText("my-page-slug")).not.toBeInTheDocument();
    });

    it("should save on Enter key", async () => {
        render(<SlugEditor {...mockProps} />);

        const editButton = screen.getByTitle("Edit vanity slug");
        fireEvent.click(editButton);

        const input = screen.getByPlaceholderText("my-page-slug");
        fireEvent.change(input, { target: { value: "new-slug" } });
        fireEvent.keyDown(input, { key: "Enter" });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalled();
        });
    });

    it("should cancel on Escape key", () => {
        render(<SlugEditor {...mockProps} />);

        const editButton = screen.getByTitle("Edit vanity slug");
        fireEvent.click(editButton);

        const input = screen.getByPlaceholderText("my-page-slug");
        fireEvent.keyDown(input, { key: "Escape" });

        expect(screen.queryByPlaceholderText("my-page-slug")).not.toBeInTheDocument();
    });

    it("should show error for empty slug", async () => {
        render(<SlugEditor {...mockProps} />);

        const editButton = screen.getByTitle("Edit vanity slug");
        fireEvent.click(editButton);

        const input = screen.getByPlaceholderText("my-page-slug");
        fireEvent.change(input, { target: { value: "" } });

        const saveButton = screen.getByRole("button", { name: "" });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith({
                title: "Invalid slug",
                description: "Slug cannot be empty",
                variant: "destructive",
            });
        });
    });

    it("should handle API error", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: false,
            json: async () => ({ error: "Update failed" }),
        });

        render(<SlugEditor {...mockProps} />);

        const editButton = screen.getByTitle("Edit vanity slug");
        fireEvent.click(editButton);

        const input = screen.getByPlaceholderText("my-page-slug");
        fireEvent.change(input, { target: { value: "new-slug" } });

        const saveButton = screen.getByRole("button", { name: "" });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith({
                title: "Error",
                description: "Update failed",
                variant: "destructive",
            });
        });
    });

    it("should copy vanity URL", async () => {
        render(<SlugEditor {...mockProps} />);

        const copyButton = screen.getByTitle("Copy vanity URL");
        fireEvent.click(copyButton);

        await waitFor(() => {
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
                expect.stringContaining("/testuser/my-page-slug")
            );
        });
    });

    it("should show ID link when no slug", () => {
        render(<SlugEditor {...mockProps} initialSlug={null} />);

        expect(screen.getByText("(ID link)")).toBeInTheDocument();
        expect(screen.getByText(/\/p\/page-123/)).toBeInTheDocument();
    });

    it("should copy ID link when no slug", async () => {
        render(<SlugEditor {...mockProps} initialSlug={null} />);

        const copyButton = screen.getByTitle("Copy page URL");
        fireEvent.click(copyButton);

        await waitFor(() => {
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
                expect.stringContaining("/p/page-123")
            );
        });
    });
});
