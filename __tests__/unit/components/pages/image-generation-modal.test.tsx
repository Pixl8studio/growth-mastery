/**
 * ImageGenerationModal Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ImageGenerationModal } from "@/components/pages/image-generation-modal";

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock fetch
global.fetch = vi.fn();

describe("ImageGenerationModal", () => {
    const mockProps = {
        isOpen: true,
        onClose: vi.fn(),
        onImageGenerated: vi.fn(),
        projectId: "project-123",
        pageId: "page-456",
        suggestedPrompts: ["Custom prompt 1", "Custom prompt 2"],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                imageUrl: "https://example.com/generated.png",
                mediaId: "media-789",
            }),
        });
    });

    it("should render when isOpen is true", () => {
        render(<ImageGenerationModal {...mockProps} />);

        expect(screen.getByText("Generate AI Image")).toBeInTheDocument();
    });

    it("should not render when isOpen is false", () => {
        render(<ImageGenerationModal {...mockProps} isOpen={false} />);

        expect(screen.queryByText("Generate AI Image")).not.toBeInTheDocument();
    });

    it("should display prompt textarea", () => {
        render(<ImageGenerationModal {...mockProps} />);

        expect(
            screen.getByPlaceholderText(
                /A modern minimalist hero background/
            )
        ).toBeInTheDocument();
    });

    it("should display size selection buttons", () => {
        render(<ImageGenerationModal {...mockProps} />);

        expect(screen.getByText("Square (1024×1024)")).toBeInTheDocument();
        expect(screen.getByText("Wide (1792×1024)")).toBeInTheDocument();
        expect(screen.getByText("Tall (1024×1792)")).toBeInTheDocument();
    });

    it("should allow selecting different image sizes", () => {
        render(<ImageGenerationModal {...mockProps} />);

        const wideButton = screen.getByText("Wide (1792×1024)");
        fireEvent.click(wideButton);

        expect(wideButton).toHaveClass("border-purple-600");
    });

    it("should display suggested prompts", () => {
        render(<ImageGenerationModal {...mockProps} />);

        expect(screen.getByText("Custom prompt 1")).toBeInTheDocument();
        expect(screen.getByText("Custom prompt 2")).toBeInTheDocument();
    });

    it("should use default prompts when none provided", () => {
        const propsWithoutSuggestions = { ...mockProps, suggestedPrompts: [] };
        render(<ImageGenerationModal {...propsWithoutSuggestions} />);

        expect(
            screen.getByText(/Modern minimalist hero background/)
        ).toBeInTheDocument();
    });

    it("should populate textarea when suggestion is clicked", () => {
        render(<ImageGenerationModal {...mockProps} />);

        const suggestion = screen.getByText("Custom prompt 1");
        fireEvent.click(suggestion);

        const textarea = screen.getByPlaceholderText(
            /A modern minimalist hero background/
        ) as HTMLTextAreaElement;
        expect(textarea.value).toBe("Custom prompt 1");
    });

    it("should disable generate button when prompt is empty", () => {
        render(<ImageGenerationModal {...mockProps} />);

        const generateButton = screen.getByText("Generate Image");
        expect(generateButton).toBeDisabled();
    });

    it("should enable generate button when prompt is entered", () => {
        render(<ImageGenerationModal {...mockProps} />);

        const textarea = screen.getByPlaceholderText(
            /A modern minimalist hero background/
        );
        fireEvent.change(textarea, { target: { value: "Test prompt" } });

        const generateButton = screen.getByText("Generate Image");
        expect(generateButton).not.toBeDisabled();
    });

    it("should show error when generating with empty prompt", async () => {
        render(<ImageGenerationModal {...mockProps} />);

        const textarea = screen.getByPlaceholderText(
            /A modern minimalist hero background/
        );
        fireEvent.change(textarea, { target: { value: "  " } });

        const generateButton = screen.getByText("Generate Image");
        fireEvent.click(generateButton);

        expect(screen.getByText("Please enter a prompt")).toBeInTheDocument();
    });

    it("should call API when generate is clicked", async () => {
        render(<ImageGenerationModal {...mockProps} />);

        const textarea = screen.getByPlaceholderText(
            /A modern minimalist hero background/
        );
        fireEvent.change(textarea, { target: { value: "Mountain landscape" } });

        const generateButton = screen.getByText("Generate Image");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/pages/generate-image",
                expect.objectContaining({
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: expect.stringContaining('"prompt":"Mountain landscape"'),
                })
            );
        });
    });

    it("should include size in API call", async () => {
        render(<ImageGenerationModal {...mockProps} />);

        const tallButton = screen.getByText("Tall (1024×1792)");
        fireEvent.click(tallButton);

        const textarea = screen.getByPlaceholderText(
            /A modern minimalist hero background/
        );
        fireEvent.change(textarea, { target: { value: "Test image" } });

        const generateButton = screen.getByText("Generate Image");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining('"size":"1024x1792"'),
                })
            );
        });
    });

    it("should show loading state during generation", async () => {
        (global.fetch as any).mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100))
        );

        render(<ImageGenerationModal {...mockProps} />);

        const textarea = screen.getByPlaceholderText(
            /A modern minimalist hero background/
        );
        fireEvent.change(textarea, { target: { value: "Test prompt" } });

        const generateButton = screen.getByText("Generate Image");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(
                screen.getByText(/Generating... \(this may take 10-30 seconds\)/)
            ).toBeInTheDocument();
        });
    });

    it("should display generated image", async () => {
        render(<ImageGenerationModal {...mockProps} />);

        const textarea = screen.getByPlaceholderText(
            /A modern minimalist hero background/
        );
        fireEvent.change(textarea, { target: { value: "Test prompt" } });

        const generateButton = screen.getByText("Generate Image");
        fireEvent.click(generateButton);

        await waitFor(() => {
            const image = screen.getByAltText("Generated");
            expect(image).toHaveAttribute(
                "src",
                "https://example.com/generated.png"
            );
        });
    });

    it("should show regenerate and insert buttons after generation", async () => {
        render(<ImageGenerationModal {...mockProps} />);

        const textarea = screen.getByPlaceholderText(
            /A modern minimalist hero background/
        );
        fireEvent.change(textarea, { target: { value: "Test prompt" } });

        const generateButton = screen.getByText("Generate Image");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(screen.getByText("Generate New Image")).toBeInTheDocument();
            expect(screen.getByText("Insert Image")).toBeInTheDocument();
        });
    });

    it("should call onImageGenerated when insert is clicked", async () => {
        render(<ImageGenerationModal {...mockProps} />);

        const textarea = screen.getByPlaceholderText(
            /A modern minimalist hero background/
        );
        fireEvent.change(textarea, { target: { value: "Test prompt" } });

        let generateButton = screen.getByText("Generate Image");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(screen.getByText("Insert Image")).toBeInTheDocument();
        });

        const insertButton = screen.getByText("Insert Image");
        fireEvent.click(insertButton);

        expect(mockProps.onImageGenerated).toHaveBeenCalledWith(
            "https://example.com/generated.png",
            "media-789"
        );
    });

    it("should close modal after inserting image", async () => {
        render(<ImageGenerationModal {...mockProps} />);

        const textarea = screen.getByPlaceholderText(
            /A modern minimalist hero background/
        );
        fireEvent.change(textarea, { target: { value: "Test prompt" } });

        const generateButton = screen.getByText("Generate Image");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(screen.getByText("Insert Image")).toBeInTheDocument();
        });

        const insertButton = screen.getByText("Insert Image");
        fireEvent.click(insertButton);

        expect(mockProps.onClose).toHaveBeenCalled();
    });

    it("should clear generated image when regenerate is clicked", async () => {
        render(<ImageGenerationModal {...mockProps} />);

        const textarea = screen.getByPlaceholderText(
            /A modern minimalist hero background/
        );
        fireEvent.change(textarea, { target: { value: "Test prompt" } });

        const generateButton = screen.getByText("Generate Image");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(screen.getByAltText("Generated")).toBeInTheDocument();
        });

        const regenerateButton = screen.getByText("Generate New Image");
        fireEvent.click(regenerateButton);

        expect(screen.queryByAltText("Generated")).not.toBeInTheDocument();
        expect(screen.getByText("Generate Image")).toBeInTheDocument();
    });

    it("should handle API error", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: false,
            json: async () => ({ error: "Image generation failed" }),
        });

        render(<ImageGenerationModal {...mockProps} />);

        const textarea = screen.getByPlaceholderText(
            /A modern minimalist hero background/
        );
        fireEvent.change(textarea, { target: { value: "Test prompt" } });

        const generateButton = screen.getByText("Generate Image");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(screen.getByText("Image generation failed")).toBeInTheDocument();
        });
    });

    it("should handle network error", async () => {
        (global.fetch as any).mockRejectedValue(new Error("Network error"));

        render(<ImageGenerationModal {...mockProps} />);

        const textarea = screen.getByPlaceholderText(
            /A modern minimalist hero background/
        );
        fireEvent.change(textarea, { target: { value: "Test prompt" } });

        const generateButton = screen.getByText("Generate Image");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(screen.getByText("Network error")).toBeInTheDocument();
        });
    });

    it("should close modal when close button is clicked", () => {
        render(<ImageGenerationModal {...mockProps} />);

        const closeButton = screen.getByRole("button", { name: "" });
        fireEvent.click(closeButton);

        expect(mockProps.onClose).toHaveBeenCalled();
    });

    it("should disable close button during generation", async () => {
        (global.fetch as any).mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100))
        );

        render(<ImageGenerationModal {...mockProps} />);

        const textarea = screen.getByPlaceholderText(
            /A modern minimalist hero background/
        );
        fireEvent.change(textarea, { target: { value: "Test prompt" } });

        const generateButton = screen.getByText("Generate Image");
        fireEvent.click(generateButton);

        await waitFor(() => {
            const closeButton = screen.getByRole("button", { name: "" });
            expect(closeButton).toBeDisabled();
        });
    });

    it("should clear state when modal closes", () => {
        const { rerender } = render(<ImageGenerationModal {...mockProps} />);

        const textarea = screen.getByPlaceholderText(
            /A modern minimalist hero background/
        );
        fireEvent.change(textarea, { target: { value: "Test prompt" } });

        rerender(<ImageGenerationModal {...mockProps} isOpen={false} />);
        rerender(<ImageGenerationModal {...mockProps} isOpen={true} />);

        const newTextarea = screen.getByPlaceholderText(
            /A modern minimalist hero background/
        ) as HTMLTextAreaElement;
        expect(newTextarea.value).toBe("");
    });
});
