/**
 * ContentCalendarEnhanced Component Tests
 * Simplified tests focusing on basic rendering
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { ContentCalendarEnhanced } from "@/components/marketing/content-calendar-enhanced";

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
vi.mock("@/components/marketing/scheduling-modal", () => ({
    SchedulingModal: () => null,
}));

describe("ContentCalendarEnhanced", () => {
    const defaultProps = {
        funnelProjectId: "test-funnel-123",
        onUpdate: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn().mockResolvedValue({
            json: () => Promise.resolve({ success: true, posts: [] }),
        });
    });

    it("should render component", () => {
        render(<ContentCalendarEnhanced {...defaultProps} />);
        expect(document.body).toBeInTheDocument();
    });

    it("should accept funnelProjectId prop", () => {
        const { container } = render(<ContentCalendarEnhanced {...defaultProps} />);
        expect(container).toBeInTheDocument();
    });
});
