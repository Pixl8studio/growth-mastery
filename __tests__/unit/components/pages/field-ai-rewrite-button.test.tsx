/**
 * FieldAIRewriteButton Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FieldAIRewriteButton } from "@/components/pages/field-ai-rewrite-button";

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

describe("FieldAIRewriteButton", () => {
    const mockProps = {
        pageId: "page-123",
        pageType: "enrollment" as const,
        fieldContent: "Original content",
        fieldType: "heading" as const,
        onRewrite: vi.fn(),
    };

    const mockOptions = [
        {
            id: "opt-1",
            content: "Rewrite option 1",
            style: "Professional",
        },
        {
            id: "opt-2",
            content: "Rewrite option 2",
            style: "Casual",
        },
        {
            id: "opt-3",
            content: "Rewrite option 3",
            style: "Bold",
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ options: mockOptions }),
        });
    });

    it("should render button with sparkles icon", () => {
        render(<FieldAIRewriteButton {...mockProps} />);

        const button = screen.getByTitle("Generate AI rewrites");
        expect(button).toBeInTheDocument();
    });

    it("should open dialog when button is clicked", async () => {
        render(<FieldAIRewriteButton {...mockProps} />);

        const button = screen.getByTitle("Generate AI rewrites");
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByText("Choose Your Preferred Version")).toBeInTheDocument();
        });
    });

    it("should show loading state while generating", async () => {
        render(<FieldAIRewriteButton {...mockProps} />);

        const button = screen.getByTitle("Generate AI rewrites");
        fireEvent.click(button);

        expect(screen.getByText("Generating rewrites...")).toBeInTheDocument();
    });

    it("should fetch rewrites from API", async () => {
        render(<FieldAIRewriteButton {...mockProps} />);

        const button = screen.getByTitle("Generate AI rewrites");
        fireEvent.click(button);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/pages/enrollment/page-123/rewrite-field",
                expect.objectContaining({
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: expect.stringContaining("Original content"),
                })
            );
        });
    });

    it("should display rewrite options", async () => {
        render(<FieldAIRewriteButton {...mockProps} />);

        const button = screen.getByTitle("Generate AI rewrites");
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByText("Rewrite option 1")).toBeInTheDocument();
            expect(screen.getByText("Rewrite option 2")).toBeInTheDocument();
            expect(screen.getByText("Rewrite option 3")).toBeInTheDocument();
        });
    });

    it("should show style labels for options", async () => {
        render(<FieldAIRewriteButton {...mockProps} />);

        const button = screen.getByTitle("Generate AI rewrites");
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByText("Professional")).toBeInTheDocument();
            expect(screen.getByText("Casual")).toBeInTheDocument();
            expect(screen.getByText("Bold")).toBeInTheDocument();
        });
    });

    it("should select first option by default", async () => {
        render(<FieldAIRewriteButton {...mockProps} />);

        const button = screen.getByTitle("Generate AI rewrites");
        fireEvent.click(button);

        await waitFor(() => {
            const firstOption = screen.getByLabelText(/Professional/);
            expect(firstOption).toBeChecked();
        });
    });

    it("should allow selecting different option", async () => {
        render(<FieldAIRewriteButton {...mockProps} />);

        const button = screen.getByTitle("Generate AI rewrites");
        fireEvent.click(button);

        await waitFor(() => {
            const secondOption = screen.getByLabelText(/Casual/);
            fireEvent.click(secondOption);
            expect(secondOption).toBeChecked();
        });
    });

    it("should apply selected rewrite", async () => {
        render(<FieldAIRewriteButton {...mockProps} />);

        const button = screen.getByTitle("Generate AI rewrites");
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByText("Rewrite option 2")).toBeInTheDocument();
        });

        const secondOption = screen.getByLabelText(/Casual/);
        fireEvent.click(secondOption);

        const applyButton = screen.getByText("Apply Selected");
        fireEvent.click(applyButton);

        expect(mockProps.onRewrite).toHaveBeenCalledWith("Rewrite option 2");
        expect(mockToast).toHaveBeenCalledWith({
            title: "Content Updated",
            description: "Your selected rewrite has been applied.",
        });
    });

    it("should keep original content when cancel is clicked", async () => {
        render(<FieldAIRewriteButton {...mockProps} />);

        const button = screen.getByTitle("Generate AI rewrites");
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByText("Keep Original")).toBeInTheDocument();
        });

        const keepButton = screen.getByText("Keep Original");
        fireEvent.click(keepButton);

        expect(mockToast).toHaveBeenCalledWith({
            title: "Original Kept",
            description: "No changes were made to the content.",
        });
        expect(mockProps.onRewrite).not.toHaveBeenCalled();
    });

    it("should handle API error", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: false,
            json: async () => ({ error: "Generation failed" }),
        });

        render(<FieldAIRewriteButton {...mockProps} />);

        const button = screen.getByTitle("Generate AI rewrites");
        fireEvent.click(button);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith({
                title: "Generation Failed",
                description: "Generation failed",
                variant: "destructive",
            });
        });
    });

    it("should handle network error", async () => {
        (global.fetch as any).mockRejectedValue(new Error("Network error"));

        render(<FieldAIRewriteButton {...mockProps} />);

        const button = screen.getByTitle("Generate AI rewrites");
        fireEvent.click(button);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith({
                title: "Generation Failed",
                description: "Network error",
                variant: "destructive",
            });
        });
    });

    it("should disable buttons while generating", async () => {
        (global.fetch as any).mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100))
        );

        render(<FieldAIRewriteButton {...mockProps} />);

        const button = screen.getByTitle("Generate AI rewrites");
        fireEvent.click(button);

        await waitFor(() => {
            const keepButton = screen.getByText("Keep Original");
            const applyButton = screen.getByText("Apply Selected");
            expect(keepButton).toBeDisabled();
            expect(applyButton).toBeDisabled();
        });
    });

    it("should close dialog after applying rewrite", async () => {
        render(<FieldAIRewriteButton {...mockProps} />);

        const button = screen.getByTitle("Generate AI rewrites");
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByText("Apply Selected")).toBeInTheDocument();
        });

        const applyButton = screen.getByText("Apply Selected");
        fireEvent.click(applyButton);

        await waitFor(() => {
            expect(screen.queryByText("Choose Your Preferred Version")).not.toBeInTheDocument();
        });
    });

    it("should show dialog description", async () => {
        render(<FieldAIRewriteButton {...mockProps} />);

        const button = screen.getByTitle("Generate AI rewrites");
        fireEvent.click(button);

        await waitFor(() => {
            expect(
                screen.getByText(
                    /Select one of the AI-generated options below, or keep your original content/
                )
            ).toBeInTheDocument();
        });
    });
});
