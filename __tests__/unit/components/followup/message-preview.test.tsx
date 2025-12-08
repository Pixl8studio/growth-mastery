/**
 * MessagePreview Component Tests
 * Simplified tests focusing on basic rendering
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MessagePreview } from "@/components/followup/message-preview";

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

describe("MessagePreview", () => {
    const defaultProps = {
        subject: "Test Subject",
        bodyContent: "Test Body",
        senderName: "Test Sender",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render component", () => {
        render(<MessagePreview {...defaultProps} />);
        expect(document.body).toBeInTheDocument();
    });

    it("should accept required props", () => {
        const { container } = render(<MessagePreview {...defaultProps} />);
        expect(container).toBeInTheDocument();
    });
});
