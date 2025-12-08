/**
 * ApprovalWorkflowModal Component Tests
 * Tests approval queue view, variant review, compliance checklist, and approval actions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ApprovalWorkflowModal } from "@/components/marketing/approval-workflow-modal";

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
vi.mock("@/components/marketing/compliance-validator", () => ({
    ComplianceValidator: ({ variantId }: any) => (
        <div data-testid="compliance-validator">Compliance Validator: {variantId}</div>
    ),
}));

vi.mock("@/components/marketing/platform-preview-modal", () => ({
    PlatformPreviewModal: ({ isOpen }: any) =>
        isOpen ? <div data-testid="platform-preview">Preview Modal</div> : null,
}));

describe("ApprovalWorkflowModal", () => {
    const mockOnClose = vi.fn();
    const mockOnApprovalComplete = vi.fn();
    const defaultProps = {
        isOpen: true,
        onClose: mockOnClose,
        funnelProjectId: "test-funnel-123",
        onApprovalComplete: mockOnApprovalComplete,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it("should render correctly when open", () => {
        render(<ApprovalWorkflowModal {...defaultProps} />);
        expect(screen.getByText("Approval Workflow")).toBeInTheDocument();
        expect(
            screen.getByText("Review and approve content before publishing")
        ).toBeInTheDocument();
    });

    it("should not render when closed", () => {
        const { container } = render(
            <ApprovalWorkflowModal {...defaultProps} isOpen={false} />
        );
        expect(container.firstChild).toBeNull();
    });

    it("should load variants for approval on mount", async () => {
        const mockVariants = [
            {
                id: "variant-1",
                copy_text: "Test variant content",
                platform: "instagram",
                approval_status: "pending",
                hashtags: ["test"],
            },
        ];

        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, variants: mockVariants }),
        });

        render(<ApprovalWorkflowModal {...defaultProps} />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/marketing/variants/approval-queue")
            );
        });
    });

    it("should display empty state when no variants", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, variants: [] }),
        });

        render(<ApprovalWorkflowModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("All Caught Up!")).toBeInTheDocument();
            expect(
                screen.getByText("No variants awaiting approval")
            ).toBeInTheDocument();
        });
    });

    it("should handle approval action", async () => {
        const mockVariant = {
            id: "variant-1",
            copy_text: "Test content",
            platform: "instagram",
            approval_status: "pending",
        };

        (global.fetch as any)
            .mockResolvedValueOnce({
                json: async () => ({ success: true, variants: [mockVariant] }),
            })
            .mockResolvedValueOnce({
                json: async () => ({ success: true }),
            });

        render(<ApprovalWorkflowModal {...defaultProps} />);

        await waitFor(() => {
            const reviewButton = screen.getByText("Review");
            fireEvent.click(reviewButton);
        });

        await waitFor(() => {
            const approveButton = screen.getByText("Approve");
            expect(approveButton).toBeInTheDocument();
        });
    });

    it("should close modal when close button clicked", () => {
        render(<ApprovalWorkflowModal {...defaultProps} />);

        const closeButton = screen.getByRole("button", { name: "" });
        fireEvent.click(closeButton);

        expect(mockOnClose).toHaveBeenCalled();
    });
});
