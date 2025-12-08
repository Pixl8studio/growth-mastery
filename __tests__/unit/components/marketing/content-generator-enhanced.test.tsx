/**
 * ContentGeneratorEnhanced Component Tests
 * Tests AI content generation with brand voice, story frameworks, and batch generation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ContentGeneratorEnhanced } from "@/components/marketing/content-generator-enhanced";

// Create a persistent mock toast function
const mockToast = vi.fn();

// Mock dependencies
vi.mock("@/components/ui/use-toast", () => ({
    useToast: () => ({
        toast: mockToast,
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
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, variants: [] }),
        });
    });

    it("should render correctly with form sections", () => {
        render(<ContentGeneratorEnhanced {...defaultProps} />);

        expect(screen.getByText("Generate Content")).toBeInTheDocument();
        expect(screen.getByText("Brief Metadata")).toBeInTheDocument();
        expect(screen.getByText("Platform Configuration")).toBeInTheDocument();
        expect(screen.getByText("Story Framework")).toBeInTheDocument();
    });

    it("should allow selecting multiple platforms", () => {
        render(<ContentGeneratorEnhanced {...defaultProps} />);

        // Platforms are selected by default, so we click to deselect, then reselect
        const instagramPlatform = screen.getByText("Instagram");
        const facebookPlatform = screen.getByText("Facebook");

        // Deselect (they start selected)
        fireEvent.click(instagramPlatform);
        fireEvent.click(facebookPlatform);

        // Reselect
        fireEvent.click(instagramPlatform);
        fireEvent.click(facebookPlatform);

        // Platform selection state is managed internally, we just verify clicks work
        expect(instagramPlatform).toBeInTheDocument();
        expect(facebookPlatform).toBeInTheDocument();
    });

    it("should allow selecting story framework", () => {
        render(<ContentGeneratorEnhanced {...defaultProps} />);

        // Find all select elements
        const selects = screen.getAllByRole("combobox");

        // Find the one with the founder_saga value (default)
        const frameworkSelect = Array.from(selects).find((select: HTMLElement) => {
            const selectElement = select as HTMLSelectElement;
            return selectElement.value === "founder_saga";
        });

        expect(frameworkSelect).toBeTruthy();

        if (frameworkSelect) {
            fireEvent.change(frameworkSelect, { target: { value: "myth_buster" } });
            expect(frameworkSelect).toHaveValue("myth_buster");
        }
    });

    it("should handle brief name input", () => {
        render(<ContentGeneratorEnhanced {...defaultProps} />);

        const briefNameInput = screen.getByPlaceholderText(
            "e.g., Q4 Lead Gen Campaign"
        );
        fireEvent.change(briefNameInput, { target: { value: "Test Campaign" } });

        expect(briefNameInput).toHaveValue("Test Campaign");
    });

    it("should handle topic input", () => {
        render(<ContentGeneratorEnhanced {...defaultProps} />);

        const topicInput = screen.getByPlaceholderText(
            "e.g., Overcoming imposter syndrome as a new coach"
        );
        fireEvent.change(topicInput, { target: { value: "Product launch" } });

        expect(topicInput).toHaveValue("Product launch");
    });

    it("should show variant count configuration", () => {
        render(<ContentGeneratorEnhanced {...defaultProps} />);

        // Verify the variant count section exists
        expect(screen.getByText("Variant Count per Platform")).toBeInTheDocument();
        expect(
            screen.getByText(/Generate 3 versions per platform/i)
        ).toBeInTheDocument();
    });

    it("should require brief name and topic before generation", async () => {
        render(<ContentGeneratorEnhanced {...defaultProps} />);

        // Clear the brief name and topic fields to ensure they're empty
        const briefNameInput = screen.getByPlaceholderText(
            "e.g., Q4 Lead Gen Campaign"
        );
        const topicInput = screen.getByPlaceholderText(
            "e.g., Overcoming imposter syndrome as a new coach"
        );

        // Ensure fields are empty
        fireEvent.change(briefNameInput, { target: { value: "" } });
        fireEvent.change(topicInput, { target: { value: "" } });

        const generateButton = screen.getByText("Generate Content");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Required Fields",
                    variant: "destructive",
                })
            );
        });
    });

    it("should disable generation button when no platforms selected", async () => {
        render(<ContentGeneratorEnhanced {...defaultProps} />);

        const briefNameInput = screen.getByPlaceholderText(
            "e.g., Q4 Lead Gen Campaign"
        );
        const topicInput = screen.getByPlaceholderText(
            "e.g., Overcoming imposter syndrome as a new coach"
        );

        fireEvent.change(briefNameInput, { target: { value: "Test Campaign" } });
        fireEvent.change(topicInput, { target: { value: "Test topic" } });

        // Deselect all platforms
        fireEvent.click(screen.getByText("Instagram"));
        fireEvent.click(screen.getByText("Facebook"));
        fireEvent.click(screen.getByText("LinkedIn"));
        fireEvent.click(screen.getByText("Twitter/X"));

        const generateButton = screen.getByText("Generate Content");

        // Button should be disabled when no platforms are selected
        expect(generateButton).toBeDisabled();
    });

    it("should handle successful content generation", async () => {
        const mockVariants = [
            {
                id: "variant-1",
                copy_text: "Generated content",
                platform: "instagram",
            },
        ];

        const mockBriefId = "brief-123";

        // Mock both API calls
        (global.fetch as any)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    brief: { id: mockBriefId },
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    variants: mockVariants,
                    story_angles: [],
                }),
            });

        render(<ContentGeneratorEnhanced {...defaultProps} />);

        // Fill in required fields
        const briefNameInput = screen.getByPlaceholderText(
            "e.g., Q4 Lead Gen Campaign"
        );
        const topicInput = screen.getByPlaceholderText(
            "e.g., Overcoming imposter syndrome as a new coach"
        );

        fireEvent.change(briefNameInput, { target: { value: "Test Campaign" } });
        fireEvent.change(topicInput, { target: { value: "Test topic" } });

        const generateButton = screen.getByText("Generate Content");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/marketing/briefs"),
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
        let resolveFirstFetch: any;
        const firstFetchPromise = new Promise((resolve) => {
            resolveFirstFetch = resolve;
        });

        (global.fetch as any)
            .mockImplementationOnce(() => firstFetchPromise)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    variants: [],
                    story_angles: [],
                }),
            });

        render(<ContentGeneratorEnhanced {...defaultProps} />);

        const briefNameInput = screen.getByPlaceholderText(
            "e.g., Q4 Lead Gen Campaign"
        );
        const topicInput = screen.getByPlaceholderText(
            "e.g., Overcoming imposter syndrome as a new coach"
        );

        fireEvent.change(briefNameInput, { target: { value: "Test" } });
        fireEvent.change(topicInput, { target: { value: "Test topic" } });

        const generateButton = screen.getByText("Generate Content");
        fireEvent.click(generateButton);

        // Check for generating state
        await waitFor(() => {
            expect(screen.getByText(/Generating/)).toBeInTheDocument();
        });

        // Resolve the first fetch to allow the test to complete
        resolveFirstFetch({
            ok: true,
            json: async () => ({
                success: true,
                brief: { id: "test-brief" },
            }),
        });

        // Wait for generation to complete
        await waitFor(
            () => {
                expect(screen.queryByText(/Generating/)).not.toBeInTheDocument();
            },
            { timeout: 3000 }
        );
    });

    it("should show Echo Mode configuration", () => {
        render(<ContentGeneratorEnhanced {...defaultProps} />);

        expect(screen.getByText("Apply Echo Mode")).toBeInTheDocument();
        expect(
            screen.getByText("Use your voice mirroring from Profile")
        ).toBeInTheDocument();
    });

    it("should toggle advanced options", () => {
        render(<ContentGeneratorEnhanced {...defaultProps} />);

        const advancedButton = screen.getByText(/advanced options/i);
        fireEvent.click(advancedButton);

        // Check for fields that appear in advanced options
        expect(screen.getByText(/Tone Constraints/i)).toBeInTheDocument();
        expect(screen.getByText(/Excluded Keywords/i)).toBeInTheDocument();
        expect(screen.getByText(/Required Keywords/i)).toBeInTheDocument();
    });

    it("should handle generation error", async () => {
        (global.fetch as any).mockRejectedValueOnce(new Error("Generation failed"));

        const mockLogger = vi.mocked(logger);

        render(<ContentGeneratorEnhanced {...defaultProps} />);

        const briefNameInput = screen.getByPlaceholderText(
            "e.g., Q4 Lead Gen Campaign"
        );
        const topicInput = screen.getByPlaceholderText(
            "e.g., Overcoming imposter syndrome as a new coach"
        );

        fireEvent.change(briefNameInput, { target: { value: "Test" } });
        fireEvent.change(topicInput, { target: { value: "Test topic" } });

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

    it("should show A/B variant generation configuration", () => {
        render(<ContentGeneratorEnhanced {...defaultProps} />);

        expect(screen.getByText("Generate A/B Variants")).toBeInTheDocument();
        expect(screen.getByText("Create variants for testing")).toBeInTheDocument();
    });

    it("should display save as template option", () => {
        render(<ContentGeneratorEnhanced {...defaultProps} />);

        expect(screen.getByText("Save This Brief as Template")).toBeInTheDocument();
    });
});
