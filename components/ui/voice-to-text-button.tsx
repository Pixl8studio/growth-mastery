"use client";

/**
 * Voice-to-Text Button Component
 * Reusable button that enables speech recognition using the Web Speech API.
 * Features:
 * - Cross-browser support with graceful fallback
 * - Visual feedback during recording
 * - Interim results for real-time feedback
 * - Automatic stop on silence
 * - Integrates with any text input via onTranscript callback
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/client-logger";

// Extend window for Web Speech API types
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message?: string;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    onstart: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
}

declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognition;
        webkitSpeechRecognition: new () => SpeechRecognition;
    }
}

type RecordingState = "idle" | "starting" | "recording" | "processing";

interface VoiceToTextButtonProps {
    /** Callback when transcript is ready. Receives the transcribed text. */
    onTranscript: (text: string) => void;
    /** Callback for interim results (real-time feedback while speaking) */
    onInterimResult?: (text: string) => void;
    /** Whether to append or replace existing text */
    mode?: "append" | "replace";
    /** Language for speech recognition (BCP-47 format) */
    lang?: string;
    /** Additional className for styling */
    className?: string;
    /** Button size variant */
    size?: "default" | "sm" | "lg" | "icon";
    /** Button variant */
    variant?: "default" | "outline" | "ghost" | "secondary";
    /** Disabled state */
    disabled?: boolean;
    /** Show label text */
    showLabel?: boolean;
    /** Custom label when not recording */
    label?: string;
    /** Custom label when recording */
    recordingLabel?: string;
}

export function VoiceToTextButton({
    onTranscript,
    onInterimResult,
    mode = "append",
    lang = "en-US",
    className,
    size = "icon",
    variant = "outline",
    disabled = false,
    showLabel = false,
    label = "Voice input",
    recordingLabel = "Listening...",
}: VoiceToTextButtonProps) {
    const [state, setState] = useState<RecordingState>("idle");
    const [isSupported, setIsSupported] = useState<boolean>(true);
    const [interimText, setInterimText] = useState<string>("");
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const finalTranscriptRef = useRef<string>("");

    // Check for browser support
    useEffect(() => {
        const SpeechRecognitionAPI =
            window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionAPI) {
            setIsSupported(false);
            logger.warn({}, "Speech recognition not supported in this browser");
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    const startRecording = useCallback(() => {
        const SpeechRecognitionAPI =
            window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognitionAPI) {
            logger.error({}, "Speech recognition not available");
            return;
        }

        setState("starting");
        finalTranscriptRef.current = "";
        setInterimText("");

        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = lang;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setState("recording");
            logger.info({ lang }, "Speech recognition started");
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interimTranscript = "";
            let finalTranscript = "";

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            // Accumulate final transcripts
            if (finalTranscript) {
                finalTranscriptRef.current += finalTranscript;
            }

            // Update interim display
            setInterimText(interimTranscript);
            if (onInterimResult && interimTranscript) {
                onInterimResult(interimTranscript);
            }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            logger.error(
                { error: event.error, message: event.message },
                "Speech recognition error"
            );

            // Handle specific errors
            if (event.error === "not-allowed") {
                // Microphone permission denied
                setState("idle");
            } else if (event.error === "no-speech") {
                // No speech detected, but not an error for our purposes
                setState("idle");
            } else {
                setState("idle");
            }
        };

        recognition.onend = () => {
            setState("processing");

            // Deliver final transcript
            const fullTranscript = finalTranscriptRef.current.trim();
            if (fullTranscript) {
                logger.info(
                    { transcriptLength: fullTranscript.length },
                    "Speech recognition completed"
                );
                onTranscript(fullTranscript);
            }

            setInterimText("");
            setState("idle");
            recognitionRef.current = null;
        };

        recognitionRef.current = recognition;

        try {
            recognition.start();
        } catch (error) {
            logger.error({ error }, "Failed to start speech recognition");
            setState("idle");
        }
    }, [lang, onTranscript, onInterimResult]);

    const stopRecording = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    }, []);

    const toggleRecording = useCallback(() => {
        if (state === "recording") {
            stopRecording();
        } else if (state === "idle") {
            startRecording();
        }
    }, [state, startRecording, stopRecording]);

    // If not supported, render a disabled button with tooltip
    if (!isSupported) {
        return (
            <Button
                type="button"
                variant={variant}
                size={size}
                disabled
                className={cn("opacity-50", className)}
                title="Voice input not supported in this browser"
            >
                <MicOff className="h-4 w-4" />
                {showLabel && <span className="ml-2">Voice unavailable</span>}
            </Button>
        );
    }

    const isRecording = state === "recording";
    const isProcessing = state === "processing" || state === "starting";

    return (
        <Button
            type="button"
            variant={isRecording ? "default" : variant}
            size={size}
            onClick={toggleRecording}
            disabled={disabled || isProcessing}
            className={cn(
                "transition-all duration-200",
                isRecording && "bg-red-500 hover:bg-red-600 text-white animate-pulse",
                className
            )}
            title={isRecording ? "Click to stop recording" : "Click to start voice input"}
        >
            {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : isRecording ? (
                <Mic className="h-4 w-4" />
            ) : (
                <Mic className="h-4 w-4" />
            )}
            {showLabel && (
                <span className="ml-2">
                    {isProcessing
                        ? "Processing..."
                        : isRecording
                          ? recordingLabel
                          : label}
                </span>
            )}
        </Button>
    );
}

/**
 * Hook for programmatic voice-to-text control
 * Useful when you need more control over the recording lifecycle
 */
export function useVoiceToText(options: {
    lang?: string;
    onTranscript: (text: string) => void;
    onInterimResult?: (text: string) => void;
    onError?: (error: string) => void;
}) {
    const { lang = "en-US", onTranscript, onInterimResult, onError } = options;
    const [isRecording, setIsRecording] = useState(false);
    const [isSupported, setIsSupported] = useState(true);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const finalTranscriptRef = useRef<string>("");

    useEffect(() => {
        const SpeechRecognitionAPI =
            window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionAPI) {
            setIsSupported(false);
        }
    }, []);

    const start = useCallback(() => {
        const SpeechRecognitionAPI =
            window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionAPI || isRecording) return;

        finalTranscriptRef.current = "";

        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = lang;

        recognition.onstart = () => setIsRecording(true);

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interimTranscript = "";

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscriptRef.current += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            if (onInterimResult && interimTranscript) {
                onInterimResult(interimTranscript);
            }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            onError?.(event.error);
            setIsRecording(false);
        };

        recognition.onend = () => {
            const transcript = finalTranscriptRef.current.trim();
            if (transcript) {
                onTranscript(transcript);
            }
            setIsRecording(false);
            recognitionRef.current = null;
        };

        recognitionRef.current = recognition;
        recognition.start();
    }, [lang, isRecording, onTranscript, onInterimResult, onError]);

    const stop = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    }, []);

    const abort = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.abort();
            setIsRecording(false);
            recognitionRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    return {
        isRecording,
        isSupported,
        start,
        stop,
        abort,
    };
}
