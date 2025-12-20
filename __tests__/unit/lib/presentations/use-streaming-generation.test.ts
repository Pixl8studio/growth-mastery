/**
 * Unit tests for useStreamingGeneration slide ordering behavior
 *
 * Tests ensure that slides arriving out of order via SSE are always
 * sorted by slideNumber to maintain the Step 4 presentation structure order.
 *
 * Related: GitHub Issue #327 - Real-time Streaming Editor
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useStreamingGeneration } from "@/lib/presentations/use-streaming-generation";
import type { GeneratedSlide } from "@/lib/presentations/use-streaming-generation";

// Mock the client logger to prevent console noise
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

// Helper to create a mock slide
function createMockSlide(slideNumber: number): GeneratedSlide {
    return {
        slideNumber,
        title: `Slide ${slideNumber}`,
        content: [`Content for slide ${slideNumber}`],
        speakerNotes: `Notes for slide ${slideNumber}`,
        layoutType: "bullets",
        section: "content",
    };
}

// Mock EventSource for SSE simulation
class MockEventSource {
    static instances: MockEventSource[] = [];

    url: string;
    readyState: number = 0; // CONNECTING
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    private listeners: Map<string, ((event: MessageEvent) => void)[]> = new Map();

    constructor(url: string) {
        this.url = url;
        this.readyState = 1; // OPEN
        MockEventSource.instances.push(this);
    }

    addEventListener(type: string, listener: (event: MessageEvent) => void): void {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }
        this.listeners.get(type)!.push(listener);
    }

    removeEventListener(type: string, listener: (event: MessageEvent) => void): void {
        const typeListeners = this.listeners.get(type);
        if (typeListeners) {
            const index = typeListeners.indexOf(listener);
            if (index > -1) {
                typeListeners.splice(index, 1);
            }
        }
    }

    close(): void {
        this.readyState = 2; // CLOSED
    }

    // Test helper: simulate receiving an SSE event
    simulateEvent(type: string, data: unknown): void {
        const event = new MessageEvent(type, {
            data: JSON.stringify(data),
        });
        const typeListeners = this.listeners.get(type) || [];
        typeListeners.forEach((listener) => listener(event));
    }

    // Test helper: get the last instance
    static getLastInstance(): MockEventSource | undefined {
        return MockEventSource.instances[MockEventSource.instances.length - 1];
    }

    // Test helper: clear all instances
    static clearInstances(): void {
        MockEventSource.instances = [];
    }
}

describe("useStreamingGeneration", () => {
    beforeEach(() => {
        MockEventSource.clearInstances();
        // Replace global EventSource with mock
        vi.stubGlobal("EventSource", MockEventSource);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    describe("slide ordering", () => {
        it("should sort slides by slideNumber when arriving out of order", async () => {
            const { result } = renderHook(() => useStreamingGeneration());

            // Start generation
            act(() => {
                result.current.startGeneration({
                    projectId: "test-project",
                    deckStructureId: "test-deck",
                    customization: {
                        textDensity: "balanced",
                        visualStyle: "professional",
                        emphasisPreference: "balanced",
                        animationLevel: "subtle",
                        imageStyle: "photography",
                    },
                });
            });

            const eventSource = MockEventSource.getLastInstance();
            expect(eventSource).toBeDefined();

            // Simulate connected event
            act(() => {
                eventSource!.simulateEvent("connected", {
                    presentationId: "test-presentation-id",
                    totalSlides: 5,
                });
            });

            // Simulate slides arriving OUT OF ORDER: 3, 1, 2
            act(() => {
                eventSource!.simulateEvent("slide_generated", {
                    slide: createMockSlide(3),
                    progress: 20,
                });
            });

            await waitFor(() => {
                expect(result.current.slides.length).toBe(1);
            });

            act(() => {
                eventSource!.simulateEvent("slide_generated", {
                    slide: createMockSlide(1),
                    progress: 40,
                });
            });

            await waitFor(() => {
                expect(result.current.slides.length).toBe(2);
            });

            act(() => {
                eventSource!.simulateEvent("slide_generated", {
                    slide: createMockSlide(2),
                    progress: 60,
                });
            });

            await waitFor(() => {
                expect(result.current.slides.length).toBe(3);
            });

            // Verify slides are sorted correctly: [1, 2, 3]
            expect(result.current.slides.map((s) => s.slideNumber)).toEqual([1, 2, 3]);
            expect(result.current.slides[0].title).toBe("Slide 1");
            expect(result.current.slides[1].title).toBe("Slide 2");
            expect(result.current.slides[2].title).toBe("Slide 3");
        });

        it("should maintain order when slides arrive in sequence", async () => {
            const { result } = renderHook(() => useStreamingGeneration());

            act(() => {
                result.current.startGeneration({
                    projectId: "test-project",
                    deckStructureId: "test-deck",
                    customization: {
                        textDensity: "balanced",
                        visualStyle: "professional",
                        emphasisPreference: "balanced",
                        animationLevel: "subtle",
                        imageStyle: "photography",
                    },
                });
            });

            const eventSource = MockEventSource.getLastInstance();

            act(() => {
                eventSource!.simulateEvent("connected", {
                    presentationId: "test-presentation-id",
                    totalSlides: 3,
                });
            });

            // Simulate slides arriving IN ORDER: 1, 2, 3
            for (let i = 1; i <= 3; i++) {
                act(() => {
                    eventSource!.simulateEvent("slide_generated", {
                        slide: createMockSlide(i),
                        progress: (i / 3) * 100,
                    });
                });
            }

            await waitFor(() => {
                expect(result.current.slides.length).toBe(3);
            });

            // Verify slides remain in correct order
            expect(result.current.slides.map((s) => s.slideNumber)).toEqual([1, 2, 3]);
        });

        it("should handle reverse order arrival correctly", async () => {
            const { result } = renderHook(() => useStreamingGeneration());

            act(() => {
                result.current.startGeneration({
                    projectId: "test-project",
                    deckStructureId: "test-deck",
                    customization: {
                        textDensity: "balanced",
                        visualStyle: "professional",
                        emphasisPreference: "balanced",
                        animationLevel: "subtle",
                        imageStyle: "photography",
                    },
                });
            });

            const eventSource = MockEventSource.getLastInstance();

            act(() => {
                eventSource!.simulateEvent("connected", {
                    presentationId: "test-presentation-id",
                    totalSlides: 5,
                });
            });

            // Simulate slides arriving in REVERSE ORDER: 5, 4, 3, 2, 1
            for (let i = 5; i >= 1; i--) {
                act(() => {
                    eventSource!.simulateEvent("slide_generated", {
                        slide: createMockSlide(i),
                        progress: ((6 - i) / 5) * 100,
                    });
                });
            }

            await waitFor(() => {
                expect(result.current.slides.length).toBe(5);
            });

            // Verify slides are sorted: [1, 2, 3, 4, 5]
            expect(result.current.slides.map((s) => s.slideNumber)).toEqual([
                1, 2, 3, 4, 5,
            ]);
        });

        it("should reject duplicate slides", async () => {
            const { result } = renderHook(() => useStreamingGeneration());

            act(() => {
                result.current.startGeneration({
                    projectId: "test-project",
                    deckStructureId: "test-deck",
                    customization: {
                        textDensity: "balanced",
                        visualStyle: "professional",
                        emphasisPreference: "balanced",
                        animationLevel: "subtle",
                        imageStyle: "photography",
                    },
                });
            });

            const eventSource = MockEventSource.getLastInstance();

            act(() => {
                eventSource!.simulateEvent("connected", {
                    presentationId: "test-presentation-id",
                    totalSlides: 3,
                });
            });

            // Send slide 1
            act(() => {
                eventSource!.simulateEvent("slide_generated", {
                    slide: createMockSlide(1),
                    progress: 33,
                });
            });

            await waitFor(() => {
                expect(result.current.slides.length).toBe(1);
            });

            // Send duplicate slide 1 (should be ignored)
            act(() => {
                eventSource!.simulateEvent("slide_generated", {
                    slide: createMockSlide(1),
                    progress: 33,
                });
            });

            // Should still be 1 slide
            expect(result.current.slides.length).toBe(1);

            // Send slide 2
            act(() => {
                eventSource!.simulateEvent("slide_generated", {
                    slide: createMockSlide(2),
                    progress: 66,
                });
            });

            await waitFor(() => {
                expect(result.current.slides.length).toBe(2);
            });

            expect(result.current.slides.map((s) => s.slideNumber)).toEqual([1, 2]);
        });

        it("should handle gaps in slide numbers correctly", async () => {
            const { result } = renderHook(() => useStreamingGeneration());

            act(() => {
                result.current.startGeneration({
                    projectId: "test-project",
                    deckStructureId: "test-deck",
                    customization: {
                        textDensity: "balanced",
                        visualStyle: "professional",
                        emphasisPreference: "balanced",
                        animationLevel: "subtle",
                        imageStyle: "photography",
                    },
                });
            });

            const eventSource = MockEventSource.getLastInstance();

            act(() => {
                eventSource!.simulateEvent("connected", {
                    presentationId: "test-presentation-id",
                    totalSlides: 10,
                });
            });

            // Simulate slides with gaps: 1, 5, 3, 10, 7
            const slidesToSend = [1, 5, 3, 10, 7];
            for (const slideNum of slidesToSend) {
                act(() => {
                    eventSource!.simulateEvent("slide_generated", {
                        slide: createMockSlide(slideNum),
                        progress: 50,
                    });
                });
            }

            await waitFor(() => {
                expect(result.current.slides.length).toBe(5);
            });

            // Verify slides are sorted: [1, 3, 5, 7, 10]
            expect(result.current.slides.map((s) => s.slideNumber)).toEqual([
                1, 3, 5, 7, 10,
            ]);
        });
    });

    describe("invalid slide handling", () => {
        it("should ignore slides with undefined slideNumber", async () => {
            const { result } = renderHook(() => useStreamingGeneration());

            act(() => {
                result.current.startGeneration({
                    projectId: "test-project",
                    deckStructureId: "test-deck",
                    customization: {
                        textDensity: "balanced",
                        visualStyle: "professional",
                        emphasisPreference: "balanced",
                        animationLevel: "subtle",
                        imageStyle: "photography",
                    },
                });
            });

            const eventSource = MockEventSource.getLastInstance();

            act(() => {
                eventSource!.simulateEvent("connected", {
                    presentationId: "test-presentation-id",
                    totalSlides: 3,
                });
            });

            // Send valid slide
            act(() => {
                eventSource!.simulateEvent("slide_generated", {
                    slide: createMockSlide(1),
                    progress: 33,
                });
            });

            await waitFor(() => {
                expect(result.current.slides.length).toBe(1);
            });

            // Send invalid slide with no slideNumber
            act(() => {
                eventSource!.simulateEvent("slide_generated", {
                    slide: {
                        title: "Invalid Slide",
                        content: ["No slide number"],
                        layoutType: "bullets",
                    },
                    progress: 50,
                });
            });

            // Should still be 1 slide
            expect(result.current.slides.length).toBe(1);
        });

        it("should ignore null or undefined slides", async () => {
            const { result } = renderHook(() => useStreamingGeneration());

            act(() => {
                result.current.startGeneration({
                    projectId: "test-project",
                    deckStructureId: "test-deck",
                    customization: {
                        textDensity: "balanced",
                        visualStyle: "professional",
                        emphasisPreference: "balanced",
                        animationLevel: "subtle",
                        imageStyle: "photography",
                    },
                });
            });

            const eventSource = MockEventSource.getLastInstance();

            act(() => {
                eventSource!.simulateEvent("connected", {
                    presentationId: "test-presentation-id",
                    totalSlides: 3,
                });
            });

            // Send null slide
            act(() => {
                eventSource!.simulateEvent("slide_generated", {
                    slide: null,
                    progress: 33,
                });
            });

            // Send undefined slide
            act(() => {
                eventSource!.simulateEvent("slide_generated", {
                    slide: undefined,
                    progress: 50,
                });
            });

            // Should have 0 slides
            expect(result.current.slides.length).toBe(0);
        });
    });

    describe("completion handling", () => {
        it("should use sorted slides from completion event", async () => {
            const onComplete = vi.fn();
            const { result } = renderHook(() => useStreamingGeneration());

            act(() => {
                result.current.startGeneration({
                    projectId: "test-project",
                    deckStructureId: "test-deck",
                    customization: {
                        textDensity: "balanced",
                        visualStyle: "professional",
                        emphasisPreference: "balanced",
                        animationLevel: "subtle",
                        imageStyle: "photography",
                    },
                    onComplete,
                });
            });

            const eventSource = MockEventSource.getLastInstance();

            act(() => {
                eventSource!.simulateEvent("connected", {
                    presentationId: "test-presentation-id",
                    totalSlides: 3,
                });
            });

            // Send slides out of order during generation
            act(() => {
                eventSource!.simulateEvent("slide_generated", {
                    slide: createMockSlide(2),
                    progress: 33,
                });
            });

            act(() => {
                eventSource!.simulateEvent("slide_generated", {
                    slide: createMockSlide(1),
                    progress: 66,
                });
            });

            // Simulate completion with final sorted slides
            const finalSlides = [
                createMockSlide(1),
                createMockSlide(2),
                createMockSlide(3),
            ];
            act(() => {
                eventSource!.simulateEvent("completed", {
                    presentationId: "test-presentation-id",
                    slides: finalSlides,
                });
            });

            await waitFor(() => {
                expect(result.current.isGenerating).toBe(false);
            });

            expect(result.current.slides.length).toBe(3);
            expect(result.current.slides.map((s) => s.slideNumber)).toEqual([1, 2, 3]);
            expect(onComplete).toHaveBeenCalledWith(
                "test-presentation-id",
                finalSlides
            );
        });
    });
});
