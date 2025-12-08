/**
 * ContentGeneratorEnhanced Component Tests
 * Tests AI content generation with brand voice, story frameworks, and batch generation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ContentGeneratorEnhanced } from "@/components/marketing/content-generator-enhanced";

// Mock dependencies
vi.mock("@/components/ui/use-toast", () => ({
    useToast: () => ({
        toast: vi.fn(),
    }),
}));

vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Import mocked modules
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";

describe("ContentGeneratorEnhanced", () => {
    const mockOnContentGenerated = vi.fn();
    const defaultProps = {
        profileId: "profile-1",
        funnelProjectId: "test-funnel-123",
        onContentGenerated: mockOnContentGenerated,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it("should render correctly with form sections", () => {
        render(<ContentGeneratorEnhanced {...defaultProps} />);

        expect(screen.getByText("Generate Content")).toBeInTheDocument();
        expect(screen.getByText("Brief Details")).toBeInTheDocument();
        expect(screen.getByText("Platform Selection")).toBeInTheDocument();
        expect(screen.getByText("Story Framework")).toBeInTheDocument();
    });

    it("should allow selecting multiple platforms", () => {
        render(<ContentGeneratorEnhanced {...defaultProps} />);

        const instagramCheckbox = screen.getByLabelText("Instagram");
        const facebookCheckbox = screen.getByLabelText("Facebook");

        fireEvent.click(instagramCheckbox);
        fireEvent.click(facebookCheckbox);

        expect(instagramCheckbox).toBeChecked();
        expect(facebookCheckbox).toBeChecked();
    });

    it("should allow selecting story framework", () => {
        render(<ContentGeneratorEnhanced {...defaultProps} />);

        const frameworkSelect = screen.getByRole("combobox", {
            name: /story framework/i,
        });
        fireEvent.change(frameworkSelect, { target: { value: "founder_saga" } });

        expect(frameworkSelect).toHaveValue("founder_saga");
    });

    it("should handle brief name input", () => {
        render(<ContentGeneratorEnhanced {...defaultProps} />);

        const briefNameInput = screen.getByPlaceholderText(/e.g., Holiday Launch/i);
        fireEvent.change(briefNameInput, { target: { value: "Test Campaign" } });

        expect(briefNameInput).toHaveValue("Test Campaign");
    });

    it("should handle topic input", () => {
        render(<ContentGeneratorEnhanced {...defaultProps} />);

        const topicTextarea = screen.getByPlaceholderText(
            /Describe what you want to post about/i
        );
        fireEvent.change(topicTextarea, { target: { value: "Product launch" } });

        expect(topicTextarea).toHaveValue("Product launch");
    });

    it("should adjust variant count slider", () => {
        render(<ContentGeneratorEnhanced {...defaultProps} />);

        const slider = screen.getByRole("slider", { name: /variant count/i });
        fireEvent.change(slider, { target: { value: "5" } });

        expect(screen.getByText("5 variants per platform")).toBeInTheDocument();
    });

    it("should require brief name before generation", async () => {
        const mockToast = vi.mocked(useToast)().toast;

        render(<ContentGeneratorEnhanced {...defaultProps} />);

        const generateButton = screen.getByText("Generate Content");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Brief Name Required",
                    variant: "destructive",
                })
            );
        });
    });

    it("should require at least one platform before generation", async () => {
        const mockToast = vi.mocked(useToast)().toast;

        render(<ContentGeneratorEnhanced {...defaultProps} />);

        const briefNameInput = screen.getByPlaceholderText(/e.g., Holiday Launch/i);
        fireEvent.change(briefNameInput, { target: { value: "Test Campaign" } });

        const generateButton = screen.getByText("Generate Content");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Platform Required",
                    variant: "destructive",
                })
            );
        });
    });

    it("should handle successful content generation", async () => {
        const mockVariants = [
            {
                id: "variant-1",
                copy_text: "Generated content",
                platform: "instagram",
            },
        ];

        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, variants: mockVariants }),
        });

        const mockToast = vi.mocked(useToast)().toast;

        render(<ContentGeneratorEnhanced {...defaultProps} />);

        // Fill in required fields
        const briefNameInput = screen.getByPlaceholderText(/e.g., Holiday Launch/i);
        fireEvent.change(briefNameInput, { target: { value: "Test Campaign" } });

        const instagramCheckbox = screen.getByLabelText("Instagram");
        fireEvent.click(instagramCheckbox);

        const generateButton = screen.getByText("Generate Content");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/marketing/generate"),
                expect.objectContaining({
                    method: "POST",
                })
            );
        });

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Content Generated",
                })
            );
            expect(mockOnContentGenerated).toHaveBeenCalled();
        });
    });

    it("should show generating state during generation", async () => {
        (global.fetch as any).mockImplementation(
            () =>
                new Promise((resolve) =>
                    setTimeout(
                        () =>
                            resolve({
                                json: async () => ({
                                    success: true,
                                    variants: [],
                                }),
                            }),
                        100
                    )
                )
        );

        render(<ContentGeneratorEnhanced {...defaultProps} />);

        const briefNameInput = screen.getByPlaceholderText(/e.g., Holiday Launch/i);
        fireEvent.change(briefNameInput, { target: { value: "Test" } });

        const instagramCheckbox = screen.getByLabelText("Instagram");
        fireEvent.click(instagramCheckbox);

        const generateButton = screen.getByText("Generate Content");
        fireEvent.click(generateButton);

        expect(screen.getByText("Generating...")).toBeInTheDocument();
    });

    it("should toggle Echo Mode", () => {
        render(<ContentGeneratorEnhanced {...defaultProps} />);

        const echoModeSwitch = screen.getByRole("switch", { name: /echo mode/i });
        fireEvent.click(echoModeSwitch);

        expect(echoModeSwitch).toBeChecked();
    });

    it("should toggle advanced options", () => {
        render(<ContentGeneratorEnhanced {...defaultProps} />);

        const advancedButton = screen.getByText(/advanced options/i);
        fireEvent.click(advancedButton);

        expect(screen.getByText("Temperature")).toBeInTheDocument();
        expect(screen.getByText("Max Tokens")).toBeInTheDocument();
    });

    it("should handle generation error", async () => {
        (global.fetch as any).mockRejectedValueOnce(new Error("Generation failed"));

        const mockLogger = vi.mocked(logger);
        const mockToast = vi.mocked(useToast)().toast;

        render(<ContentGeneratorEnhanced {...defaultProps} />);

        const briefNameInput = screen.getByPlaceholderText(/e.g., Holiday Launch/i);
        fireEvent.change(briefNameInput, { target: { value: "Test" } });

        const instagramCheckbox = screen.getByLabelText("Instagram");
        fireEvent.click(instagramCheckbox);

        const generateButton = screen.getByText("Generate Content");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(mockLogger.error).toHaveBeenCalled();
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Generation Failed",
                    variant: "destructive",
                })
            );
        });
    });

    it("should allow batch generation toggle", () => {
        render(<ContentGeneratorEnhanced {...defaultProps} />);

        const batchToggle = screen.getByRole("switch", { name: /batch generation/i });
        fireEvent.click(batchToggle);

        expect(batchToggle).toBeChecked();
    });

    it("should display template selection option", () => {
        render(<ContentGeneratorEnhanced {...defaultProps} />);

        expect(screen.getByText("Use Template")).toBeInTheDocument();
    });
});
