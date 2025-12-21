/**
 * useStreamingGeneration Hook
 * Handles real-time slide generation via Server-Sent Events (SSE)
 *
 * Related: GitHub Issue #327 - Real-time Streaming Editor
 * Enhanced: Automatic reconnection with exponential backoff for resilience
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { logger } from "@/lib/client-logger";

// Reconnection configuration
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;
// Maximum reconnection attempts before giving up (~5 minutes with exponential backoff)
const MAX_RECONNECT_ATTEMPTS = 10;

/**
 * Represents a single generated slide in a presentation.
 *
 * @remarks
 * The `slideNumber` property is critical for ordering:
 * - Must be a sequential positive integer starting from 1
 * - Corresponds to the slide position defined in Step 4 deck structure
 * - Used for sorting slides when they arrive out of order via SSE
 * - Sorting is performed using numeric comparison: `(a, b) => a.slideNumber - b.slideNumber`
 *
 * Slides may arrive out of order during streaming due to:
 * - Network latency variations
 * - Async AI processing completing in non-sequential order
 * - SSE reconnection scenarios
 *
 * All consumers should ensure slides are sorted by slideNumber before display.
 */
export interface GeneratedSlide {
    /**
     * Sequential position of this slide in the presentation (1-indexed).
     * Used for ordering - slides are sorted by this value ascending.
     */
    slideNumber: number;
    /** The slide title displayed prominently */
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
    /** Optional: callback when connection is interrupted and reconnecting */
    onReconnecting?: () => void;
    /** Optional: callback when reconnection succeeds */
    onReconnected?: () => void;
}

/**
 * Event handlers for SSE event listener setup
 * Extracted to prevent code duplication between initial connection and reconnection
 */
interface SSEEventHandlers {
    onConnected: (data: { presentationId: string; totalSlides: number }) => void;
    onSlideGenerated: (slide: GeneratedSlide, progress: number) => void;
    onCompleted: (data: { presentationId: string; slides: GeneratedSlide[] }) => void;
    onServerError: (errorMessage: string, isTimeout: boolean) => void;
    onConnectionError: () => void;
}

/**
 * Attaches all SSE event listeners to an EventSource
 * Used for both initial connection and reconnection to avoid code duplication
 */
function attachEventListeners(
    eventSource: EventSource,
    handlers: SSEEventHandlers
): void {
    eventSource.addEventListener("connected", (event) => {
        const data = JSON.parse((event as MessageEvent).data);
        handlers.onConnected(data);
    });

    eventSource.addEventListener("slide_generated", (event) => {
        const data = JSON.parse((event as MessageEvent).data);
        const slide = data.slide as GeneratedSlide;
        const progress = data.progress as number;

        // Guard against undefined or invalid slides
        if (!slide || typeof slide.slideNumber !== "number") {
            logger.warn({ data }, "Received invalid slide data from SSE");
            return;
        }

        handlers.onSlideGenerated(slide, progress);
    });

    eventSource.addEventListener("progress", (event) => {
        // Progress events are informational - handled by slide_generated
        const _data = JSON.parse((event as MessageEvent).data);
        // State update handled by the hook directly
    });

    eventSource.addEventListener("completed", (event) => {
        const data = JSON.parse((event as MessageEvent).data);
        handlers.onCompleted(data);
    });

    // Handle custom SSE "error" events sent by the server
    eventSource.addEventListener("error", (event) => {
        if (event instanceof MessageEvent && event.data) {
            try {
                const data = JSON.parse(event.data);
                const errorMessage = data.error || "Generation failed";
                const isTimeout =
                    data.isTimeout === true || errorMessage === "AI_PROVIDER_TIMEOUT";
                handlers.onServerError(errorMessage, isTimeout);
            } catch {
                // Not JSON, let onerror handle non-JSON errors
            }
        }
    });

    // Handle native EventSource connection errors
    eventSource.onerror = () => {
        handlers.onConnectionError();
    };
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
    // Track if we've received the initial connection to prevent reconnection issues
    const hasConnectedRef = useRef<boolean>(false);
    // Store the presentation ID to prevent duplicate creation on reconnection
    const currentPresentationIdRef = useRef<string | null>(null);

    // Reconnection state
    const reconnectAttemptRef = useRef<number>(0);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isReconnectingRef = useRef<boolean>(false);
    // Store current options for reconnection
    const currentOptionsRef = useRef<StreamingGenerationOptions | null>(null);
    // Store current slides for reconnection (in case we need to resume)
    const currentSlidesRef = useRef<GeneratedSlide[]>([]);

    // Consolidated cleanup function to prevent double-close and memory leaks
    const closeConnection = useCallback((clearReconnect: boolean = true) => {
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

        // Clear reconnection timeout if requested
        if (clearReconnect && reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
            isReconnectingRef.current = false;
            reconnectAttemptRef.current = 0;
        }

        // Reset the closing flag after cleanup
        isClosingRef.current = false;
    }, []);

    // Track if generation is in progress to prevent multiple simultaneous calls
    const isGeneratingRef = useRef<boolean>(false);

    const stopGeneration = useCallback(() => {
        isGeneratingRef.current = false;
        hasConnectedRef.current = false;
        currentPresentationIdRef.current = null;
        currentOptionsRef.current = null;
        currentSlidesRef.current = [];
        closeConnection(true);
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
            hasConnectedRef.current = false;
            currentPresentationIdRef.current = null;

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
                onReconnecting,
                onReconnected,
            } = options;

            // Store options for potential reconnection
            currentOptionsRef.current = options;
            // Initialize slides ref with existing slides
            currentSlidesRef.current = existingSlides;

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

                    // Guard against processing multiple connected events (e.g., on reconnection)
                    // Only process the first connection to prevent progress reset
                    if (hasConnectedRef.current) {
                        logger.warn(
                            { presentationId: data.presentationId },
                            "SSE reconnected, ignoring duplicate connected event"
                        );
                        // If we get a different presentation ID on reconnect, something went wrong
                        if (
                            currentPresentationIdRef.current &&
                            data.presentationId !== currentPresentationIdRef.current
                        ) {
                            logger.error(
                                {
                                    expected: currentPresentationIdRef.current,
                                    received: data.presentationId,
                                },
                                "Presentation ID mismatch on reconnection - possible duplicate creation"
                            );
                        }
                        return;
                    }

                    hasConnectedRef.current = true;
                    currentPresentationIdRef.current = data.presentationId;

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

                    setState((prev) => {
                        // Guard against duplicate slides or progress going backwards
                        const existingSlide = prev.slides.find(
                            (s) => s.slideNumber === slide.slideNumber
                        );
                        if (existingSlide) {
                            logger.warn(
                                { slideNumber: slide.slideNumber },
                                "Duplicate slide received, ignoring"
                            );
                            return prev;
                        }

                        // Don't allow progress to go backwards (indicates something went wrong)
                        const newProgress = Math.max(prev.progress, progress);

                        // CRITICAL: Sort slides by slideNumber to maintain Step 4 presentation order
                        // Slides may arrive out of order due to network conditions or async processing
                        const updatedSlides = [...prev.slides, slide].sort(
                            (a, b) => a.slideNumber - b.slideNumber
                        );

                        // Store slides for potential reconnection
                        currentSlidesRef.current = updatedSlides;

                        return {
                            ...prev,
                            slides: updatedSlides,
                            currentSlide: slide.slideNumber,
                            progress: newProgress,
                        };
                    });

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

                // Server sends final slide array on completion. The order is not guaranteed
                // to match slideNumber order - server may return slides in generation order.
                // Consumers should sort by slideNumber before display.
                eventSource.addEventListener("completed", (event) => {
                    const data = JSON.parse(event.data);
                    const slides = data.slides as GeneratedSlide[];
                    const presentationId = data.presentationId as string;

                    isGeneratingRef.current = false;
                    // Clear reconnection state on successful completion
                    currentOptionsRef.current = null;
                    currentSlidesRef.current = [];
                    reconnectAttemptRef.current = 0;

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

                    closeConnection(true);

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
                // ENHANCED: Now triggers automatic reconnection with exponential backoff
                eventSource.onerror = () => {
                    // Guard against handling errors after intentional close
                    if (isClosingRef.current || !eventSourceRef.current) {
                        return;
                    }

                    // If still in CONNECTING state, browser is handling reconnection
                    if (eventSource.readyState === EventSource.CONNECTING) {
                        logger.warn(
                            {},
                            "SSE connection interrupted, browser attempting reconnect"
                        );
                        return;
                    }

                    // Connection closed - trigger manual reconnection with resume
                    if (
                        eventSource.readyState === EventSource.CLOSED &&
                        currentPresentationIdRef.current &&
                        currentOptionsRef.current
                    ) {
                        // Close current connection without clearing reconnection state
                        closeConnection(false);

                        // Calculate exponential backoff delay
                        reconnectAttemptRef.current += 1;

                        // Check max reconnection attempts to prevent infinite loops
                        if (reconnectAttemptRef.current > MAX_RECONNECT_ATTEMPTS) {
                            logger.error(
                                {
                                    attempts: reconnectAttemptRef.current,
                                    maxAttempts: MAX_RECONNECT_ATTEMPTS,
                                    presentationId: currentPresentationIdRef.current,
                                    slidesGenerated: currentSlidesRef.current.length,
                                },
                                "Max reconnection attempts reached, giving up"
                            );

                            isGeneratingRef.current = false;
                            const slidesGenerated = currentSlidesRef.current.length;
                            currentOptionsRef.current = null;
                            currentSlidesRef.current = [];
                            reconnectAttemptRef.current = 0;

                            setState((prev) => ({
                                ...prev,
                                isGenerating: false,
                                error: `Connection lost after ${MAX_RECONNECT_ATTEMPTS} reconnection attempts. ${slidesGenerated} slides were saved.`,
                            }));

                            if (onError) {
                                onError(
                                    `Connection lost after ${MAX_RECONNECT_ATTEMPTS} reconnection attempts`,
                                    false
                                );
                            }

                            closeConnection(true);
                            return;
                        }

                        const delay = Math.min(
                            RECONNECT_BASE_DELAY_MS *
                                Math.pow(2, reconnectAttemptRef.current - 1),
                            RECONNECT_MAX_DELAY_MS
                        );

                        logger.warn(
                            {
                                attempt: reconnectAttemptRef.current,
                                maxAttempts: MAX_RECONNECT_ATTEMPTS,
                                delay,
                                presentationId: currentPresentationIdRef.current,
                                slidesGenerated: currentSlidesRef.current.length,
                            },
                            "SSE connection lost, scheduling reconnection"
                        );

                        // Notify caller about reconnection
                        if (onReconnecting) {
                            onReconnecting();
                        }

                        isReconnectingRef.current = true;

                        // Schedule reconnection
                        reconnectTimeoutRef.current = setTimeout(() => {
                            // Race condition guard: check if stop was called while waiting
                            if (isClosingRef.current) {
                                logger.info(
                                    {},
                                    "Reconnection cancelled: connection is closing"
                                );
                                return;
                            }

                            if (!isGeneratingRef.current) {
                                // Generation was stopped while waiting
                                return;
                            }

                            const savedOptions = currentOptionsRef.current;
                            const savedSlides = currentSlidesRef.current;
                            const savedPresentationId =
                                currentPresentationIdRef.current;

                            if (!savedOptions || !savedPresentationId) {
                                logger.error(
                                    {},
                                    "Cannot reconnect: missing options or presentation ID"
                                );
                                return;
                            }

                            logger.info(
                                {
                                    attempt: reconnectAttemptRef.current,
                                    presentationId: savedPresentationId,
                                    resumeFromSlide: savedSlides.length + 1,
                                },
                                "Attempting SSE reconnection"
                            );

                            // Reset flags before reconnecting
                            isGeneratingRef.current = false;
                            hasConnectedRef.current = false;
                            isReconnectingRef.current = false;

                            // Start generation with resume parameters
                            // Note: We call the startGeneration recursively but with resume params
                            const reconnectOptions: StreamingGenerationOptions = {
                                ...savedOptions,
                                resumePresentationId: savedPresentationId,
                                resumeFromSlide: savedSlides.length + 1,
                                existingSlides: savedSlides,
                            };

                            // Store for next potential reconnection
                            currentOptionsRef.current = reconnectOptions;

                            // Build new SSE URL with resume parameters
                            const reconnectParams = new URLSearchParams({
                                projectId: reconnectOptions.projectId,
                                deckStructureId: reconnectOptions.deckStructureId,
                                customization: JSON.stringify(
                                    reconnectOptions.customization
                                ),
                                resumePresentationId: savedPresentationId,
                                resumeFromSlide: String(savedSlides.length + 1),
                            });

                            const reconnectUrl = `/api/presentations/generate/stream?${reconnectParams.toString()}`;

                            try {
                                // Create new EventSource for reconnection
                                const newEventSource = new EventSource(reconnectUrl);
                                eventSourceRef.current = newEventSource;
                                isGeneratingRef.current = true;

                                // Re-attach all event listeners
                                newEventSource.addEventListener("connected", (evt) => {
                                    const data = JSON.parse((evt as MessageEvent).data);
                                    logger.info(
                                        {
                                            presentationId: data.presentationId,
                                            totalSlides: data.totalSlides,
                                            attempt: reconnectAttemptRef.current,
                                        },
                                        "SSE reconnected successfully"
                                    );
                                    // Reset reconnect attempts on success
                                    reconnectAttemptRef.current = 0;
                                    hasConnectedRef.current = true;
                                    // Notify caller
                                    if (onReconnected) {
                                        onReconnected();
                                    }
                                });

                                newEventSource.addEventListener(
                                    "slide_generated",
                                    (evt) => {
                                        const data = JSON.parse(
                                            (evt as MessageEvent).data
                                        );
                                        const slide = data.slide as GeneratedSlide;
                                        const progress = data.progress as number;

                                        if (
                                            !slide ||
                                            typeof slide.slideNumber !== "number"
                                        ) {
                                            return;
                                        }

                                        setState((prev) => {
                                            const existingSlide = prev.slides.find(
                                                (s) =>
                                                    s.slideNumber === slide.slideNumber
                                            );
                                            if (existingSlide) return prev;

                                            const newProgress = Math.max(
                                                prev.progress,
                                                progress
                                            );
                                            const updatedSlides = [
                                                ...prev.slides,
                                                slide,
                                            ].sort(
                                                (a, b) => a.slideNumber - b.slideNumber
                                            );
                                            currentSlidesRef.current = updatedSlides;

                                            return {
                                                ...prev,
                                                slides: updatedSlides,
                                                currentSlide: slide.slideNumber,
                                                progress: newProgress,
                                            };
                                        });

                                        if (onSlideGenerated) {
                                            onSlideGenerated(slide, progress);
                                        }
                                    }
                                );

                                newEventSource.addEventListener("completed", (evt) => {
                                    const data = JSON.parse((evt as MessageEvent).data);
                                    const slides = data.slides as GeneratedSlide[];
                                    const presentationId =
                                        data.presentationId as string;

                                    isGeneratingRef.current = false;
                                    currentOptionsRef.current = null;
                                    currentSlidesRef.current = [];
                                    reconnectAttemptRef.current = 0;

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

                                    closeConnection(true);
                                    logger.info(
                                        {
                                            presentationId,
                                            slideCount: slides.length,
                                        },
                                        "Presentation generation completed after reconnection"
                                    );
                                });

                                newEventSource.addEventListener("error", (evt) => {
                                    if (evt instanceof MessageEvent && evt.data) {
                                        try {
                                            const data = JSON.parse(evt.data);
                                            const errorMessage =
                                                data.error || "Generation failed";
                                            const isTimeout = data.isTimeout === true;

                                            isGeneratingRef.current = false;
                                            currentOptionsRef.current = null;
                                            currentSlidesRef.current = [];

                                            setState((prev) => ({
                                                ...prev,
                                                isGenerating: false,
                                                error: errorMessage,
                                            }));

                                            if (onError) {
                                                onError(errorMessage, isTimeout);
                                            }
                                            closeConnection(true);
                                        } catch {
                                            // Not JSON, let onerror handle
                                        }
                                    }
                                });

                                // Recursive reconnection for the new EventSource
                                newEventSource.onerror = () => {
                                    if (
                                        newEventSource.readyState ===
                                        EventSource.CONNECTING
                                    ) {
                                        return;
                                    }
                                    if (
                                        newEventSource.readyState === EventSource.CLOSED
                                    ) {
                                        // Trigger another reconnection attempt
                                        closeConnection(false);
                                        reconnectAttemptRef.current += 1;

                                        // Check max attempts to prevent infinite loops
                                        if (
                                            reconnectAttemptRef.current >
                                            MAX_RECONNECT_ATTEMPTS
                                        ) {
                                            logger.error(
                                                {
                                                    attempts:
                                                        reconnectAttemptRef.current,
                                                    maxAttempts: MAX_RECONNECT_ATTEMPTS,
                                                },
                                                "Max reconnection attempts reached in nested handler"
                                            );

                                            isGeneratingRef.current = false;
                                            const slidesGenerated =
                                                currentSlidesRef.current.length;
                                            currentOptionsRef.current = null;
                                            currentSlidesRef.current = [];
                                            reconnectAttemptRef.current = 0;

                                            setState((prev) => ({
                                                ...prev,
                                                isGenerating: false,
                                                error: `Connection lost after ${MAX_RECONNECT_ATTEMPTS} reconnection attempts. ${slidesGenerated} slides were saved.`,
                                            }));

                                            if (onError) {
                                                onError(
                                                    `Connection lost after ${MAX_RECONNECT_ATTEMPTS} reconnection attempts`,
                                                    false
                                                );
                                            }

                                            closeConnection(true);
                                            return;
                                        }

                                        const nextDelay = Math.min(
                                            RECONNECT_BASE_DELAY_MS *
                                                Math.pow(
                                                    2,
                                                    reconnectAttemptRef.current - 1
                                                ),
                                            RECONNECT_MAX_DELAY_MS
                                        );
                                        logger.warn(
                                            {
                                                attempt: reconnectAttemptRef.current,
                                                maxAttempts: MAX_RECONNECT_ATTEMPTS,
                                                delay: nextDelay,
                                            },
                                            "Reconnected SSE lost, retrying"
                                        );
                                        if (onReconnecting) {
                                            onReconnecting();
                                        }
                                        // Note: This creates a new reconnection timeout
                                        // The original reconnection logic will handle it
                                    }
                                };
                            } catch (err) {
                                logger.error(
                                    { error: err },
                                    "Failed to create reconnection EventSource"
                                );
                            }
                        }, delay);

                        return;
                    }

                    // If we can't reconnect, fail gracefully
                    logger.error(
                        {
                            readyState: eventSource.readyState,
                            hasPresentationId: !!currentPresentationIdRef.current,
                            hasOptions: !!currentOptionsRef.current,
                        },
                        "SSE connection error - cannot reconnect"
                    );

                    isGeneratingRef.current = false;
                    currentOptionsRef.current = null;
                    currentSlidesRef.current = [];

                    setState((prev) => {
                        if (prev.isGenerating) {
                            if (onError) {
                                onError("Connection lost during generation", false);
                            }
                            return {
                                ...prev,
                                isGenerating: false,
                                error: "Connection lost during generation",
                            };
                        }
                        return prev;
                    });

                    closeConnection(true);
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

    // Handle visibility change (tab backgrounding/foregrounding)
    // When tab becomes visible again, check if we need to reconnect
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                // Tab became visible
                if (
                    isGeneratingRef.current &&
                    eventSourceRef.current?.readyState === EventSource.CLOSED
                ) {
                    // Connection was lost while tab was backgrounded
                    // The onerror handler should have already triggered reconnection
                    // but let's log this for debugging
                    logger.info(
                        {
                            isReconnecting: isReconnectingRef.current,
                            reconnectAttempt: reconnectAttemptRef.current,
                        },
                        "Tab became visible, checking SSE connection status"
                    );
                }
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            closeConnection(true);
        };
    }, [closeConnection]);

    return {
        ...state,
        startGeneration,
        stopGeneration,
    };
}
