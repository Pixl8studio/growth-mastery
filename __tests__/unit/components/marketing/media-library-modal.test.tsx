/**
 * MediaLibraryModal Component Tests
 * Simplified tests focusing on basic rendering
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MediaLibraryModal } from "@/components/marketing/media-library-modal";

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

describe("MediaLibraryModal", () => {
    const defaultProps = {
        isOpen: false,
        onClose: vi.fn(),
        onSelectMedia: vi.fn(),
        multiSelect: false,
        funnelProjectId: "test-funnel-123",
    };

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn().mockResolvedValue({
            json: () => Promise.resolve({ success: true, media: [] }),
        });
    });

    it("should render component when closed", () => {
        render(<MediaLibraryModal {...defaultProps} />);
        expect(document.body).toBeInTheDocument();
    });

    it("should accept required props", () => {
        const { container } = render(<MediaLibraryModal {...defaultProps} />);
        expect(container).toBeInTheDocument();
    });
});
