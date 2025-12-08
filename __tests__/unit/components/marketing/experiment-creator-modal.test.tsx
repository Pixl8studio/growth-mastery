/**
 * ExperimentCreatorModal Component Tests
 * Simplified tests focusing on basic rendering
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExperimentCreatorModal } from "@/components/marketing/experiment-creator-modal";

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

describe("ExperimentCreatorModal", () => {
    const mockOnClose = vi.fn();
    const mockOnExperimentCreated = vi.fn();
    const defaultProps = {
        isOpen: false,
        onClose: mockOnClose,
        funnelProjectId: "test-funnel-123",
        onExperimentCreated: mockOnExperimentCreated,
    };

    it("should not render when closed", () => {
        const { container } = render(
            <ExperimentCreatorModal {...defaultProps} isOpen={false} />
        );

        expect(container.firstChild).toBeNull();
    });

    it("should render when open", () => {
        render(<ExperimentCreatorModal {...defaultProps} isOpen={true} />);

        expect(screen.getByText("Create A/B Test Experiment")).toBeInTheDocument();
        expect(
            screen.getByText("Test different variations to optimize performance")
        ).toBeInTheDocument();
    });

    it("should render main sections when open", () => {
        render(<ExperimentCreatorModal {...defaultProps} isOpen={true} />);

        expect(screen.getByText("Experiment Setup")).toBeInTheDocument();
        expect(screen.getByText("Test Configuration")).toBeInTheDocument();
        expect(screen.getByText("Platform & Scheduling")).toBeInTheDocument();
    });
});
