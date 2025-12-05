/**
 * ShareButton Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ShareButton } from "@/components/pages/share-button";

// Mock toast
const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
    useToast: () => ({ toast: mockToast }),
}));

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock get-public-url
vi.mock("@/lib/get-public-url", () => ({
    getPublicPageUrlClient: vi.fn((username, slug) => `https://example.com/${username}/${slug}`),
}));

describe("ShareButton", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockResolvedValue(undefined),
            },
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("should render username and slug", () => {
        render(<ShareButton username="testuser" vanitySlug="my-page" />);

        expect(screen.getByText("testuser/my-page")).toBeInTheDocument();
    });

    it("should show 'No slug set' when slug is null", () => {
        render(<ShareButton username="testuser" vanitySlug={null} />);

        expect(screen.getByText("No slug set")).toBeInTheDocument();
    });

    it("should not show copy button when no slug", () => {
        render(<ShareButton username="testuser" vanitySlug={null} />);

        const copyButtons = screen.queryAllByRole("button");
        expect(copyButtons).toHaveLength(0);
    });

    it("should copy URL to clipboard when clicked", async () => {
        render(<ShareButton username="testuser" vanitySlug="my-page" />);

        const copyButton = screen.getByRole("button");
        fireEvent.click(copyButton);

        await waitFor(() => {
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
                "https://example.com/testuser/my-page"
            );
        });
    });

    it("should show success toast after copying", async () => {
        render(<ShareButton username="testuser" vanitySlug="my-page" />);

        const copyButton = screen.getByRole("button");
        fireEvent.click(copyButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith({
                title: "URL copied!",
                description: "The page URL has been copied to your clipboard",
            });
        });
    });

    it("should show check icon temporarily after copying", async () => {
        render(<ShareButton username="testuser" vanitySlug="my-page" />);

        const copyButton = screen.getByRole("button");
        fireEvent.click(copyButton);

        await waitFor(() => {
            const checkIcon = copyButton.querySelector("svg");
            expect(checkIcon).toHaveClass("text-green-600");
        });
    });

    it("should reset icon after 2 seconds", async () => {
        render(<ShareButton username="testuser" vanitySlug="my-page" />);

        const copyButton = screen.getByRole("button");
        fireEvent.click(copyButton);

        await waitFor(() => {
            const checkIcon = copyButton.querySelector("svg");
            expect(checkIcon).toHaveClass("text-green-600");
        });

        vi.advanceTimersByTime(2000);

        await waitFor(() => {
            const copyIcon = copyButton.querySelector("svg");
            expect(copyIcon).not.toHaveClass("text-green-600");
        });
    });

    it("should handle copy error", async () => {
        (navigator.clipboard.writeText as any).mockRejectedValue(
            new Error("Copy failed")
        );

        render(<ShareButton username="testuser" vanitySlug="my-page" />);

        const copyButton = screen.getByRole("button");
        fireEvent.click(copyButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith({
                title: "Copy failed",
                description: "Failed to copy URL. Please try again.",
                variant: "destructive",
            });
        });
    });

    it("should show link icon", () => {
        render(<ShareButton username="testuser" vanitySlug="my-page" />);

        const linkIcon = document.querySelector("svg.lucide-link-2");
        expect(linkIcon).toBeInTheDocument();
    });

    it("should style as inline component", () => {
        render(<ShareButton username="testuser" vanitySlug="my-page" />);

        const container = screen.getByText("testuser/my-page").parentElement;
        expect(container).toHaveClass("rounded-lg", "border");
    });
});
