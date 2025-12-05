/**
 * PageRegenerateButton Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PageRegenerateButton } from "@/components/pages/page-regenerate-button";

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

// Mock window.location.reload
delete (window as any).location;
window.location = { reload: vi.fn() } as any;

describe("PageRegenerateButton", () => {
    const mockProps = {
        pageId: "page-123",
        pageType: "registration" as const,
        onRegenerate: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                page: {
                    regeneration_metadata: {
                        regeneration_count: 2,
                    },
                },
            }),
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("should render regenerate button", () => {
        render(<PageRegenerateButton {...mockProps} />);

        expect(screen.getByText("Regenerate Page")).toBeInTheDocument();
    });

    it("should open dialog when button is clicked", () => {
        render(<PageRegenerateButton {...mockProps} />);

        const button = screen.getByText("Regenerate Page");
        fireEvent.click(button);

        expect(screen.getByText("Regenerate Page Content")).toBeInTheDocument();
    });

    it("should display warning message in dialog", () => {
        render(<PageRegenerateButton {...mockProps} />);

        const button = screen.getByText("Regenerate Page");
        fireEvent.click(button);

        expect(screen.getByText("Important")).toBeInTheDocument();
        expect(
            screen.getByText(/This will use AI to regenerate your page content/)
        ).toBeInTheDocument();
    });

    it("should show regenerate mode options", () => {
        render(<PageRegenerateButton {...mockProps} />);

        const button = screen.getByText("Regenerate Page");
        fireEvent.click(button);

        expect(screen.getByText("Regenerate All Content")).toBeInTheDocument();
        expect(
            screen.getByText("Regenerate Unedited Fields Only")
        ).toBeInTheDocument();
    });

    it("should default to 'all' mode", () => {
        render(<PageRegenerateButton {...mockProps} />);

        const button = screen.getByText("Regenerate Page");
        fireEvent.click(button);

        const allOption = screen.getByLabelText("Regenerate All Content");
        expect(allOption).toBeChecked();
    });

    it("should allow selecting unedited mode", () => {
        render(<PageRegenerateButton {...mockProps} />);

        const button = screen.getByText("Regenerate Page");
        fireEvent.click(button);

        const uneditedOption = screen.getByLabelText(
            "Regenerate Unedited Fields Only"
        );
        fireEvent.click(uneditedOption);

        expect(uneditedOption).toBeChecked();
    });

    it("should call API with correct parameters", async () => {
        render(<PageRegenerateButton {...mockProps} />);

        const button = screen.getByText("Regenerate Page");
        fireEvent.click(button);

        const regenerateButton = screen.getByText("Regenerate Now");
        fireEvent.click(regenerateButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/pages/registration/page-123/regenerate",
                expect.objectContaining({
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: expect.stringContaining('"preserveEditedFields":false'),
                })
            );
        });
    });

    it("should preserve edited fields when unedited mode selected", async () => {
        render(<PageRegenerateButton {...mockProps} />);

        const button = screen.getByText("Regenerate Page");
        fireEvent.click(button);

        const uneditedOption = screen.getByLabelText(
            "Regenerate Unedited Fields Only"
        );
        fireEvent.click(uneditedOption);

        const regenerateButton = screen.getByText("Regenerate Now");
        fireEvent.click(regenerateButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining('"preserveEditedFields":true'),
                })
            );
        });
    });

    it("should show loading state during regeneration", async () => {
        (global.fetch as any).mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100))
        );

        render(<PageRegenerateButton {...mockProps} />);

        const button = screen.getByText("Regenerate Page");
        fireEvent.click(button);

        const regenerateButton = screen.getByText("Regenerate Now");
        fireEvent.click(regenerateButton);

        await waitFor(() => {
            expect(screen.getByText("Regenerating...")).toBeInTheDocument();
        });
    });

    it("should show success toast after regeneration", async () => {
        render(<PageRegenerateButton {...mockProps} />);

        const button = screen.getByText("Regenerate Page");
        fireEvent.click(button);

        const regenerateButton = screen.getByText("Regenerate Now");
        fireEvent.click(regenerateButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith({
                title: "Page Regenerated! ✨",
                description: expect.stringContaining(
                    "Your page content has been regenerated"
                ),
            });
        });
    });

    it("should reload page after successful regeneration", async () => {
        render(<PageRegenerateButton {...mockProps} />);

        const button = screen.getByText("Regenerate Page");
        fireEvent.click(button);

        const regenerateButton = screen.getByText("Regenerate Now");
        fireEvent.click(regenerateButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalled();
        });

        vi.advanceTimersByTime(1500);

        expect(window.location.reload).toHaveBeenCalled();
    });

    it("should call onRegenerate callback", async () => {
        render(<PageRegenerateButton {...mockProps} />);

        const button = screen.getByText("Regenerate Page");
        fireEvent.click(button);

        const regenerateButton = screen.getByText("Regenerate Now");
        fireEvent.click(regenerateButton);

        await waitFor(() => {
            expect(mockProps.onRegenerate).toHaveBeenCalled();
        });
    });

    it("should close dialog after successful regeneration", async () => {
        render(<PageRegenerateButton {...mockProps} />);

        const button = screen.getByText("Regenerate Page");
        fireEvent.click(button);

        const regenerateButton = screen.getByText("Regenerate Now");
        fireEvent.click(regenerateButton);

        await waitFor(() => {
            expect(
                screen.queryByText("Regenerate Page Content")
            ).not.toBeInTheDocument();
        });
    });

    it("should handle API error", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: false,
            json: async () => ({ error: "Regeneration failed" }),
        });

        render(<PageRegenerateButton {...mockProps} />);

        const button = screen.getByText("Regenerate Page");
        fireEvent.click(button);

        const regenerateButton = screen.getByText("Regenerate Now");
        fireEvent.click(regenerateButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith({
                title: "Regeneration Failed",
                description: "Regeneration failed",
                variant: "destructive",
            });
        });
    });

    it("should handle network error", async () => {
        (global.fetch as any).mockRejectedValue(new Error("Network error"));

        render(<PageRegenerateButton {...mockProps} />);

        const button = screen.getByText("Regenerate Page");
        fireEvent.click(button);

        const regenerateButton = screen.getByText("Regenerate Now");
        fireEvent.click(regenerateButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith({
                title: "Regeneration Failed",
                description: "Network error",
                variant: "destructive",
            });
        });
    });

    it("should allow canceling regeneration", () => {
        render(<PageRegenerateButton {...mockProps} />);

        const button = screen.getByText("Regenerate Page");
        fireEvent.click(button);

        const cancelButton = screen.getByText("Cancel");
        fireEvent.click(cancelButton);

        expect(
            screen.queryByText("Regenerate Page Content")
        ).not.toBeInTheDocument();
    });

    it("should disable buttons during regeneration", async () => {
        (global.fetch as any).mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100))
        );

        render(<PageRegenerateButton {...mockProps} />);

        const button = screen.getByText("Regenerate Page");
        fireEvent.click(button);

        const regenerateButton = screen.getByText("Regenerate Now");
        fireEvent.click(regenerateButton);

        await waitFor(() => {
            expect(screen.getByText("Cancel")).toBeDisabled();
        });
    });

    it("should disable main button during regeneration", async () => {
        (global.fetch as any).mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100))
        );

        render(<PageRegenerateButton {...mockProps} />);

        const button = screen.getByText("Regenerate Page");
        fireEvent.click(button);

        const regenerateButton = screen.getByText("Regenerate Now");
        fireEvent.click(regenerateButton);

        await waitFor(() => {
            expect(screen.getByText("Regenerating...")).toBeInTheDocument();
        });
    });
});
