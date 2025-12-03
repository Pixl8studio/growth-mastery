"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { logger } from "@/lib/client-logger";
import { Button } from "@/components/ui/button";

declare global {
    interface Window {
        Vapi: any;
    }
}

interface Message {
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: Date;
}

interface VapiCallWidgetProps {
    projectId: string;
    userId: string;
    onCallComplete?: () => void;
}

export function VapiCallWidget({
    projectId,
    userId,
    onCallComplete,
}: VapiCallWidgetProps) {
    // Note: Using 'any' for VAPI SDK as it doesn't export proper types
    // and dynamic import makes it difficult to infer correct types
    const [vapi, setVapi] = useState<any>(null);
    const [isCallActive, setIsCallActive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [callDuration, setCallDuration] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAIThinking, setIsAIThinking] = useState(false);
    const [currentCallId, setCurrentCallId] = useState<string | null>(null);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    // Use ref to avoid closure issues in event handlers
    const callIdRef = useRef<string | null>(null);
    const callStartTimestampRef = useRef<string | null>(null);
    const vapiRef = useRef<any>(null);

    // Get VAPI credentials
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

    // Timer for call duration
    const startTimer = () => {
        intervalRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
        }, 1000);
    };

    const stopTimer = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    // Auto-scroll to bottom when messages change
    const scrollToBottom = () => {
        // Use setTimeout to ensure DOM is updated before scrolling
        setTimeout(() => {
            if (messagesContainerRef.current) {
                // Scroll the container, not the entire page
                messagesContainerRef.current.scrollTop =
                    messagesContainerRef.current.scrollHeight;
            }
        }, 100);
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const saveTranscript = useCallback(
        async (callId: string | null, callStartTimestamp: string | null) => {
            try {
                logger.info(
                    { callId, callStartTimestamp },
                    "⏳ Waiting for VAPI to process transcript..."
                );

                setMessages((prev) => [
                    ...prev,
                    {
                        role: "system",
                        content:
                            "⏳ Processing transcript (this takes 10-15 seconds)...",
                        timestamp: new Date(),
                    },
                ]);

                // Wait longer for VAPI to process the call (increased from 5 to 12 seconds)
                // VAPI needs time to process the call and make it available via API
                await new Promise((resolve) => setTimeout(resolve, 12000));

                logger.info(
                    { callId, callStartTimestamp },
                    "📡 Fetching transcript from VAPI"
                );

                const response = await fetch("/api/vapi/webhook", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        callId,
                        callStartTimestamp,
                        projectId,
                        userId,
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    logger.info(
                        { transcriptLength: data.transcript?.length },
                        "✅ Transcript saved successfully!"
                    );

                    setMessages((prev) => [
                        ...prev,
                        {
                            role: "system",
                            content: "✅ Transcript saved!",
                            timestamp: new Date(),
                        },
                    ]);

                    // Notify parent component to refresh the calls list
                    if (onCallComplete) {
                        setTimeout(() => onCallComplete(), 1500);
                    }
                } else {
                    const errorData = await response.json();
                    logger.error(
                        { status: response.status, error: errorData },
                        "❌ Failed to save transcript"
                    );

                    setMessages((prev) => [
                        ...prev,
                        {
                            role: "system",
                            content:
                                "❌ Error saving transcript. Please try again or contact support.",
                            timestamp: new Date(),
                        },
                    ]);
                }
            } catch (error) {
                logger.error({ error }, "❌ Error in saveTranscript");

                setMessages((prev) => [
                    ...prev,
                    {
                        role: "system",
                        content:
                            "❌ Error saving transcript. Please try again or contact support.",
                        timestamp: new Date(),
                    },
                ]);
            }
        },
        [projectId, userId, onCallComplete]
    );

    // Initialize VAPI Web SDK
    useEffect(() => {
        const initVapi = async () => {
            if (!publicKey) {
                setError("VAPI public key not configured");
                setIsLoading(false);
                return;
            }

            try {
                // Dynamically import VAPI SDK
                const { default: Vapi } = await import("@vapi-ai/web");
                const vapiInstance = new Vapi(publicKey);
                vapiRef.current = vapiInstance;
                setVapi(vapiInstance);

                // Set up event listeners
                vapiInstance.on("call-start", (callData?: unknown) => {
                    // CRITICAL: Capture timestamp immediately when call starts
                    const timestamp = new Date().toISOString();
                    callStartTimestampRef.current = timestamp;

                    // Try to capture call ID from event data - check multiple locations
                    const dataObj = callData as any;
                    const capturedId =
                        dataObj?.call?.id ||
                        dataObj?.callId ||
                        dataObj?.id ||
                        dataObj?.data?.call?.id;

                    if (capturedId) {
                        logger.info(
                            { callId: capturedId, timestamp },
                            "🎙️ Call started with ID"
                        );
                        callIdRef.current = capturedId;
                        setCurrentCallId(capturedId);
                    } else {
                        logger.warn(
                            {
                                timestamp,
                                callData: JSON.stringify(callData, null, 2),
                                callDataKeys: callData ? Object.keys(callData) : [],
                            },
                            "🎙️ Call started but no ID found - will try to capture from messages"
                        );
                    }

                    setIsCallActive(true);
                    setIsConnecting(false);
                    setCallDuration(0);
                    startTimer();
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: "system",
                            content: "✅ Call connected - speak naturally!",
                            timestamp: new Date(),
                        },
                    ]);
                });

                vapiInstance.on("call-end", async () => {
                    const capturedCallId = callIdRef.current;
                    const capturedTimestamp = callStartTimestampRef.current;

                    logger.info(
                        { callId: capturedCallId, timestamp: capturedTimestamp },
                        "🔴 Call ended, saving transcript"
                    );
                    setIsCallActive(false);
                    setIsConnecting(false);
                    stopTimer();

                    setMessages((prev) => [
                        ...prev,
                        {
                            role: "system",
                            content: "📝 Call ended - processing transcript...",
                            timestamp: new Date(),
                        },
                    ]);

                    // Save transcript - use call ID if available, otherwise use timestamp matching
                    if (capturedCallId || capturedTimestamp) {
                        logger.info(
                            { callId: capturedCallId, timestamp: capturedTimestamp },
                            "Saving transcript to database"
                        );
                        await saveTranscript(capturedCallId, capturedTimestamp);
                    } else {
                        logger.error(
                            {},
                            "⚠️ No call ID or timestamp found - transcript may not save!"
                        );
                        setMessages((prev) => [
                            ...prev,
                            {
                                role: "system",
                                content:
                                    "⚠️ Warning: Call ID not captured. Transcript may not save properly.",
                                timestamp: new Date(),
                            },
                        ]);
                    }

                    // Clear refs after processing
                    callIdRef.current = null;
                    callStartTimestampRef.current = null;
                });

                vapiInstance.on("speech-start", () => {
                    logger.debug({}, "🗣️ User speaking");
                    setMessages((prev) => {
                        const lastMsg = prev[prev.length - 1];
                        if (
                            lastMsg?.content === "Listening..." &&
                            lastMsg?.role === "system"
                        ) {
                            return prev;
                        }
                        return [
                            ...prev,
                            {
                                role: "system",
                                content: "Listening...",
                                timestamp: new Date(),
                            },
                        ];
                    });
                });

                vapiInstance.on("speech-end", () => {
                    logger.debug({}, "🤐 User stopped");
                    setMessages((prev) =>
                        prev.filter(
                            (msg) =>
                                !(
                                    msg.role === "system" &&
                                    msg.content === "Listening..."
                                )
                        )
                    );
                    setIsAIThinking(true);
                });

                vapiInstance.on("message", (message: any) => {
                    // Try to capture call ID from various possible locations in the message
                    const possibleCallId =
                        message.call?.id ||
                        message.callId ||
                        message.id ||
                        message.data?.call?.id ||
                        message.data?.callId;

                    // Log all message types to see what we're getting
                    logger.debug(
                        {
                            messageType: message.type,
                            hasCall: !!message.call,
                            hasCallId: !!message.call?.id,
                            possibleCallId: possibleCallId || "none",
                            messageKeys: Object.keys(message),
                        },
                        "Received VAPI message"
                    );

                    // Track call ID from multiple possible locations
                    if (message.type === "call-start") {
                        if (possibleCallId) {
                            logger.info(
                                { callId: possibleCallId, messageType: message.type },
                                "📞 Captured call ID from call-start message"
                            );
                            callIdRef.current = possibleCallId;
                            setCurrentCallId(possibleCallId);
                        } else {
                            logger.warn(
                                { message: JSON.stringify(message, null, 2) },
                                "⚠️ call-start message but no call ID found in any location"
                            );
                        }
                    }

                    // Also check for call ID in other message types
                    if (!callIdRef.current && possibleCallId) {
                        logger.info(
                            { callId: possibleCallId, messageType: message.type },
                            "📞 Captured call ID from message"
                        );
                        callIdRef.current = possibleCallId;
                        setCurrentCallId(possibleCallId);
                    }

                    // Only show final transcripts
                    if (
                        message.type === "transcript" &&
                        message.transcriptType === "final" &&
                        message.transcript &&
                        message.transcript.trim()
                    ) {
                        const content = message.transcript.trim();
                        const role = message.role || "user";

                        logger.info({ role, content }, "📝 Final transcript");

                        // If we're getting transcripts, the call is definitely active!
                        // This handles cases where call-start event doesn't fire
                        if (isConnecting) {
                            logger.info(
                                {},
                                "🎙️ Call is active (detected from transcript)"
                            );
                            setIsCallActive(true);
                            setIsConnecting(false);
                            if (!intervalRef.current) {
                                startTimer();
                            }
                        }

                        // Prevent duplicates
                        setMessages((prev) => {
                            const recent = prev.slice(-3);
                            const isDupe = recent.some(
                                (msg) => msg.content === content && msg.role === role
                            );
                            if (isDupe) return prev;

                            return [...prev, { role, content, timestamp: new Date() }];
                        });

                        if (role === "user") {
                            setIsAIThinking(false);
                        }
                    }
                });

                vapiInstance.on("error", (err: any) => {
                    logger.error({ error: err }, "❌ VAPI error");
                    setError(
                        err instanceof Error ? err.message : "Call error occurred"
                    );
                    setIsCallActive(false);
                    setIsConnecting(false);
                    stopTimer();
                });

                setIsLoading(false);
                logger.info({}, "✅ VAPI SDK initialized");
            } catch (err) {
                logger.error({ error: err }, "Failed to initialize VAPI");
                setError("Failed to load VAPI SDK");
                setIsLoading(false);
            }
        };

        initVapi();

        return () => {
            stopTimer();
            // Cleanup: Stop any active call when component unmounts
            if (vapiRef.current) {
                try {
                    vapiRef.current.stop();
                    logger.info({}, "🧹 Cleanup: Stopped active call on unmount");
                } catch (err) {
                    logger.error({ error: err }, "Error stopping call during cleanup");
                }
            }
        };
    }, [publicKey, isConnecting, saveTranscript]);

    const startCall = async () => {
        if (!vapi || !assistantId) return;

        setIsConnecting(true);
        setError(null);

        setMessages((prev) => [
            ...prev,
            {
                role: "system",
                content: "🔄 Connecting to AI assistant...",
                timestamp: new Date(),
            },
        ]);

        try {
            await vapi.start(assistantId);
            // State will update when call-start event fires
            logger.info({}, "Call start initiated");
        } catch (err) {
            logger.error({ error: err }, "Failed to start call");

            // Check if it's a permission error
            const errorMsg = err instanceof Error ? err.message : String(err);
            if (errorMsg.includes("permission") || errorMsg.includes("Permission")) {
                setError(
                    "Microphone permission denied. Please allow microphone access and try again."
                );
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "system",
                        content:
                            "🎤 Please allow microphone access in your browser to start the call.",
                        timestamp: new Date(),
                    },
                ]);
            } else {
                setError("Failed to start call. Please try again.");
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "system",
                        content: "❌ Failed to connect. Please try again.",
                        timestamp: new Date(),
                    },
                ]);
            }

            setIsConnecting(false);
        }
    };

    const endCall = async () => {
        if (!vapi) return;

        try {
            logger.info(
                { currentCallId, callId: callIdRef.current },
                "🔴 User clicked End Call"
            );

            setMessages((prev) => [
                ...prev,
                {
                    role: "system",
                    content: "🔴 Ending call...",
                    timestamp: new Date(),
                },
            ]);

            // Stop the call
            await vapi.stop();

            // The call-end event handler should fire automatically
            // But in case it doesn't (due to VAPI SDK issues), we'll set a fallback timeout
            setTimeout(() => {
                if (isCallActive) {
                    logger.warn({}, "⚠️ Call-end event didn't fire, forcing cleanup");
                    setIsCallActive(false);
                    setIsConnecting(false);
                    stopTimer();

                    // Manually trigger transcript save if we have call data
                    const capturedCallId = callIdRef.current;
                    const capturedTimestamp = callStartTimestampRef.current;

                    if (capturedCallId || capturedTimestamp) {
                        logger.info(
                            { callId: capturedCallId, timestamp: capturedTimestamp },
                            "Manually saving transcript after timeout"
                        );
                        saveTranscript(capturedCallId, capturedTimestamp);
                    }
                }
            }, 3000); // Wait 3 seconds for normal call-end event
        } catch (err) {
            logger.error({ error: err }, "Failed to end call");
            setError("Failed to end call properly");
            setIsCallActive(false);
            setIsConnecting(false);
            stopTimer();
        }
    };

    // Show loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
                    <p className="mt-4 text-muted-foreground">
                        Loading voice assistant...
                    </p>
                </div>
            </div>
        );
    }

    // Show error state
    if (error && !vapi) {
        return (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6">
                <p className="font-medium text-red-900">⚠️ {error}</p>
                <p className="mt-2 text-sm text-red-700">
                    Make sure VAPI credentials are configured in your environment
                    variables.
                </p>
            </div>
        );
    }

    return (
        <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-soft">
            <h3 className="mb-4 text-xl font-semibold text-foreground">
                Voice Conversation
            </h3>

            {/* Error Message */}
            {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* Call Controls */}
            <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-muted/50 p-4">
                <div className="flex items-center gap-4">
                    <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                            isCallActive
                                ? "bg-green-100 text-green-800"
                                : isConnecting
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-muted text-foreground"
                        }`}
                    >
                        {isCallActive
                            ? "🟢 Active"
                            : isConnecting
                              ? "🟡 Connecting..."
                              : "⚪ Ready"}
                    </span>
                    {isCallActive && (
                        <>
                            <span className="font-mono text-lg text-primary">
                                {formatDuration(callDuration)}
                            </span>
                            {(currentCallId || callStartTimestampRef.current) && (
                                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                                    💾 Recording
                                </span>
                            )}
                        </>
                    )}
                </div>
                <div className="flex gap-2">
                    {!isCallActive ? (
                        <Button onClick={startCall} disabled={isConnecting} size="lg">
                            {isConnecting ? "Connecting..." : "🎙️ Start Call"}
                        </Button>
                    ) : (
                        <Button onClick={endCall} variant="destructive" size="lg">
                            🔴 End Call
                        </Button>
                    )}
                </div>
            </div>

            {/* Messages Display */}
            <div
                ref={messagesContainerRef}
                className="h-96 overflow-y-auto rounded-lg border border-border bg-muted/50 p-4 scroll-smooth"
            >
                {messages.length === 0 ? (
                    <div className="mt-20 text-center text-muted-foreground">
                        <svg
                            className="mx-auto h-12 w-12 text-gray-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                        </svg>
                        <p className="mt-2">
                            Click "Start Call" to begin your conversation
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-md rounded-lg px-4 py-2 ${
                                        message.role === "user"
                                            ? "bg-primary text-white"
                                            : message.role === "system"
                                              ? "bg-gray-200 text-sm text-foreground"
                                              : "bg-muted text-foreground"
                                    }`}
                                >
                                    <p className="whitespace-pre-wrap">
                                        {message.content}
                                    </p>
                                    <p
                                        className={`mt-1 text-xs ${
                                            message.role === "user"
                                                ? "text-primary/20"
                                                : "text-muted-foreground"
                                        }`}
                                    >
                                        {message.timestamp.toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {/* AI Thinking */}
                        {isAIThinking && (
                            <div className="flex justify-start">
                                <div className="max-w-md rounded-lg bg-muted px-4 py-2 text-foreground">
                                    <div className="flex items-center space-x-1">
                                        <span>AI is thinking</span>
                                        <div className="flex space-x-1">
                                            <div className="h-1 w-1 animate-bounce rounded-full bg-muted/500"></div>
                                            <div
                                                className="h-1 w-1 animate-bounce rounded-full bg-muted/500"
                                                style={{ animationDelay: "0.1s" }}
                                            ></div>
                                            <div
                                                className="h-1 w-1 animate-bounce rounded-full bg-muted/500"
                                                style={{ animationDelay: "0.2s" }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Scroll anchor */}
                        <div ref={messagesEndRef} id="messages-end" className="h-0" />
                    </div>
                )}
            </div>
        </div>
    );
}
