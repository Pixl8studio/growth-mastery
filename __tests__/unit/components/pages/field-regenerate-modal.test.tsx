/**
 * FieldRegenerateModal Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FieldRegenerateModal } from "@/components/pages/field-regenerate-modal";

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock fetch
global.fetch = vi.fn();

describe("FieldRegenerateModal", () => {
    const mockProps = {
        isOpen: true,
        onClose: vi.fn(),
        onSelect: vi.fn(),
        fieldId: "field-123",
        fieldContext: "Current headline content here",
        pageId: "page-456",
        pageType: "registration" as const,
    };

    const mockOptions = [
        "Regenerated option 1",
        "Regenerated option 2",
        "Regenerated option 3",
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ options: mockOptions }),
        });
    });

    it("should render when isOpen is true", () => {
        render(<FieldRegenerateModal {...mockProps} />);

        expect(screen.getByText("AI Content Options")).toBeInTheDocument();
    });

    it("should not render when isOpen is false", () => {
        render(<FieldRegenerateModal {...mockProps} isOpen={false} />);

        expect(screen.queryByText("AI Content Options")).not.toBeInTheDocument();
    });

    it("should display current content", () => {
        render(<FieldRegenerateModal {...mockProps} />);

        expect(screen.getByText("Current Content:")).toBeInTheDocument();
        expect(screen.getByText("Current headline content here")).toBeInTheDocument();
    });

    it("should show initial state with length controls", () => {
        render(<FieldRegenerateModal {...mockProps} />);

        expect(screen.getByText("Ready to Generate AI Options")).toBeInTheDocument();
        expect(screen.getByText("📉 Shorter")).toBeInTheDocument();
        expect(screen.getByText("↔️ Match Length")).toBeInTheDocument();
        expect(screen.getByText("📈 Longer")).toBeInTheDocument();
        expect(screen.getByText("Generate 3 Options")).toBeInTheDocument();
    });

    it("should allow selecting length preference", () => {
        render(<FieldRegenerateModal {...mockProps} />);

        const shorterButton = screen.getByText("📉 Shorter");
        fireEvent.click(shorterButton);

        expect(shorterButton).toHaveClass("border-blue-600");
    });

    it("should call API when generate button is clicked", async () => {
        render(<FieldRegenerateModal {...mockProps} />);

        const generateButton = screen.getByText("Generate 3 Options");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/pages/registration/page-456/regenerate-field",
                expect.objectContaining({
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: expect.stringContaining('"generateMultiple":true'),
                })
            );
        });
    });

    it("should include length preference in API call", async () => {
        render(<FieldRegenerateModal {...mockProps} />);

        const longerButton = screen.getByText("📈 Longer");
        fireEvent.click(longerButton);

        const generateButton = screen.getByText("Generate 3 Options");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining('"lengthPreference":"longer"'),
                })
            );
        });
    });

    it("should show loading state during generation", async () => {
        (global.fetch as any).mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100))
        );

        render(<FieldRegenerateModal {...mockProps} />);

        const generateButton = screen.getByText("Generate 3 Options");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(
                screen.getByText("Generating 3 AI-powered options from your intake data...")
            ).toBeInTheDocument();
        });
    });

    it("should display generated options", async () => {
        render(<FieldRegenerateModal {...mockProps} />);

        const generateButton = screen.getByText("Generate 3 Options");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(screen.getByText("Regenerated option 1")).toBeInTheDocument();
            expect(screen.getByText("Regenerated option 2")).toBeInTheDocument();
            expect(screen.getByText("Regenerated option 3")).toBeInTheDocument();
        });
    });

    it("should show option labels", async () => {
        render(<FieldRegenerateModal {...mockProps} />);

        const generateButton = screen.getByText("Generate 3 Options");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(screen.getByText("Option 1 - Click to use")).toBeInTheDocument();
            expect(screen.getByText("Option 2 - Click to use")).toBeInTheDocument();
            expect(screen.getByText("Option 3 - Click to use")).toBeInTheDocument();
        });
    });

    it("should call onSelect when option is clicked", async () => {
        render(<FieldRegenerateModal {...mockProps} />);

        const generateButton = screen.getByText("Generate 3 Options");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(screen.getByText("Regenerated option 2")).toBeInTheDocument();
        });

        const option2 = screen.getByText("Regenerated option 2");
        fireEvent.click(option2);

        expect(mockProps.onSelect).toHaveBeenCalledWith("Regenerated option 2");
    });

    it("should close modal after option selection", async () => {
        vi.useFakeTimers();

        render(<FieldRegenerateModal {...mockProps} />);

        const generateButton = screen.getByText("Generate 3 Options");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(screen.getByText("Regenerated option 1")).toBeInTheDocument();
        });

        const option1 = screen.getByText("Regenerated option 1");
        fireEvent.click(option1);

        vi.advanceTimersByTime(100);

        await waitFor(() => {
            expect(mockProps.onClose).toHaveBeenCalled();
        });

        vi.useRealTimers();
    });

    it("should show regenerate button after generation", async () => {
        render(<FieldRegenerateModal {...mockProps} />);

        const generateButton = screen.getByText("Generate 3 Options");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(screen.getByText("Generate Different Options")).toBeInTheDocument();
        });
    });

    it("should handle API error", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: false,
            json: async () => ({ error: "Generation failed" }),
        });

        render(<FieldRegenerateModal {...mockProps} />);

        const generateButton = screen.getByText("Generate 3 Options");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(screen.getByText("Generation failed")).toBeInTheDocument();
        });
    });

    it("should show try again button on error", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: false,
            json: async () => ({ error: "API error" }),
        });

        render(<FieldRegenerateModal {...mockProps} />);

        const generateButton = screen.getByText("Generate 3 Options");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(screen.getByText("Try Again")).toBeInTheDocument();
        });
    });

    it("should handle network error", async () => {
        (global.fetch as any).mockRejectedValue(new Error("Network error"));

        render(<FieldRegenerateModal {...mockProps} />);

        const generateButton = screen.getByText("Generate 3 Options");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(screen.getByText("Network error")).toBeInTheDocument();
        });
    });

    it("should close modal when close button is clicked", () => {
        render(<FieldRegenerateModal {...mockProps} />);

        const closeButton = screen.getByRole("button", { name: "" });
        fireEvent.click(closeButton);

        expect(mockProps.onClose).toHaveBeenCalled();
    });

    it("should disable close button during generation", async () => {
        (global.fetch as any).mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100))
        );

        render(<FieldRegenerateModal {...mockProps} />);

        const generateButton = screen.getByText("Generate 3 Options");
        fireEvent.click(generateButton);

        await waitFor(() => {
            const closeButton = screen.getByRole("button", { name: "" });
            expect(closeButton).toBeDisabled();
        });
    });

    it("should show close button after generation", async () => {
        render(<FieldRegenerateModal {...mockProps} />);

        const generateButton = screen.getByText("Generate 3 Options");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(screen.getByText("Close")).toBeInTheDocument();
        });
    });

    it("should handle invalid response format", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ options: null }),
        });

        render(<FieldRegenerateModal {...mockProps} />);

        const generateButton = screen.getByText("Generate 3 Options");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(screen.getByText("Invalid response format")).toBeInTheDocument();
        });
    });
});
