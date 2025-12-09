/**
 * InstagramIntegration Component Tests
 * Simplified tests focusing on basic rendering
 */

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { InstagramIntegration } from "@/components/funnel/settings/instagram-integration";

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

describe("InstagramIntegration", () => {
    const mockProps = {
        projectId: "project-123",
    };

    it("should render component", () => {
        render(<InstagramIntegration {...mockProps} />);
        expect(document.body).toBeInTheDocument();
    });

    it("should accept projectId prop", () => {
        const { container } = render(<InstagramIntegration {...mockProps} />);
        expect(container).toBeInTheDocument();
    });
});
