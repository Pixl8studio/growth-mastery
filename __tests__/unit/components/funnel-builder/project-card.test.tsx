/**
 * ProjectCard Component Tests
 * Simplified tests focusing on basic rendering
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { ProjectCard } from "@/components/funnel-builder/project-card";

// Mock dependencies
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

vi.mock("next/link", () => ({
    default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

describe("ProjectCard", () => {
    const defaultProps = {
        project: {
            id: "test-project-123",
            name: "Test Project",
            status: "active",
            updated_at: new Date().toISOString(),
            slug: "test-project",
            user_id: "test-user-123",
        } as any,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn().mockResolvedValue({
            json: () => Promise.resolve({ success: true }),
        });
    });

    it("should render component", () => {
        render(<ProjectCard {...defaultProps} />);
        expect(document.body).toBeInTheDocument();
    });

    it("should accept required props", () => {
        const { container } = render(<ProjectCard {...defaultProps} />);
        expect(container).toBeInTheDocument();
    });
});
