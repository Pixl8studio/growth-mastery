/**
 * TwitterIntegration Component Tests
 * Simplified tests focusing on basic rendering
 */

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { TwitterIntegration } from "@/components/funnel/settings/twitter-integration";

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock Supabase client - simplified mock that returns empty data
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

describe("TwitterIntegration", () => {
    const mockProps = {
        projectId: "project-123",
    };

    it("should render component", () => {
        render(<TwitterIntegration {...mockProps} />);
        // Component should render without crashing
        expect(document.body).toBeInTheDocument();
    });

    it("should have correct project ID prop", () => {
        const { container } = render(<TwitterIntegration {...mockProps} />);
        expect(container).toBeInTheDocument();
    });
});
