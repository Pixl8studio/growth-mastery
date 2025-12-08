/**
 * VariantInlineEditor Component Tests
 * Tests comprehensive variant editing with all controls and validation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VariantInlineEditor } from "@/components/marketing/variant-inline-editor";

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
vi.mock("@/components/marketing/token-insertion-menu", () => ({
    TokenInsertionMenu: ({ onInsertToken }: any) => (
        <button onClick={() => onInsertToken("{{token}}")}>Insert Token</button>
    ),
}));

vi.mock("@/components/marketing/compliance-validator", () => ({
    ComplianceValidator: () => <div data-testid="compliance-validator">Validator</div>,
}));

vi.mock("@/components/marketing/media-library-modal", () => ({
    MediaLibraryModal: ({ isOpen, onClose, onSelectMedia }: any) =>
        isOpen ? (
            <div data-testid="media-library">
                <button onClick={() => onSelectMedia(["https://example.com/img.jpg"])}>
                    Select
                </button>
                <button onClick={onClose}>Close</button>
            </div>
        ) : null,
}));

vi.mock("@/components/marketing/platform-preview-modal", () => ({
    PlatformPreviewModal: ({ isOpen, onClose }: any) =>
        isOpen ? (
            <div data-testid="platform-preview">
                <button onClick={onClose}>Close</button>
            </div>
        ) : null,
}));

vi.mock("@/components/marketing/utm-builder", () => ({
    UTMBuilder: ({ onUrlChange }: any) => (
        <input
            data-testid="utm-builder"
            onChange={(e) => onUrlChange(e.target.value)}
        />
    ),
}));

describe("VariantInlineEditor", () => {
    const mockOnClose = vi.fn();
    const mockOnSave = vi.fn();

    const mockVariant = {
        id: "variant-1",
        copy_text: "Original post content",
        caption: "Original caption",
        hashtags: ["marketing", "growth"],
        media_urls: ["https://example.com/image.jpg"],
        alt_text: "Image description",
        platform: "instagram",
        format_type: "post",
        cta_config: {
            text: "Learn More",
            type: "bio_link",
            url: "",
        },
        link_strategy: {
            primary_url: "",
            tracking_enabled: true,
        },
        approval_status: "pending",
        approval_notes: "",
    } as any;

    const defaultProps = {
        isOpen: true,
        onClose: mockOnClose,
        variant: mockVariant,
        onSave: mockOnSave,
        funnelProjectId: "test-funnel-123",
    } as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render correctly when open", () => {
        render(<VariantInlineEditor {...defaultProps} />);

        expect(screen.getByText("Edit Variant")).toBeInTheDocument();
        expect(screen.getByText(/instagram/i)).toBeInTheDocument();
    });

    it("should not render when closed", () => {
        const { container } = render(
            <VariantInlineEditor {...defaultProps} isOpen={false} />
        );
        expect(container.firstChild).toBeNull();
    });

    it("should populate copy text field", () => {
        render(<VariantInlineEditor {...defaultProps} />);

        const copyTextarea = screen.getByPlaceholderText(/Write your post copy/);
        expect(copyTextarea).toHaveValue("Original post content");
    });

    it("should allow editing copy text", () => {
        render(<VariantInlineEditor {...defaultProps} />);

        const copyTextarea = screen.getByPlaceholderText(/Write your post copy/);
        fireEvent.change(copyTextarea, { target: { value: "Updated content" } });

        expect(copyTextarea).toHaveValue("Updated content");
    });

    it("should display character count", () => {
        render(<VariantInlineEditor {...defaultProps} />);

        expect(screen.getByText(/21 \/ 2200/)).toBeInTheDocument(); // Instagram limit
    });

    it("should warn when approaching character limit", () => {
        const longTextVariant = {
            ...mockVariant,
            copy_text: "x".repeat(2000), // 90%+ of limit
        };

        render(<VariantInlineEditor {...defaultProps} variant={longTextVariant} />);

        const charCount = screen.getByText(/2000 \/ 2200/);
        expect(charCount).toHaveClass("text-orange-600");
    });

    it("should error when exceeding character limit", () => {
        const tooLongVariant = {
            ...mockVariant,
            copy_text: "x".repeat(2300),
        };

        render(<VariantInlineEditor {...defaultProps} variant={tooLongVariant} />);

        expect(screen.getByText(/Character limit exceeded/)).toBeInTheDocument();
    });

    it("should handle token insertion", () => {
        render(<VariantInlineEditor {...defaultProps} />);

        const insertButton = screen.getByText("Insert Token");
        fireEvent.click(insertButton);

        const copyTextarea = screen.getByPlaceholderText(/Write your post copy/);
        expect(copyTextarea).toHaveValue("Original post content{{token}}");
    });

    it("should display hashtag inputs", () => {
        render(<VariantInlineEditor {...defaultProps} />);

        expect(screen.getByText("#marketing")).toBeInTheDocument();
        expect(screen.getByText("#growth")).toBeInTheDocument();
    });

    it("should allow adding hashtags", () => {
        render(<VariantInlineEditor {...defaultProps} />);

        const hashtagInput = screen.getByPlaceholderText("Add hashtag");
        fireEvent.change(hashtagInput, { target: { value: "newhashtag" } });

        const addButton = screen.getByText("Add");
        fireEvent.click(addButton);

        expect(screen.getByText("#newhashtag")).toBeInTheDocument();
    });

    it("should allow removing hashtags", () => {
        render(<VariantInlineEditor {...defaultProps} />);

        const removeButtons = screen.getAllByRole("button");
        const hashtagRemoveButton = removeButtons.find((btn) =>
            btn.parentElement?.textContent?.includes("#marketing")
        );

        if (hashtagRemoveButton) {
            fireEvent.click(hashtagRemoveButton);
        }

        expect(screen.queryByText("#marketing")).not.toBeInTheDocument();
    });

    it("should open media library", () => {
        render(<VariantInlineEditor {...defaultProps} />);

        const mediaButton = screen.getByText("Select from Media Library");
        fireEvent.click(mediaButton);

        expect(screen.getByTestId("media-library")).toBeInTheDocument();
    });

    it("should handle media selection", () => {
        render(<VariantInlineEditor {...defaultProps} />);

        const mediaButton = screen.getByText("Select from Media Library");
        fireEvent.click(mediaButton);

        const selectButton = screen.getByText("Select");
        fireEvent.click(selectButton);

        // Media should be updated
        expect(screen.queryByTestId("media-library")).not.toBeInTheDocument();
    });

    it("should display alt text input", () => {
        render(<VariantInlineEditor {...defaultProps} />);

        const altTextInput = screen.getByPlaceholderText(
            /Describe the image for screen readers/
        );
        expect(altTextInput).toHaveValue("Image description");
    });

    it("should display CTA configuration", () => {
        render(<VariantInlineEditor {...defaultProps} />);

        expect(screen.getByText("Call-to-Action")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Learn More")).toBeInTheDocument();
    });

    it("should allow changing CTA type", () => {
        render(<VariantInlineEditor {...defaultProps} />);

        const ctaTypeSelect = screen.getByRole("combobox");
        fireEvent.change(ctaTypeSelect, { target: { value: "dm_keyword" } });

        expect(screen.getByPlaceholderText(/e.g., REGISTER/)).toBeInTheDocument();
    });

    it("should display approval workflow section", () => {
        render(<VariantInlineEditor {...defaultProps} />);

        expect(screen.getByText("Approval Workflow")).toBeInTheDocument();
        expect(screen.getByText("Approval Status")).toBeInTheDocument();
    });

    it("should display compliance validator", () => {
        render(<VariantInlineEditor {...defaultProps} />);

        expect(screen.getByTestId("compliance-validator")).toBeInTheDocument();
    });

    it("should prevent save when character limit exceeded", async () => {
        const { toast } = require("@/components/ui/use-toast").useToast();

        const tooLongVariant = {
            ...mockVariant,
            copy_text: "x".repeat(2300),
        };

        render(<VariantInlineEditor {...defaultProps} variant={tooLongVariant} />);

        const saveButton = screen.getByText("Save Changes");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(toast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Character Limit Exceeded",
                    variant: "destructive",
                })
            );
        });

        expect(mockOnSave).not.toHaveBeenCalled();
    });

    it("should handle successful save", async () => {
        const { toast } = require("@/components/ui/use-toast").useToast();

        mockOnSave.mockResolvedValueOnce(undefined);

        render(<VariantInlineEditor {...defaultProps} />);

        const copyTextarea = screen.getByPlaceholderText(/Write your post copy/);
        fireEvent.change(copyTextarea, { target: { value: "Updated content" } });

        const saveButton = screen.getByText("Save Changes");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalledWith(
                expect.objectContaining({
                    copy_text: "Updated content",
                })
            );
        });

        await waitFor(() => {
            expect(toast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Changes Saved",
                })
            );
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    it("should handle save error", async () => {
        const { logger } = require("@/lib/client-logger");
        const { toast } = require("@/components/ui/use-toast").useToast();

        mockOnSave.mockRejectedValueOnce(new Error("Save failed"));

        render(<VariantInlineEditor {...defaultProps} />);

        const saveButton = screen.getByText("Save Changes");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(logger.error).toHaveBeenCalled();
            expect(toast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Save Failed",
                    variant: "destructive",
                })
            );
        });
    });

    it("should handle preview button", () => {
        render(<VariantInlineEditor {...defaultProps} />);

        const previewButton = screen.getByText("Preview");
        fireEvent.click(previewButton);

        expect(screen.getByTestId("platform-preview")).toBeInTheDocument();
    });

    it("should handle save and schedule", async () => {
        mockOnSave.mockResolvedValueOnce(undefined);

        render(<VariantInlineEditor {...defaultProps} />);

        const saveScheduleButton = screen.getByText("Save & Schedule");
        fireEvent.click(saveScheduleButton);

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalled();
        });
    });

    it("should handle save and approve", async () => {
        mockOnSave.mockResolvedValueOnce(undefined);

        render(<VariantInlineEditor {...defaultProps} />);

        const saveApproveButton = screen.getByText("Save & Approve");
        fireEvent.click(saveApproveButton);

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalledWith(
                expect.objectContaining({
                    approval_status: "approved",
                })
            );
        });
    });

    it("should close modal when cancel clicked", () => {
        render(<VariantInlineEditor {...defaultProps} />);

        const cancelButton = screen.getByText("Cancel");
        fireEvent.click(cancelButton);

        expect(mockOnClose).toHaveBeenCalled();
    });

    it("should close modal when X clicked", () => {
        render(<VariantInlineEditor {...defaultProps} />);

        const closeButton = screen
            .getAllByRole("button")
            .find((btn) => btn.querySelector("svg"));

        if (closeButton) {
            fireEvent.click(closeButton);
            expect(mockOnClose).toHaveBeenCalled();
        }
    });

    it("should display UTM builder for link tracking", () => {
        render(<VariantInlineEditor {...defaultProps} />);

        expect(screen.getByTestId("utm-builder")).toBeInTheDocument();
    });
});
