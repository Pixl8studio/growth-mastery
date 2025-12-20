/**
 * Tests for Presentation Components
 * Related: GitHub Issue #327 - Enhanced Presentation Generator
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GenerationBanner } from "@/components/presentations/generation-banner";
import { GenerationErrorDialog } from "@/components/presentations/generation-error-dialog";
import {
    SlideThumbnail,
    SlideThumbnailSkeleton,
    GeneratingSlotPlaceholder,
} from "@/components/presentations/slide-thumbnail";
import { SlideEditorPanel } from "@/components/presentations/slide-editor-panel";

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
    Type: () => <div data-testid="type-icon" />,
    Wand2: () => <div data-testid="wand-icon" />,
    LayoutGrid: () => <div data-testid="layout-icon" />,
    MessageSquare: () => <div data-testid="message-icon" />,
    Mic: () => <div data-testid="mic-icon" />,
    MicOff: () => <div data-testid="mic-off-icon" />,
    Maximize2: () => <div data-testid="maximize-icon" />,
    ChevronDown: () => <div data-testid="chevron-icon" />,
    Pencil: () => <div data-testid="pencil-icon" />,
    Check: () => <div data-testid="check-icon" />,
}));

// Mock client logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
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

describe("SlideEditorPanel - Speaker Notes Editing", () => {
    const defaultSlide = {
        slideNumber: 1,
        title: "Test Slide Title",
        content: ["Point 1", "Point 2"],
        speakerNotes: "Original speaker notes",
        layoutType: "bullets" as const,
        section: "connect",
    };

    const defaultProps = {
        slide: defaultSlide,
        presentationId: "test-presentation-id",
        onSlideUpdate: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("should display speaker notes in read-only mode by default", () => {
        render(<SlideEditorPanel {...defaultProps} />);

        expect(screen.getByText("Original speaker notes")).toBeInTheDocument();
        expect(
            screen.queryByRole("textbox", { name: /speaker notes/i })
        ).not.toBeInTheDocument();
    });

    it("should enter edit mode when pencil icon is clicked", async () => {
        render(<SlideEditorPanel {...defaultProps} />);

        // Use the pencil icon button specifically (exact match)
        const editButton = screen.getByRole("button", { name: "Edit speaker notes" });
        fireEvent.click(editButton);

        expect(
            screen.getByRole("textbox", { name: /speaker notes/i })
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    it("should enter edit mode when notes section is clicked", async () => {
        render(<SlideEditorPanel {...defaultProps} />);

        const notesSection = screen.getByText("Original speaker notes");
        fireEvent.click(notesSection);

        expect(
            screen.getByRole("textbox", { name: /speaker notes/i })
        ).toBeInTheDocument();
    });

    it("should populate textarea with existing notes when entering edit mode", () => {
        render(<SlideEditorPanel {...defaultProps} />);

        // Use the pencil icon button specifically (exact match)
        const editButton = screen.getByRole("button", { name: "Edit speaker notes" });
        fireEvent.click(editButton);

        const textarea = screen.getByRole("textbox", { name: /speaker notes/i });
        expect(textarea).toHaveValue("Original speaker notes");
    });

    it("should save notes and exit edit mode on Save", async () => {
        const onSlideUpdate = vi.fn();
        const updatedSlide = { ...defaultSlide, speakerNotes: "Updated notes" };

        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ slide: updatedSlide }),
        });

        render(<SlideEditorPanel {...defaultProps} onSlideUpdate={onSlideUpdate} />);

        // Enter edit mode
        const editButton = screen.getByRole("button", { name: "Edit speaker notes" });
        fireEvent.click(editButton);

        // Change the notes
        const textarea = screen.getByRole("textbox", { name: /speaker notes/i });
        fireEvent.change(textarea, { target: { value: "Updated notes" } });

        // Click save
        const saveButton = screen.getByRole("button", { name: /save/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/presentations/test-presentation-id/slides/1",
                expect.objectContaining({
                    method: "PATCH",
                    body: JSON.stringify({ speakerNotes: "Updated notes" }),
                })
            );
        });

        await waitFor(() => {
            expect(onSlideUpdate).toHaveBeenCalledWith(updatedSlide);
        });
    });

    it("should revert notes and exit edit mode on Cancel", async () => {
        render(<SlideEditorPanel {...defaultProps} />);

        // Enter edit mode
        const editButton = screen.getByRole("button", { name: "Edit speaker notes" });
        fireEvent.click(editButton);

        // Change the notes
        const textarea = screen.getByRole("textbox", { name: /speaker notes/i });
        fireEvent.change(textarea, { target: { value: "Changed notes" } });

        // Click cancel
        const cancelButton = screen.getByRole("button", { name: /cancel/i });
        fireEvent.click(cancelButton);

        // Should exit edit mode and show original notes
        expect(
            screen.queryByRole("textbox", { name: /speaker notes/i })
        ).not.toBeInTheDocument();
        expect(screen.getByText("Original speaker notes")).toBeInTheDocument();
    });

    it("should cancel edit mode on Escape key", async () => {
        render(<SlideEditorPanel {...defaultProps} />);

        // Enter edit mode
        const editButton = screen.getByRole("button", { name: "Edit speaker notes" });
        fireEvent.click(editButton);

        // Change the notes
        const textarea = screen.getByRole("textbox", { name: /speaker notes/i });
        fireEvent.change(textarea, { target: { value: "Changed notes" } });

        // Press Escape
        fireEvent.keyDown(textarea, { key: "Escape" });

        // Should exit edit mode and show original notes
        expect(
            screen.queryByRole("textbox", { name: /speaker notes/i })
        ).not.toBeInTheDocument();
        expect(screen.getByText("Original speaker notes")).toBeInTheDocument();
    });

    it("should skip API call if notes are unchanged", async () => {
        render(<SlideEditorPanel {...defaultProps} />);

        // Enter edit mode
        const editButton = screen.getByRole("button", { name: "Edit speaker notes" });
        fireEvent.click(editButton);

        // Don't change the notes, just click save
        const saveButton = screen.getByRole("button", { name: /save/i });
        fireEvent.click(saveButton);

        // API should not be called
        expect(global.fetch).not.toHaveBeenCalled();

        // Should exit edit mode
        expect(
            screen.queryByRole("textbox", { name: /speaker notes/i })
        ).not.toBeInTheDocument();
    });

    it("should show loading state while saving", async () => {
        // Create a promise that we can control
        let resolvePromise: (value: unknown) => void;
        const pendingPromise = new Promise((resolve) => {
            resolvePromise = resolve;
        });

        (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(pendingPromise);

        render(<SlideEditorPanel {...defaultProps} />);

        // Enter edit mode
        const editButton = screen.getByRole("button", { name: "Edit speaker notes" });
        fireEvent.click(editButton);

        // Change the notes
        const textarea = screen.getByRole("textbox", { name: /speaker notes/i });
        fireEvent.change(textarea, { target: { value: "Updated notes" } });

        // Click save
        const saveButton = screen.getByRole("button", { name: /save/i });
        fireEvent.click(saveButton);

        // Should show loading icon
        await waitFor(() => {
            expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
        });

        // Resolve the promise to clean up
        resolvePromise!({
            ok: true,
            json: () => Promise.resolve({ slide: defaultSlide }),
        });
    });

    it("should handle save errors gracefully and stay in edit mode", async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: false,
            json: () => Promise.resolve({ error: "Server error" }),
        });

        render(<SlideEditorPanel {...defaultProps} />);

        // Enter edit mode
        const editButton = screen.getByRole("button", { name: "Edit speaker notes" });
        fireEvent.click(editButton);

        // Change the notes
        const textarea = screen.getByRole("textbox", { name: /speaker notes/i });
        fireEvent.change(textarea, { target: { value: "Updated notes" } });

        // Click save
        const saveButton = screen.getByRole("button", { name: /save/i });
        fireEvent.click(saveButton);

        // Should show error feedback and stay in edit mode
        await waitFor(() => {
            expect(screen.getByText("Server error")).toBeInTheDocument();
        });

        // Should still be in edit mode with changes preserved
        expect(
            screen.getByRole("textbox", { name: /speaker notes/i })
        ).toBeInTheDocument();
        expect(screen.getByRole("textbox", { name: /speaker notes/i })).toHaveValue(
            "Updated notes"
        );
    });

    it("should show placeholder when no speaker notes exist", () => {
        const slideWithoutNotes = { ...defaultSlide, speakerNotes: "" };
        render(<SlideEditorPanel {...defaultProps} slide={slideWithoutNotes} />);

        expect(screen.getByText("Click to add speaker notes...")).toBeInTheDocument();
    });

    it("should have accessible edit button with aria-label", () => {
        render(<SlideEditorPanel {...defaultProps} />);

        const editButton = screen.getByRole("button", { name: "Edit speaker notes" });
        expect(editButton).toBeInTheDocument();
    });

    it("should have accessible textarea with aria-label", () => {
        render(<SlideEditorPanel {...defaultProps} />);

        const editButton = screen.getByRole("button", { name: "Edit speaker notes" });
        fireEvent.click(editButton);

        const textarea = screen.getByRole("textbox", { name: /speaker notes/i });
        expect(textarea).toBeInTheDocument();
    });

    it("should render skeleton when slide is undefined", () => {
        const { container } = render(
            <SlideEditorPanel
                {...defaultProps}
                slide={undefined as unknown as typeof defaultSlide}
            />
        );

        expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    });
});
