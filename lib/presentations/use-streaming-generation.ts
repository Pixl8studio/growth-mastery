/**
 * useStreamingGeneration Hook
 * Handles real-time slide generation via Server-Sent Events (SSE)
 *
 * Related: GitHub Issue #327 - Real-time Streaming Editor
 */

import { useState, useCallback, useRef } from "react";
import { logger } from "@/lib/client-logger";

export interface GeneratedSlide {
    slideNumber: number;
    title: string;
    content: string[];
    speakerNotes?: string;
    imagePrompt?: string;
    imageUrl?: string;
    imageGeneratedAt?: string;
    layoutType:
        | "title"
        | "section"
        | "content_left"
        | "content_right"
        | "bullets"
        | "quote"
        | "statistics"
        | "comparison"
        | "process"
        | "cta";
    section?: string;
}

export interface PresentationCustomization {
    textDensity: "minimal" | "balanced" | "detailed";
    visualStyle: "professional" | "creative" | "minimal" | "bold";
    emphasisPreference: "text" | "visuals" | "balanced";
    animationLevel: "none" | "subtle" | "moderate" | "dynamic";
    imageStyle: "photography" | "illustration" | "abstract" | "icons";
}

export interface StreamingGenerationState {
    isGenerating: boolean;
    progress: number;
    currentSlide: number;
    totalSlides: number;
    slides: GeneratedSlide[];
    presentationId: string | null;
    error: string | null;
}

interface StreamingGenerationOptions {
    projectId: string;
    deckStructureId: string;
    customization: PresentationCustomization;
    /** Optional: existing presentation ID for resume mode */
    resumePresentationId?: string;
    /** Optional: start from this slide number (1-indexed) for resume mode */
    resumeFromSlide?: number;
    /** Optional: existing slides to preserve during resume */
    existingSlides?: GeneratedSlide[];
    onSlideGenerated?: (slide: GeneratedSlide, progress: number) => void;
    onComplete?: (presentationId: string, slides: GeneratedSlide[]) => void;
    onError?: (error: string, isTimeout: boolean) => void;
}

export function useStreamingGeneration() {
    const [state, setState] = useState<StreamingGenerationState>({
        isGenerating: false,
        progress: 0,
        currentSlide: 0,
        totalSlides: 0,
        slides: [],
        presentationId: null,
        error: null,
    });

    const eventSourceRef = useRef<EventSource | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isClosingRef = useRef<boolean>(false);

    // Consolidated cleanup function to prevent double-close and memory leaks
    const closeConnection = useCallback(() => {
        // Guard against multiple simultaneous close attempts
        if (isClosingRef.current) {
            return;
        }
        isClosingRef.current = true;

        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        // Reset the closing flag after cleanup
        isClosingRef.current = false;
    }, []);

    // Track if generation is in progress to prevent multiple simultaneous calls
    const isGeneratingRef = useRef<boolean>(false);

    const stopGeneration = useCallback(() => {
        isGeneratingRef.current = false;
        closeConnection();
        setState((prev) => ({ ...prev, isGenerating: false }));
    }, [closeConnection]);

    const startGeneration = useCallback(
        async (options: StreamingGenerationOptions) => {
            // CRITICAL: Prevent multiple simultaneous generations (Issue #345)
            // This guards against stale closures and rapid re-calls creating duplicate presentations
            if (isGeneratingRef.current) {
                logger.warn(
                    {},
                    "Generation already in progress, ignoring duplicate request"
                );
                return;
            }
            isGeneratingRef.current = true;

            const {
                projectId,
                deckStructureId,
                customization,
                resumePresentationId,
                resumeFromSlide,
                existingSlides = [],
                onSlideGenerated,
                onComplete,
                onError,
            } = options;

            const isResuming = !!resumePresentationId && !!resumeFromSlide;

            // Reset state - preserve existing slides if resuming
            setState({
                isGenerating: true,
                progress: isResuming
                    ? Math.round((existingSlides.length / 60) * 100)
                    : 0,
                currentSlide: isResuming ? existingSlides.length : 0,
                totalSlides: 0,
                slides: isResuming ? existingSlides : [],
                presentationId: resumePresentationId || null,
                error: null,
            });

            // Build SSE URL with optional resume parameters
            const params = new URLSearchParams({
                projectId,
                deckStructureId,
                customization: JSON.stringify(customization),
            });

            // Add resume parameters if resuming
            if (isResuming) {
                params.set("resumePresentationId", resumePresentationId);
                params.set("resumeFromSlide", resumeFromSlide.toString());
            }

            const url = `/api/presentations/generate/stream?${params.toString()}`;

            try {
                const eventSource = new EventSource(url);
                eventSourceRef.current = eventSource;

                eventSource.addEventListener("connected", (event) => {
                    const data = JSON.parse(event.data);
                    setState((prev) => ({
                        ...prev,
                        presentationId: data.presentationId,
                        totalSlides: data.totalSlides,
                    }));
                    logger.info(
                        {
                            presentationId: data.presentationId,
                            totalSlides: data.totalSlides,
                        },
                        "SSE connected for presentation generation"
                    );
                });

                eventSource.addEventListener("slide_generated", (event) => {
                    const data = JSON.parse(event.data);
                    const slide = data.slide as GeneratedSlide;
                    const progress = data.progress as number;

                    // Guard against undefined or invalid slides (Issue #331)
                    if (!slide || typeof slide.slideNumber !== "number") {
                        logger.warn({ data }, "Received invalid slide data from SSE");
                        return;
                    }

                    setState((prev) => ({
                        ...prev,
                        slides: [...prev.slides, slide],
                        currentSlide: slide.slideNumber,
                        progress,
                    }));

                    if (onSlideGenerated) {
                        onSlideGenerated(slide, progress);
                    }

                    logger.info(
                        { slideNumber: slide.slideNumber, progress },
                        "Slide generated via SSE"
                    );
                });

                eventSource.addEventListener("progress", (event) => {
                    const data = JSON.parse(event.data);
                    setState((prev) => ({
                        ...prev,
                        progress: data.progress,
                        currentSlide: data.currentSlide,
                    }));
                });

                eventSource.addEventListener("completed", (event) => {
                    const data = JSON.parse(event.data);
                    const slides = data.slides as GeneratedSlide[];
                    const presentationId = data.presentationId as string;

                    isGeneratingRef.current = false;
                    setState((prev) => ({
                        ...prev,
                        isGenerating: false,
                        progress: 100,
                        slides,
                        presentationId,
                    }));

                    if (onComplete) {
                        onComplete(presentationId, slides);
                    }

                    closeConnection();

                    logger.info(
                        { presentationId, slideCount: slides.length },
                        "Presentation generation completed"
                    );
                });

                // Handle custom SSE "error" events sent by the server (e.g., timeout, AI failures)
                // This is DIFFERENT from native EventSource errors - these are named events with data
                eventSource.addEventListener("error", (event) => {
                    // Guard against handling after close
                    if (isClosingRef.current || !eventSourceRef.current) {
                        return;
                    }

                    let errorMessage = "Generation failed";
                    let isTimeout = false;

                    // Check if this is a custom error event with data
                    if (event instanceof MessageEvent && event.data) {
                        try {
                            const data = JSON.parse(event.data);
                            errorMessage = data.error || errorMessage;
                            isTimeout =
                                data.isTimeout === true ||
                                errorMessage === "AI_PROVIDER_TIMEOUT";
                        } catch {
                            // Not a JSON event, likely a connection error
                            return; // Let onerror handle non-JSON errors
                        }
                    } else {
                        // Not a MessageEvent with data, let onerror handle it
                        return;
                    }

                    isGeneratingRef.current = false;
                    setState((prev) => ({
                        ...prev,
                        isGenerating: false,
                        error: errorMessage,
                    }));

                    if (onError) {
                        onError(errorMessage, isTimeout);
                    }

                    closeConnection();

                    logger.error(
                        { error: errorMessage, isTimeout },
                        "Server-sent error event received"
                    );
                });

                // Handle native EventSource connection errors (network failures, connection closed)
                // This is DIFFERENT from custom SSE events - these are browser-level connection errors
                eventSource.onerror = (event) => {
                    // Guard against handling errors after intentional close
                    if (isClosingRef.current || !eventSourceRef.current) {
                        return;
                    }

                    // Determine error type for better user feedback
                    let errorMsg: string;
                    let isNetworkError = false;

                    // Check if this is an ErrorEvent with a message
                    if (event instanceof ErrorEvent && event.message) {
                        errorMsg = event.message;
                        isNetworkError = true;
                    } else if (eventSource.readyState === EventSource.CLOSED) {
                        // Connection was unexpectedly closed
                        errorMsg = "Connection lost during generation";
                        isNetworkError = true;
                    } else if (eventSource.readyState === EventSource.CONNECTING) {
                        // Still trying to reconnect
                        logger.warn(
                            {},
                            "SSE connection interrupted, attempting reconnect"
                        );
                        return; // Don't close yet, let it try to reconnect
                    } else {
                        // Generic server error
                        errorMsg = "Server error during generation";
                    }

                    // Only handle if we were still generating
                    isGeneratingRef.current = false;
                    setState((prev) => {
                        if (prev.isGenerating) {
                            if (onError) {
                                onError(errorMsg, false);
                            }
                            return {
                                ...prev,
                                isGenerating: false,
                                error: errorMsg,
                            };
                        }
                        return prev;
                    });

                    closeConnection();

                    logger.error(
                        { error: errorMsg, isNetworkError },
                        "SSE connection error"
                    );
                };
            } catch (error) {
                const errorMessage =
                    error instanceof Error
                        ? error.message
                        : "Failed to start generation";

                isGeneratingRef.current = false;
                setState((prev) => ({
                    ...prev,
                    isGenerating: false,
                    error: errorMessage,
                }));

                if (onError) {
                    onError(errorMessage, false);
                }

                logger.error({ error }, "Failed to initialize SSE connection");
            }
        },
        [closeConnection]
    );

    return {
        ...state,
        startGeneration,
        stopGeneration,
    };
}
