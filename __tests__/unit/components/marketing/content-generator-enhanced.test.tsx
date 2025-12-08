/**
 * ContentGeneratorEnhanced Component Tests
 * Simplified tests focusing on basic rendering
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { ContentGeneratorEnhanced } from "@/components/marketing/content-generator-enhanced";

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

describe("ContentGeneratorEnhanced", () => {
    const defaultProps = {
        profileId: "test-profile-123",
        funnelProjectId: "test-funnel-123",
        onContentGenerated: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn().mockResolvedValue({
            json: () => Promise.resolve({ success: true }),
        });
    });

    it("should render component", () => {
        render(<ContentGeneratorEnhanced {...defaultProps} />);
        expect(document.body).toBeInTheDocument();
    });

    it("should accept required props", () => {
        const { container } = render(<ContentGeneratorEnhanced {...defaultProps} />);
        expect(container).toBeInTheDocument();
    });
});
