/**
 * ApprovalWorkflowModal Component Tests
 * Tests approval queue view, variant review, compliance checklist, and approval actions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ApprovalWorkflowModal } from "@/components/marketing/approval-workflow-modal";

// Create toast mock function that will be shared
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
import { logger } from "@/lib/client-logger";

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

    it("should filter variants by platform", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, variants: [] }),
        });

        render(<ApprovalWorkflowModal {...defaultProps} />);

        // Get the first select (platform filter) by finding the one with "All Platforms" option
        const platformSelect = screen.getByDisplayValue("All Platforms").closest("select")!;
        fireEvent.change(platformSelect, { target: { value: "instagram" } });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("platform=instagram")
            );
        });
    });

    it("should filter variants by status", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, variants: [] }),
        });

        render(<ApprovalWorkflowModal {...defaultProps} />);

        // Get the second select (status filter) by finding the one with "Pending Review" option
        const statusSelect = screen.getByDisplayValue("Pending Review").closest("select")!;
        fireEvent.change(statusSelect, { target: { value: "approved" } });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("approval_status=approved")
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

    it("should require notes for rejection", async () => {
        const mockVariant = {
            id: "variant-1",
            copy_text: "Test content",
            platform: "instagram",
            approval_status: "pending",
        };

        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, variants: [mockVariant] }),
        });

        render(<ApprovalWorkflowModal {...defaultProps} />);

        // Wait for variant to load and click Review button
        await waitFor(() => {
            expect(screen.getByText("Test content")).toBeInTheDocument();
        });

        const reviewButton = screen.getByText("Review");
        fireEvent.click(reviewButton);

        // Wait for review panel to appear with Reject button
        await waitFor(() => {
            expect(screen.getByText("Reject")).toBeInTheDocument();
        });

        // Click reject without notes - should show toast
        const rejectButton = screen.getByText("Reject");
        fireEvent.click(rejectButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Notes Required",
                    variant: "destructive",
                })
            );
        });
    });

    it("should close modal when close button clicked", () => {
        render(<ApprovalWorkflowModal {...defaultProps} />);

        const closeButton = screen.getByRole("button", { name: "" });
        fireEvent.click(closeButton);

        expect(mockOnClose).toHaveBeenCalled();
    });

    it("should handle error loading variants", async () => {
        (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

        const mockLogger = vi.mocked(logger);

        render(<ApprovalWorkflowModal {...defaultProps} />);

        await waitFor(() => {
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });
});
