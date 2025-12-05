/**
 * MediaLibraryModal Component Tests
 * Tests media library with upload, selection, and organization
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MediaLibraryModal } from "@/components/marketing/media-library-modal";

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

describe("MediaLibraryModal", () => {
    const mockOnClose = vi.fn();
    const mockOnSelectMedia = vi.fn();
    const defaultProps = {
        isOpen: true,
        onClose: mockOnClose,
        onSelectMedia: mockOnSelectMedia,
        multiSelect: false,
        funnelProjectId: "test-funnel-123",
    };

    const mockMedia = [
        {
            id: "media-1",
            url: "https://example.com/image1.jpg",
            filename: "image1.jpg",
            type: "image",
            size: 1024000,
            created_at: "2024-01-01",
        },
        {
            id: "media-2",
            url: "https://example.com/video1.mp4",
            filename: "video1.mp4",
            type: "video",
            size: 5120000,
            created_at: "2024-01-02",
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it("should render correctly when open", () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, media: [] }),
        });

        render(<MediaLibraryModal {...defaultProps} />);

        expect(screen.getByText("Media Library")).toBeInTheDocument();
        expect(screen.getByText("Upload New")).toBeInTheDocument();
    });

    it("should not render when closed", () => {
        const { container } = render(
            <MediaLibraryModal {...defaultProps} isOpen={false} />
        );
        expect(container.firstChild).toBeNull();
    });

    it("should load media items on mount", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, media: mockMedia }),
        });

        render(<MediaLibraryModal {...defaultProps} />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/marketing/media")
            );
        });

        await waitFor(() => {
            expect(screen.getByText("image1.jpg")).toBeInTheDocument();
            expect(screen.getByText("video1.mp4")).toBeInTheDocument();
        });
    });

    it("should filter media by type", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, media: mockMedia }),
        });

        render(<MediaLibraryModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("image1.jpg")).toBeInTheDocument();
        });

        const imageFilter = screen.getByText("Images");
        fireEvent.click(imageFilter);

        await waitFor(() => {
            expect(screen.getByText("image1.jpg")).toBeInTheDocument();
            expect(screen.queryByText("video1.mp4")).not.toBeInTheDocument();
        });
    });

    it("should search media by filename", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, media: mockMedia }),
        });

        render(<MediaLibraryModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("image1.jpg")).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText(/search media/i);
        fireEvent.change(searchInput, { target: { value: "video" } });

        await waitFor(() => {
            expect(screen.queryByText("image1.jpg")).not.toBeInTheDocument();
            expect(screen.getByText("video1.mp4")).toBeInTheDocument();
        });
    });

    it("should handle single media selection", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, media: mockMedia }),
        });

        render(<MediaLibraryModal {...defaultProps} />);

        await waitFor(() => {
            const mediaItem = screen.getByText("image1.jpg").closest("div");
            if (mediaItem) fireEvent.click(mediaItem);
        });

        const selectButton = screen.getByText("Select");
        fireEvent.click(selectButton);

        expect(mockOnSelectMedia).toHaveBeenCalledWith([mockMedia[0].url]);
    });

    it("should handle multi-select mode", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, media: mockMedia }),
        });

        render(<MediaLibraryModal {...defaultProps} multiSelect={true} />);

        await waitFor(() => {
            const mediaItems = screen.getAllByRole("img");
            fireEvent.click(mediaItems[0]);
            fireEvent.click(mediaItems[1]);
        });

        const selectButton = screen.getByText("Select (2)");
        fireEvent.click(selectButton);

        expect(mockOnSelectMedia).toHaveBeenCalledWith([
            mockMedia[0].url,
            mockMedia[1].url,
        ]);
    });

    it("should handle file upload", async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({
                json: async () => ({ success: true, media: [] }),
            })
            .mockResolvedValueOnce({
                json: async () => ({
                    success: true,
                    media: { url: "https://example.com/new.jpg" },
                }),
            });

        render(<MediaLibraryModal {...defaultProps} />);

        const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
        const uploadInput = screen.getByLabelText(/upload/i);

        Object.defineProperty(uploadInput, "files", {
            value: [file],
        });

        fireEvent.change(uploadInput);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/marketing/media/upload"),
                expect.objectContaining({
                    method: "POST",
                })
            );
        });
    });

    it("should validate file size before upload", async () => {
        const { toast } = require("@/components/ui/use-toast").useToast();

        render(<MediaLibraryModal {...defaultProps} />);

        // Create a file larger than 10MB
        const largeFile = new File(["x".repeat(11 * 1024 * 1024)], "large.jpg", {
            type: "image/jpeg",
        });
        const uploadInput = screen.getByLabelText(/upload/i);

        Object.defineProperty(uploadInput, "files", {
            value: [largeFile],
        });

        fireEvent.change(uploadInput);

        await waitFor(() => {
            expect(toast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "File Too Large",
                    variant: "destructive",
                })
            );
        });
    });

    it("should validate file type before upload", async () => {
        const { toast } = require("@/components/ui/use-toast").useToast();

        render(<MediaLibraryModal {...defaultProps} />);

        const invalidFile = new File(["content"], "test.exe", {
            type: "application/exe",
        });
        const uploadInput = screen.getByLabelText(/upload/i);

        Object.defineProperty(uploadInput, "files", {
            value: [invalidFile],
        });

        fireEvent.change(uploadInput);

        await waitFor(() => {
            expect(toast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Invalid File Type",
                    variant: "destructive",
                })
            );
        });
    });

    it("should handle media deletion", async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({
                json: async () => ({ success: true, media: mockMedia }),
            })
            .mockResolvedValueOnce({
                json: async () => ({ success: true }),
            });

        global.confirm = vi.fn(() => true);

        render(<MediaLibraryModal {...defaultProps} />);

        await waitFor(() => {
            const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
            if (deleteButtons[0]) fireEvent.click(deleteButtons[0]);
        });

        expect(global.confirm).toHaveBeenCalled();
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/api/marketing/media/"),
            expect.objectContaining({
                method: "DELETE",
            })
        );
    });

    it("should display empty state when no media", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, media: [] }),
        });

        render(<MediaLibraryModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("No Media Files")).toBeInTheDocument();
            expect(
                screen.getByText("Upload your first media file to get started")
            ).toBeInTheDocument();
        });
    });

    it("should close modal when close button clicked", () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, media: [] }),
        });

        render(<MediaLibraryModal {...defaultProps} />);

        const closeButton = screen.getByRole("button", { name: "" });
        fireEvent.click(closeButton);

        expect(mockOnClose).toHaveBeenCalled();
    });

    it("should handle loading error", async () => {
        (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

        const { logger } = require("@/lib/client-logger");

        render(<MediaLibraryModal {...defaultProps} />);

        await waitFor(() => {
            expect(logger.error).toHaveBeenCalled();
        });
    });
});
