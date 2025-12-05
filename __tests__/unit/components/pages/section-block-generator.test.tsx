/**
 * SectionBlockGenerator Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SectionBlockGenerator } from "@/components/pages/section-block-generator";

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock fetch
global.fetch = vi.fn();

describe("SectionBlockGenerator", () => {
    const mockProps = {
        isOpen: true,
        onClose: vi.fn(),
        onSectionGenerated: vi.fn(),
        projectId: "project-123",
        pageId: "page-456",
    };

    const mockGeneratedCopy = {
        headline: "Generated Headline",
        subheadline: "Generated Subheadline",
        body: "Generated body text",
        bullets: ["Bullet 1", "Bullet 2", "Bullet 3"],
        cta: "Get Started Now",
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ copy: mockGeneratedCopy }),
        });
    });

    it("should not render when closed", () => {
        render(<SectionBlockGenerator {...mockProps} isOpen={false} />);

        expect(screen.queryByText("Generate Section")).not.toBeInTheDocument();
    });

    it("should render when open", () => {
        render(<SectionBlockGenerator {...mockProps} />);

        expect(screen.getByText("Generate Section")).toBeInTheDocument();
    });

    it("should display section type options", () => {
        render(<SectionBlockGenerator {...mockProps} />);

        expect(screen.getByText("Hero Section")).toBeInTheDocument();
        expect(screen.getByText("Benefits")).toBeInTheDocument();
        expect(screen.getByText("Problem")).toBeInTheDocument();
        expect(screen.getByText("Solution")).toBeInTheDocument();
        expect(screen.getByText("Features")).toBeInTheDocument();
        expect(screen.getByText("Testimonials")).toBeInTheDocument();
        expect(screen.getByText("Call-to-Action")).toBeInTheDocument();
        expect(screen.getByText("FAQ")).toBeInTheDocument();
    });

    it("should allow selecting section type", () => {
        render(<SectionBlockGenerator {...mockProps} />);

        const heroButton = screen.getByText("Hero Section");
        fireEvent.click(heroButton);

        expect(heroButton.parentElement).toHaveClass("border-blue-600");
    });

    it("should show custom prompt textarea", () => {
        render(<SectionBlockGenerator {...mockProps} />);

        expect(
            screen.getByPlaceholderText(/Focus on healthcare professionals/)
        ).toBeInTheDocument();
    });

    it("should disable generate without section type", () => {
        render(<SectionBlockGenerator {...mockProps} />);

        const generateButton = screen.getByText("Generate Section");
        expect(generateButton).toBeDisabled();
    });

    it("should enable generate when section type selected", () => {
        render(<SectionBlockGenerator {...mockProps} />);

        const heroButton = screen.getByText("Hero Section");
        fireEvent.click(heroButton);

        const generateButton = screen.getByText("Generate Section");
        expect(generateButton).not.toBeDisabled();
    });

    it("should show error if generating without selection", () => {
        render(<SectionBlockGenerator {...mockProps} />);

        const generateButton = screen.getByText("Generate Section");
        fireEvent.click(generateButton);

        expect(screen.getByText("Please select a section type")).toBeInTheDocument();
    });

    it("should call API when generating", async () => {
        render(<SectionBlockGenerator {...mockProps} />);

        const heroButton = screen.getByText("Hero Section");
        fireEvent.click(heroButton);

        const generateButton = screen.getByText("Generate Section");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/pages/generate-section-copy",
                expect.objectContaining({
                    method: "POST",
                    body: expect.stringContaining('"sectionType":"hero"'),
                })
            );
        });
    });

    it("should include custom prompt in API call", async () => {
        render(<SectionBlockGenerator {...mockProps} />);

        const heroButton = screen.getByText("Hero Section");
        fireEvent.click(heroButton);

        const promptTextarea = screen.getByPlaceholderText(
            /Focus on healthcare professionals/
        );
        fireEvent.change(promptTextarea, {
            target: { value: "Custom instructions" },
        });

        const generateButton = screen.getByText("Generate Section");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining('"customPrompt":"Custom instructions"'),
                })
            );
        });
    });

    it("should show loading state", async () => {
        (global.fetch as any).mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100))
        );

        render(<SectionBlockGenerator {...mockProps} />);

        const heroButton = screen.getByText("Hero Section");
        fireEvent.click(heroButton);

        const generateButton = screen.getByText("Generate Section");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(screen.getByText("Generating Section...")).toBeInTheDocument();
        });
    });

    it("should display generated copy", async () => {
        render(<SectionBlockGenerator {...mockProps} />);

        const heroButton = screen.getByText("Hero Section");
        fireEvent.click(heroButton);

        const generateButton = screen.getByText("Generate Section");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(screen.getByText("Generated Headline")).toBeInTheDocument();
            expect(screen.getByText("Generated Subheadline")).toBeInTheDocument();
            expect(screen.getByText("Generated body text")).toBeInTheDocument();
        });
    });

    it("should display bullets if present", async () => {
        render(<SectionBlockGenerator {...mockProps} />);

        const heroButton = screen.getByText("Hero Section");
        fireEvent.click(heroButton);

        const generateButton = screen.getByText("Generate Section");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(screen.getByText("Bullet 1")).toBeInTheDocument();
            expect(screen.getByText("Bullet 2")).toBeInTheDocument();
            expect(screen.getByText("Bullet 3")).toBeInTheDocument();
        });
    });

    it("should show regenerate and insert buttons", async () => {
        render(<SectionBlockGenerator {...mockProps} />);

        const heroButton = screen.getByText("Hero Section");
        fireEvent.click(heroButton);

        const generateButton = screen.getByText("Generate Section");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(screen.getByText("Regenerate")).toBeInTheDocument();
            expect(screen.getByText("Insert Section")).toBeInTheDocument();
        });
    });

    it("should call onSectionGenerated when insert clicked", async () => {
        render(<SectionBlockGenerator {...mockProps} />);

        const heroButton = screen.getByText("Hero Section");
        fireEvent.click(heroButton);

        let generateButton = screen.getByText("Generate Section");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(screen.getByText("Insert Section")).toBeInTheDocument();
        });

        const insertButton = screen.getByText("Insert Section");
        fireEvent.click(insertButton);

        expect(mockProps.onSectionGenerated).toHaveBeenCalledWith(
            "hero",
            mockGeneratedCopy
        );
    });

    it("should close after inserting", async () => {
        render(<SectionBlockGenerator {...mockProps} />);

        const heroButton = screen.getByText("Hero Section");
        fireEvent.click(heroButton);

        let generateButton = screen.getByText("Generate Section");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(screen.getByText("Insert Section")).toBeInTheDocument();
        });

        const insertButton = screen.getByText("Insert Section");
        fireEvent.click(insertButton);

        expect(mockProps.onClose).toHaveBeenCalled();
    });

    it("should clear generated copy when regenerate clicked", async () => {
        render(<SectionBlockGenerator {...mockProps} />);

        const heroButton = screen.getByText("Hero Section");
        fireEvent.click(heroButton);

        let generateButton = screen.getByText("Generate Section");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(screen.getByText("Regenerate")).toBeInTheDocument();
        });

        const regenerateButton = screen.getByText("Regenerate");
        fireEvent.click(regenerateButton);

        expect(screen.queryByText("Generated Headline")).not.toBeInTheDocument();
    });

    it("should handle API error", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: false,
            json: async () => ({ error: "Generation failed" }),
        });

        render(<SectionBlockGenerator {...mockProps} />);

        const heroButton = screen.getByText("Hero Section");
        fireEvent.click(heroButton);

        const generateButton = screen.getByText("Generate Section");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(screen.getByText("Generation failed")).toBeInTheDocument();
        });
    });

    it("should close when close button clicked", () => {
        render(<SectionBlockGenerator {...mockProps} />);

        const closeButton = screen.getByRole("button", { name: "" });
        fireEvent.click(closeButton);

        expect(mockProps.onClose).toHaveBeenCalled();
    });
});
