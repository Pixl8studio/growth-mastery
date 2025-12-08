/**
 * HorizontalMasterSteps Component Tests
 * Tests horizontal master steps navigation
 */

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { HorizontalMasterSteps } from "@/components/funnel/horizontal-master-steps";

// Mock master steps config
vi.mock("@/app/funnel-builder/master-steps-config", () => ({
    MASTER_STEPS: [
        { id: 1, name: "Business Context", description: "Setup" },
        { id: 2, name: "Define Offer", description: "Offer details" },
    ],
    getMasterStepById: vi.fn(),
}));

describe("HorizontalMasterSteps", () => {
    const mockMasterStepCompletions = [
        {
            masterStepId: 1,
            isFullyComplete: true,
            isPartiallyComplete: false,
            completedCount: 1,
            totalCount: 1,
            percentage: 100,
        },
        {
            masterStepId: 2,
            isFullyComplete: false,
            isPartiallyComplete: false,
            completedCount: 0,
            totalCount: 1,
            percentage: 0,
        },
    ];

    const defaultProps = {
        projectId: "test-project-123",
        masterStepCompletions: mockMasterStepCompletions,
        completedSubSteps: [1],
    };

    it("should render horizontal master steps", () => {
        const { container } = render(<HorizontalMasterSteps {...defaultProps} />);

        // Verify the component renders the root div
        const rootDiv = container.querySelector(".space-y-4");
        expect(rootDiv).toBeInTheDocument();
    });

    it("should render with empty completions", () => {
        const { container } = render(
            <HorizontalMasterSteps {...defaultProps} masterStepCompletions={[]} />
        );

        // Verify the component renders even with empty completions
        const rootDiv = container.querySelector(".space-y-4");
        expect(rootDiv).toBeInTheDocument();
    });
});
