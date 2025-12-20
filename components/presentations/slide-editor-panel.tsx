/**
 * SlideEditorPanel Component
 * AI-powered slide editing with quick actions and voice input
 *
 * Related: GitHub Issue #327 - Quick Actions and AI Editing
 */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
    RefreshCw,
    Type,
    Wand2,
    LayoutGrid,
    MessageSquare,
    Mic,
    MicOff,
    Loader2,
    ImageIcon,
    Maximize2,
    ChevronDown,
    CheckCircle2,
    AlertCircle,
    Pencil,
    Check,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/client-logger";
import { cn } from "@/lib/utils";
import type { SlideData } from "./slide-thumbnail";

type QuickAction =
    | "regenerate_image"
    | "make_concise"
    | "better_title"
    | "change_layout"
    | "regenerate_notes"
    | "expand_content"
    | "simplify_language";

type LayoutType = SlideData["layoutType"];

interface SlideEditorPanelProps {
    slide: SlideData;
    presentationId: string;
    onSlideUpdate: (updatedSlide: SlideData) => void;
    className?: string;
}

const LAYOUT_OPTIONS: { value: LayoutType; label: string }[] = [
    { value: "title", label: "Title Slide" },
    { value: "section", label: "Section Header" },
    { value: "bullets", label: "Bullet Points" },
    { value: "content_left", label: "Content Left" },
    { value: "content_right", label: "Content Right" },
    { value: "quote", label: "Quote" },
    { value: "statistics", label: "Statistics" },
    { value: "comparison", label: "Comparison" },
    { value: "process", label: "Process Steps" },
    { value: "cta", label: "Call to Action" },
];

export function SlideEditorPanel({
    slide,
    presentationId,
    onSlideUpdate,
    className,
}: SlideEditorPanelProps) {
    // All hooks must be called unconditionally at the top (React rules of hooks)
    const [editPrompt, setEditPrompt] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeAction, setActiveAction] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [showLayoutDropdown, setShowLayoutDropdown] = useState(false);
    const [isSpeechSupported, setIsSpeechSupported] = useState<boolean | null>(null);
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [editedNotes, setEditedNotes] = useState(slide?.speakerNotes || "");
    const [feedback, setFeedback] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);
    const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const notesTextareaRef = useRef<HTMLTextAreaElement>(null);

    // Sync edited notes when slide changes
    useEffect(() => {
        setEditedNotes(slide?.speakerNotes || "");
        setIsEditingNotes(false);
    }, [slide?.slideNumber, slide?.speakerNotes]);

    // Check for Speech Recognition support on mount
    useEffect(() => {
        const win = window as typeof window & {
            SpeechRecognition?: unknown;
            webkitSpeechRecognition?: unknown;
        };
        setIsSpeechSupported(!!win.SpeechRecognition || !!win.webkitSpeechRecognition);
    }, []);

    // Clear feedback after 3 seconds
    useEffect(() => {
        if (feedback) {
            if (feedbackTimeoutRef.current) {
                clearTimeout(feedbackTimeoutRef.current);
            }
            feedbackTimeoutRef.current = setTimeout(() => {
                setFeedback(null);
            }, 3000);
        }
        return () => {
            if (feedbackTimeoutRef.current) {
                clearTimeout(feedbackTimeoutRef.current);
            }
        };
    }, [feedback]);

    const showFeedback = useCallback((type: "success" | "error", message: string) => {
        setFeedback({ type, message });
    }, []);

    const executeQuickAction = useCallback(
        async (action: QuickAction) => {
            // Guard against undefined slide (Issue #338)
            if (!slide?.slideNumber) {
                showFeedback("error", "No slide selected");
                return;
            }

            setIsProcessing(true);
            setActiveAction(action);

            try {
                const response = await fetch(
                    `/api/presentations/${presentationId}/slides/${slide.slideNumber}`,
                    {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ action }),
                    }
                );

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || "Action failed");
                }

                const result = await response.json();
                onSlideUpdate(result.slide);
                showFeedback("success", `${action.replace(/_/g, " ")} applied`);

                logger.info(
                    { action, slideNumber: slide.slideNumber },
                    "Quick action executed"
                );
            } catch (error) {
                logger.error({ error, action }, "Quick action failed");
                showFeedback(
                    "error",
                    error instanceof Error ? error.message : "Action failed"
                );
            } finally {
                setIsProcessing(false);
                setActiveAction(null);
            }
        },
        [presentationId, slide?.slideNumber, onSlideUpdate, showFeedback]
    );

    const executeCustomEdit = useCallback(async () => {
        if (!editPrompt.trim()) return;

        // Guard against undefined slide (Issue #338)
        if (!slide?.slideNumber) {
            showFeedback("error", "No slide selected");
            return;
        }

        setIsProcessing(true);
        setActiveAction("custom");

        try {
            const response = await fetch(
                `/api/presentations/${presentationId}/slides/${slide.slideNumber}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ customPrompt: editPrompt }),
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Edit failed");
            }

            const result = await response.json();
            onSlideUpdate(result.slide);
            setEditPrompt("");
            showFeedback("success", "Changes applied");

            logger.info({ slideNumber: slide.slideNumber }, "Custom AI edit executed");
        } catch (error) {
            logger.error({ error }, "Custom edit failed");
            showFeedback(
                "error",
                error instanceof Error ? error.message : "Edit failed"
            );
        } finally {
            setIsProcessing(false);
            setActiveAction(null);
        }
    }, [presentationId, slide?.slideNumber, editPrompt, onSlideUpdate, showFeedback]);

    const changeLayout = useCallback(
        async (layoutType: LayoutType) => {
            setShowLayoutDropdown(false);

            // Guard against undefined slide (Issue #338)
            if (!slide?.slideNumber) {
                showFeedback("error", "No slide selected");
                return;
            }

            setIsProcessing(true);
            setActiveAction("layout");

            try {
                const response = await fetch(
                    `/api/presentations/${presentationId}/slides/${slide.slideNumber}`,
                    {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ layoutType }),
                    }
                );

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || "Layout change failed");
                }

                const result = await response.json();
                onSlideUpdate(result.slide);
                showFeedback("success", "Layout changed");

                logger.info(
                    { layoutType, slideNumber: slide.slideNumber },
                    "Layout changed"
                );
            } catch (error) {
                logger.error({ error }, "Layout change failed");
                showFeedback(
                    "error",
                    error instanceof Error ? error.message : "Layout change failed"
                );
            } finally {
                setIsProcessing(false);
                setActiveAction(null);
            }
        },
        [presentationId, slide?.slideNumber, onSlideUpdate, showFeedback]
    );

    const generateImage = useCallback(async () => {
        // Guard against undefined slide (Issue #338)
        if (!slide?.slideNumber) {
            showFeedback("error", "No slide selected");
            return;
        }

        setIsProcessing(true);
        setActiveAction("image");

        try {
            const response = await fetch(
                `/api/presentations/${presentationId}/slides/${slide.slideNumber}/image`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Image generation failed");
            }

            const result = await response.json();
            onSlideUpdate({
                ...slide,
                imageUrl: result.imageUrl,
            });
            showFeedback("success", "Image generated");

            logger.info({ slideNumber: slide.slideNumber }, "AI image generated");
        } catch (error) {
            logger.error({ error }, "Image generation failed");
            showFeedback(
                "error",
                error instanceof Error ? error.message : "Image generation failed"
            );
        } finally {
            setIsProcessing(false);
            setActiveAction(null);
        }
    }, [presentationId, slide?.slideNumber, slide, onSlideUpdate, showFeedback]);

    const saveSpeakerNotes = useCallback(async () => {
        if (!slide?.slideNumber) {
            showFeedback("error", "No slide selected");
            return;
        }

        // Skip if notes haven't changed
        if (editedNotes === (slide.speakerNotes || "")) {
            setIsEditingNotes(false);
            return;
        }

        setIsProcessing(true);
        setActiveAction("notes");

        try {
            const response = await fetch(
                `/api/presentations/${presentationId}/slides/${slide.slideNumber}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ speakerNotes: editedNotes }),
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to save notes");
            }

            const result = await response.json();
            onSlideUpdate(result.slide);
            setIsEditingNotes(false);
            showFeedback("success", "Notes saved");

            logger.info({ slideNumber: slide.slideNumber }, "Speaker notes saved");
        } catch (error) {
            logger.error({ error }, "Failed to save speaker notes");
            showFeedback(
                "error",
                error instanceof Error ? error.message : "Failed to save notes"
            );
        } finally {
            setIsProcessing(false);
            setActiveAction(null);
        }
    }, [
        presentationId,
        slide?.slideNumber,
        slide?.speakerNotes,
        editedNotes,
        onSlideUpdate,
        showFeedback,
    ]);

    const cancelNotesEdit = useCallback(() => {
        setEditedNotes(slide?.speakerNotes || "");
        setIsEditingNotes(false);
    }, [slide?.speakerNotes]);

    const startEditingNotes = useCallback(() => {
        setIsEditingNotes(true);
        // Focus the textarea after React updates the DOM
        setTimeout(() => {
            notesTextareaRef.current?.focus();
        }, 0);
    }, []);

    // Voice-to-text functionality
    const toggleVoiceInput = useCallback(() => {
        // Use type assertion for browser Speech Recognition API
        const win = window as typeof window & {
            SpeechRecognition?: new () => SpeechRecognitionInstance;
            webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
        };

        const SpeechRecognitionAPI =
            win.SpeechRecognition || win.webkitSpeechRecognition;

        if (!SpeechRecognitionAPI) {
            showFeedback("error", "Speech recognition not supported in this browser");
            return;
        }

        // Always clean up any existing instance first to prevent memory leaks
        // This handles rapid toggles where previous instance might still be active
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch {
                // Ignore errors from stopping already stopped recognition
            }
            recognitionRef.current = null;
        }

        if (isRecording) {
            setIsRecording(false);
            return;
        }

        const recognition = new SpeechRecognitionAPI();

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: SpeechResultEvent) => {
            const results = event.results;
            let transcript = "";
            for (let i = 0; i < results.length; i++) {
                const result = results[i];
                if (result && result[0]) {
                    transcript += result[0].transcript + " ";
                }
            }
            setEditPrompt(transcript.trim());
        };

        recognition.onerror = (event: SpeechErrorEvent) => {
            logger.error({ error: event.error }, "Speech recognition error");
            showFeedback("error", "Voice input failed");
            setIsRecording(false);
        };

        recognition.onend = () => {
            setIsRecording(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsRecording(true);
    }, [isRecording, showFeedback]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            recognitionRef.current?.stop();
        };
    }, []);

    // Guard against undefined slide - show loading skeleton
    if (!slide) {
        return (
            <div className={cn("space-y-6", className)}>
                <div className="animate-pulse space-y-4">
                    <div className="h-6 w-32 rounded bg-muted" />
                    <div className="grid grid-cols-2 gap-2">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="h-9 rounded bg-muted" />
                        ))}
                    </div>
                    <div className="h-6 w-24 rounded bg-muted" />
                    <div className="h-24 rounded bg-muted" />
                </div>
            </div>
        );
    }

    return (
        <div className={cn("space-y-6", className)}>
            {/* Feedback toast */}
            {feedback && (
                <div
                    className={cn(
                        "flex items-center gap-2 rounded-lg p-3 text-sm",
                        feedback.type === "success"
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                    )}
                >
                    {feedback.type === "success" ? (
                        <CheckCircle2 className="h-4 w-4" />
                    ) : (
                        <AlertCircle className="h-4 w-4" />
                    )}
                    {feedback.message}
                </div>
            )}

            {/* Quick Actions */}
            <div>
                <h3 className="mb-3 text-sm font-semibold">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="justify-start"
                        onClick={() => generateImage()}
                        disabled={isProcessing}
                    >
                        {activeAction === "image" ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        New Image
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="justify-start"
                        onClick={() => executeQuickAction("make_concise")}
                        disabled={isProcessing}
                    >
                        {activeAction === "make_concise" ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Type className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Make Concise
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="justify-start"
                        onClick={() => executeQuickAction("better_title")}
                        disabled={isProcessing}
                    >
                        {activeAction === "better_title" ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Better Title
                    </Button>

                    {/* Layout dropdown */}
                    <div className="relative">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => setShowLayoutDropdown(!showLayoutDropdown)}
                            disabled={isProcessing}
                        >
                            {activeAction === "layout" ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Layout
                            <ChevronDown className="ml-auto h-3.5 w-3.5" />
                        </Button>

                        {showLayoutDropdown && (
                            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border bg-white shadow-lg">
                                {LAYOUT_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        className={cn(
                                            "block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                                            slide.layoutType === option.value &&
                                                "bg-primary/5 text-primary"
                                        )}
                                        onClick={() => changeLayout(option.value)}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        className="justify-start"
                        onClick={() => executeQuickAction("expand_content")}
                        disabled={isProcessing}
                    >
                        {activeAction === "expand_content" ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Expand
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="justify-start"
                        onClick={() => executeQuickAction("regenerate_notes")}
                        disabled={isProcessing}
                    >
                        {activeAction === "regenerate_notes" ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        New Notes
                    </Button>
                </div>
            </div>

            {/* Custom AI Edit */}
            <div>
                <h3 className="mb-3 text-sm font-semibold">Edit with AI</h3>
                <div className="space-y-3">
                    <div className="relative">
                        <textarea
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            placeholder="Describe how you want to change this slide..."
                            className={cn(
                                "h-24 w-full resize-none rounded-lg border bg-background p-3 pr-10 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
                                isRecording && "border-red-500 ring-1 ring-red-500"
                            )}
                            disabled={isProcessing}
                        />
                        {/* Voice input button with browser support indicator */}
                        <button
                            className={cn(
                                "absolute bottom-3 right-3 rounded-full p-1.5 transition-colors",
                                isRecording
                                    ? "bg-red-500 text-white animate-pulse"
                                    : isSpeechSupported === false
                                      ? "text-muted-foreground/40 cursor-not-allowed"
                                      : "hover:bg-muted text-muted-foreground"
                            )}
                            onClick={toggleVoiceInput}
                            disabled={isProcessing || isSpeechSupported === false}
                            title={
                                isSpeechSupported === false
                                    ? "Voice input not supported in this browser (try Chrome or Edge)"
                                    : isRecording
                                      ? "Stop recording"
                                      : "Voice input"
                            }
                        >
                            {isRecording ? (
                                <MicOff className="h-4 w-4" />
                            ) : (
                                <Mic className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                    <Button
                        size="sm"
                        className="w-full"
                        onClick={executeCustomEdit}
                        disabled={!editPrompt.trim() || isProcessing}
                    >
                        {activeAction === "custom" ? (
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                            <MessageSquare className="mr-1.5 h-4 w-4" />
                        )}
                        Apply Changes
                    </Button>
                </div>
            </div>

            {/* Speaker Notes */}
            <div>
                <div className="mb-3 flex items-center justify-between">
                    <h3 id="speaker-notes-label" className="text-sm font-semibold">
                        Speaker Notes
                    </h3>
                    {!isEditingNotes && (
                        <button
                            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            onClick={startEditingNotes}
                            aria-label="Edit speaker notes"
                            disabled={isProcessing}
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
                {isEditingNotes ? (
                    <div className="space-y-2">
                        <textarea
                            ref={notesTextareaRef}
                            value={editedNotes}
                            onChange={(e) => setEditedNotes(e.target.value)}
                            placeholder="Add speaker notes for this slide..."
                            className="h-32 w-full resize-none rounded-lg border bg-background p-3 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            disabled={isProcessing}
                            aria-label="Speaker notes"
                            aria-describedby="speaker-notes-help"
                            onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                    cancelNotesEdit();
                                }
                            }}
                        />
                        <span id="speaker-notes-help" className="sr-only">
                            Press Escape to cancel editing
                        </span>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                className="flex-1"
                                onClick={saveSpeakerNotes}
                                disabled={isProcessing}
                            >
                                {activeAction === "notes" ? (
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Check className="mr-1.5 h-3.5 w-3.5" />
                                )}
                                Save
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelNotesEdit}
                                disabled={isProcessing}
                            >
                                <X className="mr-1.5 h-3.5 w-3.5" />
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div
                        className="cursor-pointer rounded-lg border bg-muted/30 p-3 transition-colors hover:border-primary/50 hover:bg-muted/50"
                        onClick={startEditingNotes}
                        role="button"
                        tabIndex={0}
                        aria-label="Click to edit speaker notes"
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                startEditingNotes();
                            }
                        }}
                    >
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {slide.speakerNotes || "Click to add speaker notes..."}
                        </p>
                    </div>
                )}
            </div>

            {/* Slide Info */}
            <div>
                <h3 className="mb-3 text-sm font-semibold">Slide Info</h3>
                <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                        <span className="text-muted-foreground">Layout</span>
                        <span className="font-medium capitalize">
                            {slide.layoutType.replace(/_/g, " ")}
                        </span>
                    </div>
                    {slide.section && (
                        <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                            <span className="text-muted-foreground">Section</span>
                            <span className="font-medium capitalize">
                                {slide.section}
                            </span>
                        </div>
                    )}
                    {/* Only show image status for layouts that support images:
                        - content_left and content_right always have image slots
                        - bullets can have images if imagePrompt exists */}
                    {(slide.layoutType === "content_left" ||
                        slide.layoutType === "content_right" ||
                        (slide.layoutType === "bullets" && slide.imagePrompt)) && (
                        <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                            <span className="text-muted-foreground">Image</span>
                            {slide.imageUrl ? (
                                <span className="font-medium text-green-600">
                                    Generated
                                </span>
                            ) : (
                                <span className="font-medium text-amber-600">
                                    Ready to generate
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// TypeScript declarations for Speech Recognition API
interface SpeechRecognitionInstance {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechResultEvent) => void) | null;
    onerror: ((event: SpeechErrorEvent) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
}

interface SpeechResultEvent {
    results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
    length: number;
    [index: number]: SpeechRecognitionResult | undefined;
}

interface SpeechRecognitionResult {
    [index: number]: SpeechRecognitionAlternative | undefined;
    isFinal: boolean;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechErrorEvent {
    error: string;
}
