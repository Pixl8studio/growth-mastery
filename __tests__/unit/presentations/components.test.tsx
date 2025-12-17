/**
 * Tests for Presentation Components
 * Related: GitHub Issue #327 - Enhanced Presentation Generator
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GenerationBanner } from "@/components/presentations/generation-banner";
import { GenerationErrorDialog } from "@/components/presentations/generation-error-dialog";
import {
    SlideThumbnail,
    SlideThumbnailSkeleton,
    GeneratingSlotPlaceholder,
} from "@/components/presentations/slide-thumbnail";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
    Sparkles: () => <div data-testid="sparkles-icon" />,
    X: () => <div data-testid="x-icon" />,
    CheckCircle2: () => <div data-testid="check-icon" />,
    AlertCircle: () => <div data-testid="alert-icon" />,
    Copy: () => <div data-testid="copy-icon" />,
    Trash2: () => <div data-testid="trash-icon" />,
    Loader2: () => <div data-testid="loader-icon" />,
    ImageIcon: () => <div data-testid="image-icon" />,
    Brain: () => <div data-testid="brain-icon" />,
    RefreshCw: () => <div data-testid="refresh-icon" />,
}));

describe("GenerationBanner", () => {
    const defaultProps = {
        isGenerating: true,
        progress: 50,
        currentSlide: 3,
        totalSlides: 6,
    };

    it("should render generation progress when generating", () => {
        render(<GenerationBanner {...defaultProps} />);

        expect(screen.getByText("Generating Your Presentation")).toBeInTheDocument();
        expect(screen.getByText("Slide 3 of 6")).toBeInTheDocument();
        expect(screen.getByText("50%")).toBeInTheDocument();
    });

    it("should show completion message when progress is 100%", () => {
        render(
            <GenerationBanner
                isGenerating={false}
                progress={100}
                currentSlide={6}
                totalSlides={6}
            />
        );

        expect(screen.getByText("Generation Complete!")).toBeInTheDocument();
        expect(screen.getByText("6 slides created successfully")).toBeInTheDocument();
    });

    it("should show error message when error is present", () => {
        render(
            <GenerationBanner
                isGenerating={false}
                progress={50}
                currentSlide={3}
                totalSlides={6}
                error="Something went wrong"
            />
        );

        expect(screen.getByText("Generation Failed")).toBeInTheDocument();
        expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("should not render when not generating and progress is less than 100", () => {
        const { container } = render(
            <GenerationBanner
                isGenerating={false}
                progress={0}
                currentSlide={0}
                totalSlides={6}
            />
        );

        expect(container.firstChild).toBeNull();
    });

    it("should call onCancel when cancel button is clicked", () => {
        const onCancel = vi.fn();
        render(<GenerationBanner {...defaultProps} onCancel={onCancel} />);

        const cancelButton = screen.getByText("Cancel");
        cancelButton.click();

        expect(onCancel).toHaveBeenCalledTimes(1);
    });
});

describe("SlideThumbnail", () => {
    const defaultSlide = {
        slideNumber: 1,
        title: "Test Slide Title",
        content: ["Point 1", "Point 2", "Point 3"],
        speakerNotes: "Test notes",
        layoutType: "bullets" as const,
        section: "connect",
    };

    it("should render slide title", () => {
        render(
            <SlideThumbnail
                slide={defaultSlide}
                index={0}
                isSelected={false}
                onClick={() => {}}
            />
        );

        expect(screen.getByText("Test Slide Title")).toBeInTheDocument();
    });

    it("should show slide number", () => {
        render(
            <SlideThumbnail
                slide={defaultSlide}
                index={2}
                isSelected={false}
                onClick={() => {}}
            />
        );

        expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("should apply selected styles when isSelected is true", () => {
        const { container } = render(
            <SlideThumbnail
                slide={defaultSlide}
                index={0}
                isSelected={true}
                onClick={() => {}}
            />
        );

        const thumbnail = container.firstChild as HTMLElement;
        expect(thumbnail.className).toContain("border-primary");
    });

    it("should call onClick when clicked", () => {
        const onClick = vi.fn();
        render(
            <SlideThumbnail
                slide={defaultSlide}
                index={0}
                isSelected={false}
                onClick={onClick}
            />
        );

        const thumbnail = screen.getByText("Test Slide Title").closest("div");
        thumbnail?.click();

        expect(onClick).toHaveBeenCalled();
    });

    it("should show generating indicator when isGenerating is true", () => {
        render(
            <SlideThumbnail
                slide={defaultSlide}
                index={0}
                isSelected={false}
                isGenerating={true}
                onClick={() => {}}
            />
        );

        expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
    });
});

describe("SlideThumbnailSkeleton", () => {
    it("should render skeleton placeholder", () => {
        const { container } = render(<SlideThumbnailSkeleton />);

        expect(container.firstChild).toHaveClass("animate-pulse");
    });
});

describe("GeneratingSlotPlaceholder", () => {
    it("should render with slide number", () => {
        render(<GeneratingSlotPlaceholder slideNumber={5} />);

        expect(screen.getByText("5")).toBeInTheDocument();
        expect(screen.getByText("Generating...")).toBeInTheDocument();
    });
});

describe("GenerationErrorDialog", () => {
    const defaultProps = {
        isOpen: true,
        errorType: "general" as const,
        onRetry: vi.fn(),
        onClose: vi.fn(),
    };

    it("should not render when isOpen is false", () => {
        const { container } = render(
            <GenerationErrorDialog {...defaultProps} isOpen={false} />
        );

        expect(container.firstChild).toBeNull();
    });

    it("should render timeout message for timeout errors", () => {
        render(<GenerationErrorDialog {...defaultProps} errorType="timeout" />);

        expect(screen.getByText("Oops! AI Brain Fart")).toBeInTheDocument();
        expect(screen.getByText(/Our AI had a little brain fart/)).toBeInTheDocument();
    });

    it("should render general error message for non-timeout errors", () => {
        render(
            <GenerationErrorDialog
                {...defaultProps}
                errorType="general"
                errorMessage="Something broke"
            />
        );

        expect(screen.getByText("Something Went Wrong")).toBeInTheDocument();
        expect(screen.getByText("Something broke")).toBeInTheDocument();
    });

    it("should call onRetry when retry button is clicked", () => {
        const onRetry = vi.fn();
        render(<GenerationErrorDialog {...defaultProps} onRetry={onRetry} />);

        const retryButton = screen.getByText("Retry Generation");
        fireEvent.click(retryButton);

        expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when close button is clicked", () => {
        const onClose = vi.fn();
        render(<GenerationErrorDialog {...defaultProps} onClose={onClose} />);

        const closeButton = screen.getByText("Maybe Later");
        fireEvent.click(closeButton);

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should show brain icon in dialog", () => {
        render(<GenerationErrorDialog {...defaultProps} />);

        expect(screen.getByTestId("brain-icon")).toBeInTheDocument();
    });

    it("should show apology message", () => {
        render(<GenerationErrorDialog {...defaultProps} />);

        expect(
            screen.getByText("We apologize for the inconvenience!")
        ).toBeInTheDocument();
    });
});
