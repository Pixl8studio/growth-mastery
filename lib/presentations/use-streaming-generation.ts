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
    speakerNotes: string;
    imagePrompt?: string;
    imageUrl?: string;
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
    section: string;
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
    onSlideGenerated?: (slide: GeneratedSlide, progress: number) => void;
    onComplete?: (presentationId: string, slides: GeneratedSlide[]) => void;
    onError?: (error: string) => void;
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

    const stopGeneration = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setState((prev) => ({ ...prev, isGenerating: false }));
    }, []);

    const startGeneration = useCallback(
        async (options: StreamingGenerationOptions) => {
            const { projectId, deckStructureId, customization, onSlideGenerated, onComplete, onError } =
                options;

            // Reset state
            setState({
                isGenerating: true,
                progress: 0,
                currentSlide: 0,
                totalSlides: 0,
                slides: [],
                presentationId: null,
                error: null,
            });

            // Build SSE URL
            const params = new URLSearchParams({
                projectId,
                deckStructureId,
                customization: JSON.stringify(customization),
            });

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
                        { presentationId: data.presentationId, totalSlides: data.totalSlides },
                        "SSE connected for presentation generation"
                    );
                });

                eventSource.addEventListener("slide_generated", (event) => {
                    const data = JSON.parse(event.data);
                    const slide = data.slide as GeneratedSlide;
                    const progress = data.progress as number;

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

                    eventSource.close();
                    eventSourceRef.current = null;

                    logger.info(
                        { presentationId, slideCount: slides.length },
                        "Presentation generation completed"
                    );
                });

                eventSource.addEventListener("error", (event) => {
                    let errorMessage = "Generation failed";

                    // Check if this is a custom error event with data
                    if (event instanceof MessageEvent && event.data) {
                        try {
                            const data = JSON.parse(event.data);
                            errorMessage = data.error || errorMessage;
                        } catch {
                            // Not a JSON event, likely a connection error
                        }
                    }

                    setState((prev) => ({
                        ...prev,
                        isGenerating: false,
                        error: errorMessage,
                    }));

                    if (onError) {
                        onError(errorMessage);
                    }

                    eventSource.close();
                    eventSourceRef.current = null;

                    logger.error({ error: errorMessage }, "Presentation generation failed");
                });

                eventSource.onerror = () => {
                    // SSE connection error
                    if (eventSource.readyState === EventSource.CLOSED) {
                        // Connection was closed, check if we were still generating
                        setState((prev) => {
                            if (prev.isGenerating) {
                                const errorMsg = "Connection lost during generation";
                                if (onError) {
                                    onError(errorMsg);
                                }
                                return {
                                    ...prev,
                                    isGenerating: false,
                                    error: errorMsg,
                                };
                            }
                            return prev;
                        });
                    }
                };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Failed to start generation";

                setState((prev) => ({
                    ...prev,
                    isGenerating: false,
                    error: errorMessage,
                }));

                if (onError) {
                    onError(errorMessage);
                }

                logger.error({ error }, "Failed to initialize SSE connection");
            }
        },
        []
    );

    return {
        ...state,
        startGeneration,
        stopGeneration,
    };
}
