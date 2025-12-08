/**
 * PostVariantCardEnhanced Component Tests
 * Tests variant card with status badges, preflight indicators, and actions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PostVariantCardEnhanced } from "@/components/marketing/post-variant-card-enhanced";

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

// Mock child components
vi.mock("@/components/marketing/variant-inline-editor", () => ({
    VariantInlineEditor: ({ isOpen, onClose }: any) =>
        isOpen ? (
            <div data-testid="variant-editor">
                <button onClick={onClose}>Close Editor</button>
            </div>
        ) : null,
}));

vi.mock("@/components/marketing/platform-preview-modal", () => ({
    PlatformPreviewModal: ({ isOpen, onClose }: any) =>
        isOpen ? (
            <div data-testid="platform-preview">
                <button onClick={onClose}>Close Preview</button>
            </div>
        ) : null,
}));

describe("PostVariantCardEnhanced", () => {
    const mockOnUpdate = vi.fn();
    const mockOnSchedule = vi.fn();

    const mockVariant = {
        id: "variant-1",
        copy_text: "This is a test variant with great content",
        platform: "instagram",
        format_type: "post",
        story_framework: "founder_saga",
        approval_status: "pending",
        preflight_status: {
            passed: false,
            compliance_check: "pending",
            accessibility_check: "pending",
            brand_voice_check: "pending",
            character_limit_check: "pending",
            issues: [],
        },
        hashtags: ["marketing", "growth"],
        media_urls: ["https://example.com/image.jpg"],
        cta_config: {
            text: "Learn More",
        },
    } as any;

    const defaultProps = {
        variant: mockVariant,
        onUpdate: mockOnUpdate,
        onSchedule: mockOnSchedule,
        funnelProjectId: "test-funnel-123",
    } as any;

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
        global.confirm = vi.fn(() => true);
    });

    it("should render correctly with variant data", () => {
        render(<PostVariantCardEnhanced {...defaultProps} />);

        expect(screen.getByText(/instagram/i)).toBeInTheDocument();
        expect(
            screen.getByText("This is a test variant with great content")
        ).toBeInTheDocument();
    });

    it("should display platform badge", () => {
        render(<PostVariantCardEnhanced {...defaultProps} />);

        expect(screen.getByText(/instagram/i)).toBeInTheDocument();
    });

    it("should display format type badge", () => {
        render(<PostVariantCardEnhanced {...defaultProps} />);

        expect(screen.getByText("post")).toBeInTheDocument();
    });

    it("should display story framework badge", () => {
        render(<PostVariantCardEnhanced {...defaultProps} />);

        expect(screen.getByText(/founder saga/i)).toBeInTheDocument();
    });

    it("should display approval status badge", () => {
        render(<PostVariantCardEnhanced {...defaultProps} />);

        expect(screen.getByText("pending")).toBeInTheDocument();
    });

    it("should display preflight validation status", () => {
        render(<PostVariantCardEnhanced {...defaultProps} />);

        expect(screen.getByText("Not Validated")).toBeInTheDocument();
    });

    it("should display passed validation when preflight passes", () => {
        const passedVariant = {
            ...mockVariant,
            preflight_status: {
                passed: true,
                compliance_check: "pass",
                accessibility_check: "pass",
                brand_voice_check: "pass",
                character_limit_check: "pass",
                issues: [],
            },
        };

        render(<PostVariantCardEnhanced {...defaultProps} variant={passedVariant} />);

        expect(screen.getByText("Validated")).toBeInTheDocument();
    });

    it("should display issues count when validation fails", () => {
        const failedVariant = {
            ...mockVariant,
            preflight_status: {
                passed: false,
                compliance_check: "fail",
                accessibility_check: "pass",
                brand_voice_check: "pass",
                character_limit_check: "pass",
                issues: ["Issue 1", "Issue 2"],
            },
        };

        render(<PostVariantCardEnhanced {...defaultProps} variant={failedVariant} />);

        expect(screen.getByText("2 Issues")).toBeInTheDocument();
    });

    it("should display hashtag count", () => {
        render(<PostVariantCardEnhanced {...defaultProps} />);

        expect(screen.getByText(/2 hashtags/)).toBeInTheDocument();
    });

    it("should display media preview", () => {
        render(<PostVariantCardEnhanced {...defaultProps} />);

        const images = screen.getAllByRole("img");
        expect(images.length).toBeGreaterThan(0);
    });

    it("should handle edit button click", () => {
        render(<PostVariantCardEnhanced {...defaultProps} />);

        const editButton = screen.getByText("Edit");
        fireEvent.click(editButton);

        expect(screen.getByTestId("variant-editor")).toBeInTheDocument();
    });

    it("should handle preview button click", () => {
        render(<PostVariantCardEnhanced {...defaultProps} />);

        const previewButton = screen.getByText("Preview");
        fireEvent.click(previewButton);

        expect(screen.getByTestId("platform-preview")).toBeInTheDocument();
    });

    it("should handle schedule button click", () => {
        render(<PostVariantCardEnhanced {...defaultProps} />);

        const scheduleButton = screen.getByText("Schedule");
        fireEvent.click(scheduleButton);

        expect(mockOnSchedule).toHaveBeenCalled();
    });

    it("should open actions dropdown", () => {
        render(<PostVariantCardEnhanced {...defaultProps} />);

        const moreButton = screen.getByRole("button", { name: "" });
        fireEvent.click(moreButton);

        expect(screen.getByText("Duplicate")).toBeInTheDocument();
        expect(screen.getByText("A/B Test")).toBeInTheDocument();
        expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    it("should handle duplicate action", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true }),
        });

        render(<PostVariantCardEnhanced {...defaultProps} />);

        const moreButton = screen.getByRole("button", { name: "" });
        fireEvent.click(moreButton);

        const duplicateButton = screen.getByText("Duplicate");
        fireEvent.click(duplicateButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/marketing/variants"),
                expect.objectContaining({
                    method: "POST",
                })
            );
            expect(mockOnUpdate).toHaveBeenCalled();
        });
    });

    it("should handle delete action with confirmation", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true }),
        });

        render(<PostVariantCardEnhanced {...defaultProps} />);

        const moreButton = screen.getByRole("button", { name: "" });
        fireEvent.click(moreButton);

        const deleteButton = screen.getByText("Delete");
        fireEvent.click(deleteButton);

        expect(global.confirm).toHaveBeenCalledWith("Delete this variant?");

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/marketing/variants/variant-1"),
                expect.objectContaining({
                    method: "DELETE",
                })
            );
            expect(mockOnUpdate).toHaveBeenCalled();
        });
    });

    it("should not delete if user cancels confirmation", async () => {
        global.confirm = vi.fn(() => false);

        render(<PostVariantCardEnhanced {...defaultProps} />);

        const moreButton = screen.getByRole("button", { name: "" });
        fireEvent.click(moreButton);

        const deleteButton = screen.getByText("Delete");
        fireEvent.click(deleteButton);

        expect(global.fetch).not.toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ method: "DELETE" })
        );
    });

    it("should display multiple media items with overflow indicator", () => {
        const multiMediaVariant = {
            ...mockVariant,
            media_urls: [
                "https://example.com/1.jpg",
                "https://example.com/2.jpg",
                "https://example.com/3.jpg",
                "https://example.com/4.jpg",
            ],
        };

        render(
            <PostVariantCardEnhanced {...defaultProps} variant={multiMediaVariant} />
        );

        expect(screen.getByText("+1")).toBeInTheDocument();
    });

    it("should apply platform-specific styling", () => {
        const { container } = render(<PostVariantCardEnhanced {...defaultProps} />);

        const platformHeader = container.querySelector(".bg-gradient-to-r");
        expect(platformHeader).toBeInTheDocument();
    });
});
