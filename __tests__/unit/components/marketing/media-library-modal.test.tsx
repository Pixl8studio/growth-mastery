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

// Import mocked modules
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";

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
            alt_text: "image1.jpg",
            type: "image",
            created_at: "2024-01-01",
        },
        {
            id: "media-2",
            url: "https://example.com/video1.mp4",
            alt_text: "video1.mp4",
            type: "video",
            created_at: "2024-01-02",
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it("should render correctly when open", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, media: [] }),
        });

        render(<MediaLibraryModal {...defaultProps} />);

        expect(screen.getByText("Media Library")).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText("Upload")).toBeInTheDocument();
        });
    });

    it("should not render when closed", () => {
        const { container } = render(
            <MediaLibraryModal {...defaultProps} isOpen={false} />
        );
        expect(container.firstChild).toBeNull();
    });

    it("should load media items on mount", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, media: mockMedia }),
        });

        render(<MediaLibraryModal {...defaultProps} />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/marketing/media")
            );
        });

        await waitFor(() => {
            const images = screen.getAllByRole("img");
            expect(images.some((img) => img.getAttribute("alt") === "image1.jpg")).toBe(
                true
            );
        });
    });

    it.skip("should filter media by type", async () => {
        // TODO: Component does not currently have type filtering
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, media: mockMedia }),
        });

        render(<MediaLibraryModal {...defaultProps} />);

        await waitFor(() => {
            const images = screen.getAllByRole("img");
            expect(images.length).toBeGreaterThan(0);
        });
    });

    it.skip("should search media by filename", async () => {
        // TODO: Component does not currently have search functionality
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, media: mockMedia }),
        });

        render(<MediaLibraryModal {...defaultProps} />);

        await waitFor(() => {
            const images = screen.getAllByRole("img");
            expect(images.length).toBeGreaterThan(0);
        });
    });

    it("should handle single media selection", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, media: mockMedia }),
        });

        render(<MediaLibraryModal {...defaultProps} />);

        await waitFor(() => {
            const images = screen.getAllByRole("img");
            expect(images.length).toBeGreaterThan(0);
        });

        const firstImage = screen.getAllByRole("img")[0];
        fireEvent.click(firstImage);

        await waitFor(() => {
            const selectButton = screen.getByText(/Select 1 Item/);
            fireEvent.click(selectButton);
        });

        expect(mockOnSelectMedia).toHaveBeenCalledWith([mockMedia[0].url]);
    });

    it("should handle multi-select mode", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, media: mockMedia }),
        });

        render(<MediaLibraryModal {...defaultProps} multiSelect={true} />);

        await waitFor(() => {
            const mediaItems = screen.getAllByRole("img");
            expect(mediaItems.length).toBeGreaterThan(1);
        });

        const mediaItems = screen.getAllByRole("img");
        fireEvent.click(mediaItems[0]);
        fireEvent.click(mediaItems[1]);

        await waitFor(() => {
            const selectButton = screen.getByText(/Select 2 Items/);
            fireEvent.click(selectButton);
        });

        expect(mockOnSelectMedia).toHaveBeenCalledWith([
            mockMedia[0].url,
            mockMedia[1].url,
        ]);
    });

    it("should handle file upload", async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, media: [] }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    media: [{ url: "https://example.com/new.jpg" }],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    media: [{ url: "https://example.com/new.jpg" }],
                }),
            });

        render(<MediaLibraryModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.queryByText("Loading media...")).not.toBeInTheDocument();
        });

        const uploadInput = document.querySelector('input[type="file"]');
        expect(uploadInput).not.toBeNull();

        const file = new File(["content"], "test.jpg", { type: "image/jpeg" });

        Object.defineProperty(uploadInput, "files", {
            value: [file],
            writable: false,
        });

        fireEvent.change(uploadInput!);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/marketing/media",
                expect.objectContaining({
                    method: "POST",
                })
            );
        });
    });

    it.skip("should validate file size before upload", async () => {
        // TODO: Component does not currently validate file size client-side
    });

    it.skip("should validate file type before upload", async () => {
        // TODO: Component does not currently validate file type client-side (relies on accept attribute)
    });

    it("should handle media deletion", async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, media: mockMedia }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true }),
            });

        global.confirm = vi.fn(() => true);

        render(<MediaLibraryModal {...defaultProps} />);

        // Wait for images to load
        let firstImage: HTMLElement;
        await waitFor(() => {
            const images = screen.queryAllByRole("img");
            expect(images.length).toBeGreaterThan(0);
            firstImage = images[0];
        });

        // Find all trash icons in the document
        const allButtons = document.querySelectorAll("button");
        const trashButtons = Array.from(allButtons).filter((btn) => {
            const svg = btn.querySelector("svg");
            return (
                svg?.classList.contains("lucide-trash2") ||
                svg?.getAttribute("class")?.includes("lucide-trash")
            );
        });

        expect(trashButtons.length).toBeGreaterThan(0);

        if (trashButtons[0]) {
            fireEvent.click(trashButtons[0]);

            expect(global.confirm).toHaveBeenCalled();

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    expect.stringContaining("/api/marketing/media/media-1"),
                    expect.objectContaining({
                        method: "DELETE",
                    })
                );
            });
        }
    });

    it("should display empty state when no media", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, media: [] }),
        });

        render(<MediaLibraryModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("No Media Yet")).toBeInTheDocument();
            expect(
                screen.getByText("Upload images and videos to use in your posts")
            ).toBeInTheDocument();
        });
    });

    it("should close modal when close button clicked", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, media: [] }),
        });

        render(<MediaLibraryModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.queryByText("Loading media...")).not.toBeInTheDocument();
        });

        const closeButtons = screen.getAllByRole("button");
        const closeButton = closeButtons.find((btn) => {
            const svg = btn.querySelector('svg[class*="lucide-x"]');
            return svg !== null;
        });

        expect(closeButton).not.toBeUndefined();
        if (closeButton) {
            fireEvent.click(closeButton);
            expect(mockOnClose).toHaveBeenCalled();
        }
    });

    it("should handle loading error", async () => {
        (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

        const mockLogger = vi.mocked(logger);

        render(<MediaLibraryModal {...defaultProps} />);

        await waitFor(() => {
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });
});
