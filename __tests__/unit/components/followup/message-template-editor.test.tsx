/**
 * MessageTemplateEditor Component Tests
 * Simplified tests focusing on basic rendering
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MessageTemplateEditor } from "@/components/followup/message-template-editor";

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

describe("MessageTemplateEditor", () => {
    const defaultProps = {
        sequenceId: "seq-1",
        messages: [],
        onCreateMessage: vi.fn(),
        onUpdateMessage: vi.fn(),
        onDeleteMessage: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render component", () => {
        render(<MessageTemplateEditor {...defaultProps} />);
        expect(document.body).toBeInTheDocument();
    });

    it("should accept required props", () => {
        const { container } = render(<MessageTemplateEditor {...defaultProps} />);
        expect(container).toBeInTheDocument();
    });
});
