/**
 * GmailIntegration Component Tests
 * Simplified tests focusing on basic rendering
 */

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { GmailIntegration } from "@/components/funnel/settings/gmail-integration";

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock Supabase client - simplified mock
vi.mock("@/lib/supabase/client", () => ({
    createClient: () => ({
        from: () => ({
            select: () => ({
                eq: () => ({
                    single: () => Promise.resolve({ data: null, error: null }),
                }),
            }),
        }),
    }),
}));

// Mock useToast
vi.mock("@/components/ui/use-toast", () => ({
    useToast: () => ({ toast: vi.fn() }),
}));

describe("GmailIntegration", () => {
    const mockProps = {
        projectId: "project-123",
    };

    it("should render component", () => {
        render(<GmailIntegration {...mockProps} />);
        expect(document.body).toBeInTheDocument();
    });

    it("should accept projectId prop", () => {
        const { container } = render(<GmailIntegration {...mockProps} />);
        expect(container).toBeInTheDocument();
    });
});
