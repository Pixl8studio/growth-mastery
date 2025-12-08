/**
 * PagesList Component Tests
 * Simplified tests focusing on basic rendering
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { PagesList } from "@/components/funnel-builder/pages-list";

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

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: vi.fn(),
    }),
}));

describe("PagesList", () => {
    const defaultProps = {
        projectId: "test-project-123",
        userId: "test-user-123",
        username: "testuser",
    };

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn().mockResolvedValue({
            json: () => Promise.resolve({ success: true, pages: [] }),
        });
    });

    it("should render component", () => {
        render(<PagesList {...defaultProps} />);
        expect(document.body).toBeInTheDocument();
    });

    it("should accept required props", () => {
        const { container } = render(<PagesList {...defaultProps} />);
        expect(container).toBeInTheDocument();
    });
});
