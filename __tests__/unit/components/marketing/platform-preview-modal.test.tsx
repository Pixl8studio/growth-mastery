/**
 * PlatformPreviewModal Component Tests
 * Tests platform-specific content previews
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlatformPreviewModal } from "@/components/marketing/platform-preview-modal";

describe("PlatformPreviewModal", () => {
    const mockOnClose = vi.fn();
    const defaultContent = {
        copy_text: "This is a test post with some great content!",
        platform: "instagram",
        hashtags: ["marketing", "growth", "business"],
        media_urls: ["https://example.com/image.jpg"],
        cta_text: "Learn More",
    };

    const defaultProps = {
        isOpen: true,
        onClose: mockOnClose,
        content: defaultContent,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render correctly when open", () => {
        render(<PlatformPreviewModal {...defaultProps} />);

        expect(screen.getByText("Preview")).toBeInTheDocument();
        expect(screen.getByText(/instagram/i)).toBeInTheDocument();
    });

    it("should not render when closed", () => {
        const { container } = render(
            <PlatformPreviewModal {...defaultProps} isOpen={false} />
        );
        expect(container.firstChild).toBeNull();
    });

    it("should display post copy text", () => {
        render(<PlatformPreviewModal {...defaultProps} />);

        expect(
            screen.getByText("This is a test post with some great content!")
        ).toBeInTheDocument();
    });

    it("should display hashtags", () => {
        render(<PlatformPreviewModal {...defaultProps} />);

        expect(screen.getByText(/#marketing/i)).toBeInTheDocument();
        expect(screen.getByText(/#growth/i)).toBeInTheDocument();
        expect(screen.getByText(/#business/i)).toBeInTheDocument();
    });

    it("should display media preview", () => {
        render(<PlatformPreviewModal {...defaultProps} />);

        const images = screen.getAllByRole("img");
        expect(images.length).toBeGreaterThan(0);
    });

    it("should display CTA when provided", () => {
        render(<PlatformPreviewModal {...defaultProps} />);

        expect(screen.getByText("Learn More")).toBeInTheDocument();
    });

    it("should render Instagram-specific preview", () => {
        render(<PlatformPreviewModal {...defaultProps} />);

        expect(screen.getByText(/instagram/i)).toBeInTheDocument();
    });

    it("should render Facebook-specific preview", () => {
        const facebookContent = {
            ...defaultContent,
            platform: "facebook",
        };

        render(<PlatformPreviewModal {...defaultProps} content={facebookContent} />);

        expect(screen.getByText(/facebook/i)).toBeInTheDocument();
    });

    it("should render LinkedIn-specific preview", () => {
        const linkedinContent = {
            ...defaultContent,
            platform: "linkedin",
        };

        render(<PlatformPreviewModal {...defaultProps} content={linkedinContent} />);

        expect(screen.getByText(/linkedin/i)).toBeInTheDocument();
    });

    it("should render Twitter-specific preview", () => {
        const twitterContent = {
            ...defaultContent,
            platform: "twitter",
            copy_text: "Short tweet content",
        };

        render(<PlatformPreviewModal {...defaultProps} content={twitterContent} />);

        expect(screen.getByText(/twitter/i)).toBeInTheDocument();
    });

    it("should handle content without media", () => {
        const noMediaContent = {
            ...defaultContent,
            media_urls: [],
        };

        render(<PlatformPreviewModal {...defaultProps} content={noMediaContent} />);

        expect(
            screen.getByText("This is a test post with some great content!")
        ).toBeInTheDocument();
    });

    it("should handle content without hashtags", () => {
        const noHashtagsContent = {
            ...defaultContent,
            hashtags: [],
        };

        render(<PlatformPreviewModal {...defaultProps} content={noHashtagsContent} />);

        expect(
            screen.getByText("This is a test post with some great content!")
        ).toBeInTheDocument();
    });

    it("should handle content without CTA", () => {
        const noCTAContent = {
            ...defaultContent,
            cta_text: undefined,
        };

        render(<PlatformPreviewModal {...defaultProps} content={noCTAContent} />);

        expect(
            screen.getByText("This is a test post with some great content!")
        ).toBeInTheDocument();
    });

    it("should close modal when close button clicked", () => {
        render(<PlatformPreviewModal {...defaultProps} />);

        const closeButton = screen.getByRole("button", { name: "" });
        fireEvent.click(closeButton);

        expect(mockOnClose).toHaveBeenCalled();
    });

    it("should close modal when clicking outside", () => {
        const { container } = render(<PlatformPreviewModal {...defaultProps} />);

        const backdrop = container.querySelector(".bg-black");
        if (backdrop) {
            fireEvent.click(backdrop);
            expect(mockOnClose).toHaveBeenCalled();
        }
    });

    it("should display character count for Twitter", () => {
        const twitterContent = {
            ...defaultContent,
            platform: "twitter",
            copy_text: "Short tweet",
        };

        render(<PlatformPreviewModal {...defaultProps} content={twitterContent} />);

        expect(screen.getByText(/11 \/ 280/)).toBeInTheDocument();
    });

    it("should truncate long copy text appropriately", () => {
        const longContent = {
            ...defaultContent,
            copy_text: "x".repeat(500),
        };

        render(<PlatformPreviewModal {...defaultProps} content={longContent} />);

        const previewText = screen.getByText(/x+/);
        expect(previewText).toBeInTheDocument();
    });

    it("should display multiple images in grid", () => {
        const multiImageContent = {
            ...defaultContent,
            media_urls: [
                "https://example.com/image1.jpg",
                "https://example.com/image2.jpg",
                "https://example.com/image3.jpg",
            ],
        };

        render(<PlatformPreviewModal {...defaultProps} content={multiImageContent} />);

        const images = screen.getAllByRole("img");
        expect(images.length).toBeGreaterThanOrEqual(3);
    });

    it("should show platform-specific UI elements", () => {
        render(<PlatformPreviewModal {...defaultProps} />);

        // Instagram should have like, comment, share icons
        expect(screen.getByTestId("platform-ui")).toBeInTheDocument();
    });

    it("should handle video media type", () => {
        const videoContent = {
            ...defaultContent,
            media_urls: ["https://example.com/video.mp4"],
        };

        render(<PlatformPreviewModal {...defaultProps} content={videoContent} />);

        expect(screen.getByTestId("video-preview")).toBeInTheDocument();
    });

    it("should display profile metadata", () => {
        render(<PlatformPreviewModal {...defaultProps} />);

        expect(screen.getByText("Your Brand")).toBeInTheDocument();
        expect(screen.getByText("Just now")).toBeInTheDocument();
    });
});
