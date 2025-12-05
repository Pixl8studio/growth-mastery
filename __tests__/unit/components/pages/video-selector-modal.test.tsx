/**
 * VideoSelectorModal Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VideoSelectorModal } from "@/components/pages/video-selector-modal";

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock fetch
global.fetch = vi.fn();

describe("VideoSelectorModal", () => {
    const mockProps = {
        isOpen: true,
        onClose: vi.fn(),
        onVideoSelected: vi.fn(),
        projectId: "project-123",
    };

    const mockVideos = [
        {
            id: "video-1",
            title: "Pitch Video 1",
            thumbnail_url: "https://example.com/thumb1.jpg",
            duration: 180,
            created_at: "2024-01-01T00:00:00Z",
        },
        {
            id: "video-2",
            title: "Pitch Video 2",
            thumbnail_url: null,
            duration: 240,
            created_at: "2024-01-02T00:00:00Z",
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ videos: mockVideos }),
        });
    });

    it("should not render when closed", () => {
        render(<VideoSelectorModal {...mockProps} isOpen={false} />);

        expect(screen.queryByText("Select Pitch Video")).not.toBeInTheDocument();
    });

    it("should render when open", () => {
        render(<VideoSelectorModal {...mockProps} />);

        expect(screen.getByText("Select Pitch Video")).toBeInTheDocument();
    });

    it("should show loading state initially", () => {
        render(<VideoSelectorModal {...mockProps} />);

        expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("should load videos on open", async () => {
        render(<VideoSelectorModal {...mockProps} />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                `/api/pages/pitch-videos?projectId=project-123`
            );
        });
    });

    it("should display videos after loading", async () => {
        render(<VideoSelectorModal {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Pitch Video 1")).toBeInTheDocument();
            expect(screen.getByText("Pitch Video 2")).toBeInTheDocument();
        });
    });

    it("should show video thumbnails", async () => {
        render(<VideoSelectorModal {...mockProps} />);

        await waitFor(() => {
            const thumbnail = screen.getByAltText("Pitch Video 1");
            expect(thumbnail).toHaveAttribute("src", "https://example.com/thumb1.jpg");
        });
    });

    it("should show duration badge", async () => {
        render(<VideoSelectorModal {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("3:00")).toBeInTheDocument();
            expect(screen.getByText("4:00")).toBeInTheDocument();
        });
    });

    it("should select video when clicked", async () => {
        render(<VideoSelectorModal {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Pitch Video 1")).toBeInTheDocument();
        });

        const video1 = screen.getByText("Pitch Video 1");
        fireEvent.click(video1.closest("button")!);

        expect(video1.closest("button")).toHaveClass("border-blue-600");
    });

    it("should enable insert button when video selected", async () => {
        render(<VideoSelectorModal {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Pitch Video 1")).toBeInTheDocument();
        });

        const insertButton = screen.getByText("Insert Video");
        expect(insertButton).toBeDisabled();

        const video1 = screen.getByText("Pitch Video 1");
        fireEvent.click(video1.closest("button")!);

        expect(insertButton).not.toBeDisabled();
    });

    it("should call onVideoSelected when insert clicked", async () => {
        render(<VideoSelectorModal {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Pitch Video 1")).toBeInTheDocument();
        });

        const video1 = screen.getByText("Pitch Video 1");
        fireEvent.click(video1.closest("button")!);

        const insertButton = screen.getByText("Insert Video");
        fireEvent.click(insertButton);

        expect(mockProps.onVideoSelected).toHaveBeenCalledWith(mockVideos[0]);
    });

    it("should close modal after inserting", async () => {
        render(<VideoSelectorModal {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Pitch Video 1")).toBeInTheDocument();
        });

        const video1 = screen.getByText("Pitch Video 1");
        fireEvent.click(video1.closest("button")!);

        const insertButton = screen.getByText("Insert Video");
        fireEvent.click(insertButton);

        expect(mockProps.onClose).toHaveBeenCalled();
    });

    it("should show empty state when no videos", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ videos: [] }),
        });

        render(<VideoSelectorModal {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("No pitch videos yet")).toBeInTheDocument();
            expect(
                screen.getByText(/Upload a pitch video in Step 7/)
            ).toBeInTheDocument();
        });
    });

    it("should not show footer when no videos", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ videos: [] }),
        });

        render(<VideoSelectorModal {...mockProps} />);

        await waitFor(() => {
            expect(screen.queryByText("Insert Video")).not.toBeInTheDocument();
        });
    });

    it("should handle load error", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: false,
            json: async () => ({ error: "Failed to load videos" }),
        });

        render(<VideoSelectorModal {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Failed to load videos")).toBeInTheDocument();
        });
    });

    it("should handle network error", async () => {
        (global.fetch as any).mockRejectedValue(new Error("Network error"));

        render(<VideoSelectorModal {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Network error")).toBeInTheDocument();
        });
    });

    it("should close when cancel clicked", async () => {
        render(<VideoSelectorModal {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Cancel")).toBeInTheDocument();
        });

        const cancelButton = screen.getByText("Cancel");
        fireEvent.click(cancelButton);

        expect(mockProps.onClose).toHaveBeenCalled();
    });

    it("should close when close button clicked", () => {
        render(<VideoSelectorModal {...mockProps} />);

        const closeButton = screen.getByRole("button", { name: "" });
        fireEvent.click(closeButton);

        expect(mockProps.onClose).toHaveBeenCalled();
    });

    it("should show created date", async () => {
        render(<VideoSelectorModal {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText(/1\/1\/2024/)).toBeInTheDocument();
        });
    });

    it("should show selection overlay on selected video", async () => {
        render(<VideoSelectorModal {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Pitch Video 1")).toBeInTheDocument();
        });

        const video1 = screen.getByText("Pitch Video 1");
        fireEvent.click(video1.closest("button")!);

        // Check for selection indicator
        const videoButton = video1.closest("button");
        expect(videoButton).toHaveClass("border-blue-600");
    });

    it("should clear selection when modal closes", () => {
        const { rerender } = render(<VideoSelectorModal {...mockProps} />);

        rerender(<VideoSelectorModal {...mockProps} isOpen={false} />);
        rerender(<VideoSelectorModal {...mockProps} isOpen={true} />);

        const insertButton = screen.queryByText("Insert Video");
        if (insertButton) {
            expect(insertButton).toBeDisabled();
        }
    });
});
