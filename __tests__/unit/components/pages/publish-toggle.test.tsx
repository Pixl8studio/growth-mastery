/**
 * PublishToggle Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PublishToggle } from "@/components/pages/publish-toggle";
import { useRouter } from "next/navigation";

// Mock Next.js router
vi.mock("next/navigation", () => ({
    useRouter: vi.fn(),
}));

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock page actions
vi.mock("@/app/pages/actions", () => ({
    togglePagePublish: vi.fn(),
}));

describe("PublishToggle", () => {
    const mockRefresh = vi.fn();

    const mockPage = {
        id: "page-1",
        type: "enrollment" as const,
        headline: "Test Page",
        is_published: false,
        funnel_id: "funnel-1",
        funnel_name: "Test Funnel",
        created_at: new Date().toISOString(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (useRouter as any).mockReturnValue({
            refresh: mockRefresh,
        });
    });

    it("should render switch with current state", () => {
        render(<PublishToggle page={mockPage} />);

        const toggle = screen.getByRole("switch");
        expect(toggle).not.toBeChecked();
    });

    it("should show 'Draft' label when unpublished", () => {
        render(<PublishToggle page={mockPage} />);

        expect(screen.getByText("Draft")).toBeInTheDocument();
    });

    it("should show 'Live' label when published", () => {
        const publishedPage = { ...mockPage, is_published: true };
        render(<PublishToggle page={publishedPage} />);

        expect(screen.getByText("Live")).toBeInTheDocument();
    });

    it("should call toggle action when switch is clicked", async () => {
        const { togglePagePublish } = await import("@/app/pages/actions");
        (togglePagePublish as any).mockResolvedValue(undefined);

        render(<PublishToggle page={mockPage} />);

        const toggle = screen.getByRole("switch");
        fireEvent.click(toggle);

        await waitFor(() => {
            expect(togglePagePublish).toHaveBeenCalledWith(
                "enrollment",
                "page-1",
                true
            );
        });
    });

    it("should update UI immediately", () => {
        render(<PublishToggle page={mockPage} />);

        const toggle = screen.getByRole("switch");
        fireEvent.click(toggle);

        expect(toggle).toBeChecked();
    });

    it("should refresh router after successful toggle", async () => {
        const { togglePagePublish } = await import("@/app/pages/actions");
        (togglePagePublish as any).mockResolvedValue(undefined);

        render(<PublishToggle page={mockPage} />);

        const toggle = screen.getByRole("switch");
        fireEvent.click(toggle);

        await waitFor(() => {
            expect(mockRefresh).toHaveBeenCalled();
        });
    });

    it("should revert on error", async () => {
        const { togglePagePublish } = await import("@/app/pages/actions");
        (togglePagePublish as any).mockRejectedValue(new Error("Toggle failed"));

        global.alert = vi.fn();

        render(<PublishToggle page={mockPage} />);

        const toggle = screen.getByRole("switch");
        fireEvent.click(toggle);

        await waitFor(() => {
            expect(toggle).not.toBeChecked();
        });
    });

    it("should show alert on error", async () => {
        const { togglePagePublish } = await import("@/app/pages/actions");
        (togglePagePublish as any).mockRejectedValue(new Error("Toggle failed"));

        global.alert = vi.fn();

        render(<PublishToggle page={mockPage} />);

        const toggle = screen.getByRole("switch");
        fireEvent.click(toggle);

        await waitFor(() => {
            expect(global.alert).toHaveBeenCalledWith(
                expect.stringContaining("Failed to update")
            );
        });
    });

    it("should disable toggle during loading", async () => {
        const { togglePagePublish } = await import("@/app/pages/actions");
        (togglePagePublish as any).mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100))
        );

        render(<PublishToggle page={mockPage} />);

        const toggle = screen.getByRole("switch");
        fireEvent.click(toggle);

        expect(toggle).toBeDisabled();
    });

    it("should have accessible label for publish", () => {
        render(<PublishToggle page={mockPage} />);

        const toggle = screen.getByRole("switch");
        expect(toggle).toHaveAttribute("aria-label", "Publish page");
    });

    it("should have accessible label for unpublish", () => {
        const publishedPage = { ...mockPage, is_published: true };
        render(<PublishToggle page={publishedPage} />);

        const toggle = screen.getByRole("switch");
        expect(toggle).toHaveAttribute("aria-label", "Unpublish page");
    });
});
