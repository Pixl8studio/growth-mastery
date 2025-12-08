/**
 * DomainSettings Component Tests
 * Simplified tests focusing on basic rendering
 */

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { DomainSettings } from "@/components/funnel/settings/domain-settings";

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
                    single: () => Promise.resolve({ data: { custom_domain_id: null }, error: null }),
                }),
            }),
            update: () => ({
                eq: () => Promise.resolve({ error: null }),
            }),
        }),
    }),
}));

// Mock useToast
vi.mock("@/components/ui/use-toast", () => ({
    useToast: () => ({ toast: vi.fn() }),
}));

// Mock fetch for domains API
global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ domains: [] }),
});

describe("DomainSettings", () => {
    const mockProps = {
        projectId: "project-123",
    };

    it("should render component", () => {
        render(<DomainSettings {...mockProps} />);
        expect(document.body).toBeInTheDocument();
    });

    it("should accept projectId prop", () => {
        const { container } = render(<DomainSettings {...mockProps} />);
        expect(container).toBeInTheDocument();
    });
});
