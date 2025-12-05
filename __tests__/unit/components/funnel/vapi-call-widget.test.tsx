/**
 * VapiCallWidget Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VapiCallWidget } from "@/components/funnel/vapi-call-widget";

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
    },
}));

// Mock @vapi-ai/web
const mockVapiOn = vi.fn();
const mockVapiStart = vi.fn();
const mockVapiStop = vi.fn();

vi.mock("@vapi-ai/web", () => ({
    default: vi.fn().mockImplementation(() => ({
        on: mockVapiOn,
        start: mockVapiStart,
        stop: mockVapiStop,
    })),
}));

// Mock fetch
global.fetch = vi.fn();

// Mock environment variables
const originalEnv = process.env;

describe("VapiCallWidget", () => {
    const mockProps = {
        projectId: "project-123",
        userId: "user-456",
        onCallComplete: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = {
            ...originalEnv,
            NEXT_PUBLIC_VAPI_PUBLIC_KEY: "test-public-key",
            NEXT_PUBLIC_VAPI_ASSISTANT_ID: "test-assistant-id",
        };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it("should render loading state initially", () => {
        render(<VapiCallWidget {...mockProps} />);

        expect(screen.getByText("Loading voice assistant...")).toBeInTheDocument();
    });

    it("should show error when VAPI public key is missing", async () => {
        delete process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;

        render(<VapiCallWidget {...mockProps} />);

        await waitFor(() => {
            expect(
                screen.getByText("VAPI public key not configured")
            ).toBeInTheDocument();
        });
    });

    it("should render call controls after initialization", async () => {
        render(<VapiCallWidget {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Voice Conversation")).toBeInTheDocument();
        });

        expect(screen.getByText("Start Call")).toBeInTheDocument();
        expect(screen.getByText("Ready")).toBeInTheDocument();
    });

    it("should show empty message state", async () => {
        render(<VapiCallWidget {...mockProps} />);

        await waitFor(() => {
            expect(
                screen.getByText('Click "Start Call" to begin your conversation')
            ).toBeInTheDocument();
        });
    });

    it("should handle start call button click", async () => {
        mockVapiStart.mockResolvedValue(undefined);

        render(<VapiCallWidget {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Start Call")).toBeInTheDocument();
        });

        const startButton = screen.getByText("Start Call");
        fireEvent.click(startButton);

        await waitFor(() => {
            expect(mockVapiStart).toHaveBeenCalledWith("test-assistant-id");
        });
    });

    it("should show connecting state when starting call", async () => {
        let _resolveStart: any;
        mockVapiStart.mockImplementation(
            () => new Promise((resolve) => (_resolveStart = resolve))
        );

        render(<VapiCallWidget {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Start Call")).toBeInTheDocument();
        });

        const startButton = screen.getByText("Start Call");
        fireEvent.click(startButton);

        await waitFor(() => {
            expect(
                screen.getByText("Connecting to AI assistant...")
            ).toBeInTheDocument();
        });
    });

    it("should handle microphone permission error", async () => {
        mockVapiStart.mockRejectedValue(new Error("Microphone permission denied"));

        render(<VapiCallWidget {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Start Call")).toBeInTheDocument();
        });

        const startButton = screen.getByText("Start Call");
        fireEvent.click(startButton);

        await waitFor(() => {
            expect(
                screen.getByText(
                    /Please allow microphone access in your browser to start the call/
                )
            ).toBeInTheDocument();
        });
    });

    it("should handle call-start event", async () => {
        let callStartHandler: any;
        mockVapiOn.mockImplementation((event, handler) => {
            if (event === "call-start") {
                callStartHandler = handler;
            }
        });

        render(<VapiCallWidget {...mockProps} />);

        await waitFor(() => {
            expect(mockVapiOn).toHaveBeenCalled();
        });

        // Trigger call-start event
        if (callStartHandler) {
            callStartHandler({ call: { id: "call-123" } });
        }

        await waitFor(() => {
            expect(
                screen.getByText("Call connected - speak naturally!")
            ).toBeInTheDocument();
        });
    });

    it("should handle message transcript events", async () => {
        let messageHandler: any;
        mockVapiOn.mockImplementation((event, handler) => {
            if (event === "message") {
                messageHandler = handler;
            }
        });

        render(<VapiCallWidget {...mockProps} />);

        await waitFor(() => {
            expect(mockVapiOn).toHaveBeenCalled();
        });

        // Trigger transcript message
        if (messageHandler) {
            messageHandler({
                type: "transcript",
                transcriptType: "final",
                transcript: "Hello, how can I help you?",
                role: "assistant",
            });
        }

        await waitFor(() => {
            expect(screen.getByText("Hello, how can I help you?")).toBeInTheDocument();
        });
    });

    it("should handle end call button click", async () => {
        let callStartHandler: any;
        mockVapiOn.mockImplementation((event, handler) => {
            if (event === "call-start") {
                callStartHandler = handler;
            }
        });
        mockVapiStop.mockResolvedValue(undefined);

        render(<VapiCallWidget {...mockProps} />);

        await waitFor(() => {
            expect(mockVapiOn).toHaveBeenCalled();
        });

        // Start a call first
        if (callStartHandler) {
            callStartHandler({ call: { id: "call-123" } });
        }

        await waitFor(() => {
            expect(screen.getByText("End Call")).toBeInTheDocument();
        });

        const endButton = screen.getByText("End Call");
        fireEvent.click(endButton);

        expect(mockVapiStop).toHaveBeenCalled();
    });

    it("should save transcript after call ends", async () => {
        let callStartHandler: any;
        let callEndHandler: any;
        mockVapiOn.mockImplementation((event, handler) => {
            if (event === "call-start") {
                callStartHandler = handler;
            }
            if (event === "call-end") {
                callEndHandler = handler;
            }
        });

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ success: true }),
        });

        render(<VapiCallWidget {...mockProps} />);

        await waitFor(() => {
            expect(mockVapiOn).toHaveBeenCalled();
        });

        // Start and end call
        if (callStartHandler) {
            callStartHandler({ call: { id: "call-123" } });
        }

        if (callEndHandler) {
            callEndHandler();
        }

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/vapi/webhook",
                expect.objectContaining({
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                })
            );
        });
    });

    it("should display call duration during active call", async () => {
        let callStartHandler: any;
        mockVapiOn.mockImplementation((event, handler) => {
            if (event === "call-start") {
                callStartHandler = handler;
            }
        });

        render(<VapiCallWidget {...mockProps} />);

        await waitFor(() => {
            expect(mockVapiOn).toHaveBeenCalled();
        });

        // Start call
        if (callStartHandler) {
            callStartHandler({ call: { id: "call-123" } });
        }

        await waitFor(() => {
            expect(screen.getByText("0:00")).toBeInTheDocument();
        });
    });

    it("should show AI thinking indicator", async () => {
        let speechEndHandler: any;
        mockVapiOn.mockImplementation((event, handler) => {
            if (event === "speech-end") {
                speechEndHandler = handler;
            }
        });

        render(<VapiCallWidget {...mockProps} />);

        await waitFor(() => {
            expect(mockVapiOn).toHaveBeenCalled();
        });

        // Trigger speech-end
        if (speechEndHandler) {
            speechEndHandler();
        }

        await waitFor(() => {
            expect(screen.getByText("AI is thinking")).toBeInTheDocument();
        });
    });

    it("should handle error during transcript save", async () => {
        let callEndHandler: any;
        mockVapiOn.mockImplementation((event, handler) => {
            if (event === "call-end") {
                callEndHandler = handler;
            }
        });

        (global.fetch as any).mockRejectedValue(new Error("Network error"));

        render(<VapiCallWidget {...mockProps} />);

        await waitFor(() => {
            expect(mockVapiOn).toHaveBeenCalled();
        });

        if (callEndHandler) {
            callEndHandler();
        }

        await waitFor(() => {
            expect(
                screen.getByText(
                    /Error saving transcript. Please try again or contact support/
                )
            ).toBeInTheDocument();
        });
    });

    it("should call onCallComplete callback after successful transcript save", async () => {
        let callEndHandler: any;
        mockVapiOn.mockImplementation((event, handler) => {
            if (event === "call-end") {
                callEndHandler = handler;
            }
        });

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ transcript: "test transcript" }),
        });

        render(<VapiCallWidget {...mockProps} />);

        await waitFor(() => {
            expect(mockVapiOn).toHaveBeenCalled();
        });

        if (callEndHandler) {
            callEndHandler();
        }

        await waitFor(
            () => {
                expect(mockProps.onCallComplete).toHaveBeenCalled();
            },
            { timeout: 15000 }
        );
    });
});
