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
            isCompleted: true,
            completedSubSteps: [1],
            totalSubSteps: 1,
        },
        {
            masterStepId: 2,
            isCompleted: false,
            completedSubSteps: [],
            totalSubSteps: 1,
        },
    ];

    const defaultProps = {
        projectId: "test-project-123",
        masterStepCompletions: mockMasterStepCompletions,
        completedSubSteps: [1],
    };

    it("should render horizontal master steps", () => {
        render(<HorizontalMasterSteps {...defaultProps} />);

        const card = document.querySelector(".space-y-4");
        expect(card).toBeInTheDocument();
    });

    it("should render with empty completions", () => {
        render(<HorizontalMasterSteps {...defaultProps} masterStepCompletions={[]} />);

        const card = document.querySelector(".space-y-4");
        expect(card).toBeInTheDocument();
    });
});
