"use client";

/**
 * AI Chat Panel Component
 * Contextual side panel for AI-assisted funnel node refinement
 * Features voice input, streaming responses, and field suggestions
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
    X,
    Send,
    Sparkles,
    Loader2,
    Check,
    RotateCcw,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceToTextButton } from "@/components/ui/voice-to-text-button";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/client-logger";
import type {
    FunnelNodeType,
    FunnelNodeData,
    ConversationMessage,
} from "@/types/funnel-map";
import { getNodeDefinition } from "@/types/funnel-map";

// ============================================
// CONSTANTS
// ============================================

/** Maximum height for auto-resizing textarea in pixels */
const MAX_TEXTAREA_HEIGHT_PX = 120;

interface AIChatPanelProps {
    nodeType: FunnelNodeType;
    nodeData: FunnelNodeData | null;
    projectId: string;
    onClose: () => void;
    onContentUpdate: (
        nodeType: FunnelNodeType,
        content: Record<string, unknown>
    ) => void;
    onConversationUpdate: (
        nodeType: FunnelNodeType,
        messages: ConversationMessage[]
    ) => void;
}

export function AIChatPanel({
    nodeType,
    nodeData,
    projectId,
    onClose,
    onContentUpdate,
    onConversationUpdate,
}: AIChatPanelProps) {
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showDraftContent, setShowDraftContent] = useState(true);
    const [pendingChanges, setPendingChanges] = useState<Record<
        string,
        unknown
    > | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const definition = getNodeDefinition(nodeType);
    const messages = nodeData?.conversation_history || [];
    const currentContent = nodeData?.refined_content || nodeData?.draft_content || {};

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)}px`;
        }
    }, [inputValue]);

    const handleSendMessage = useCallback(async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage: ConversationMessage = {
            id: crypto.randomUUID(),
            role: "user",
            content: inputValue.trim(),
            timestamp: new Date().toISOString(),
        };

        // Add user message immediately
        const updatedMessages = [...messages, userMessage];
        onConversationUpdate(nodeType, updatedMessages);
        setInputValue("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/funnel-map/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    nodeType,
                    message: userMessage.content,
                    conversationHistory: updatedMessages,
                    currentContent,
                    definition,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to get AI response");
            }

            const result = await response.json();

            const assistantMessage: ConversationMessage = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: result.message,
                timestamp: new Date().toISOString(),
                suggestedChanges: result.suggestedChanges,
            };

            onConversationUpdate(nodeType, [...updatedMessages, assistantMessage]);

            // If AI suggested changes, show them as pending
            if (result.suggestedChanges) {
                setPendingChanges(result.suggestedChanges);
            }
        } catch (error) {
            // Determine error type for better user feedback
            let errorContent =
                "I'm sorry, I encountered an error. Please try again or rephrase your question.";

            if (error instanceof Error) {
                const errorMessage = error.message.toLowerCase();
                if (
                    errorMessage.includes("rate limit") ||
                    errorMessage.includes("429")
                ) {
                    errorContent =
                        "You've reached the request limit. Please wait a moment before trying again.";
                } else if (
                    errorMessage.includes("network") ||
                    errorMessage.includes("fetch")
                ) {
                    errorContent =
                        "Unable to connect to the server. Please check your internet connection and try again.";
                } else if (errorMessage.includes("timeout")) {
                    errorContent =
                        "The request took too long to complete. Please try again with a shorter message.";
                }
            }

            // Log error for debugging with full context
            logger.error(
                {
                    error,
                    projectId,
                    nodeType,
                    messageLength: userMessage.content.length,
                    historyLength: updatedMessages.length,
                },
                "Chat request failed"
            );

            // Add error message to conversation
            const errorMessageObj: ConversationMessage = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: errorContent,
                timestamp: new Date().toISOString(),
            };
            onConversationUpdate(nodeType, [...updatedMessages, errorMessageObj]);
        } finally {
            setIsLoading(false);
        }
    }, [
        inputValue,
        isLoading,
        messages,
        nodeType,
        projectId,
        currentContent,
        definition,
        onConversationUpdate,
    ]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleVoiceTranscript = (transcript: string) => {
        setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    const handleAcceptChanges = () => {
        if (pendingChanges) {
            const merged = { ...currentContent, ...pendingChanges };
            onContentUpdate(nodeType, merged);
            setPendingChanges(null);
        }
    };

    const handleRejectChanges = () => {
        setPendingChanges(null);
    };

    const renderFieldValue = (key: string, value: unknown) => {
        if (Array.isArray(value)) {
            return (
                <ul className="list-disc pl-4 text-sm">
                    {value.map((item, i) => (
                        <li key={i} className="text-muted-foreground">
                            {String(item)}
                        </li>
                    ))}
                </ul>
            );
        }
        if (typeof value === "object" && value !== null) {
            return (
                <pre className="text-xs text-muted-foreground overflow-x-auto">
                    {JSON.stringify(value, null, 2)}
                </pre>
            );
        }
        return <p className="text-sm text-muted-foreground">{String(value)}</p>;
    };

    if (!definition) return null;

    return (
        <div className="flex h-full flex-col bg-card border-l border-border">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/30">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <div>
                        <h3 className="font-semibold text-foreground">
                            {definition.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            AI-assisted refinement
                        </p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-8 w-8"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Current Content Preview */}
            <div className="border-b border-border">
                <button
                    onClick={() => setShowDraftContent(!showDraftContent)}
                    className="flex w-full items-center justify-between px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50"
                >
                    <span>Current Content</span>
                    {showDraftContent ? (
                        <ChevronUp className="h-4 w-4" />
                    ) : (
                        <ChevronDown className="h-4 w-4" />
                    )}
                </button>

                {showDraftContent && (
                    <div className="max-h-48 overflow-y-auto px-4 pb-3 space-y-3">
                        {Object.keys(currentContent).length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">
                                No content yet. Start a conversation to generate
                                content.
                            </p>
                        ) : (
                            definition.fields.map((field) => {
                                const value =
                                    currentContent[
                                        field.key as keyof typeof currentContent
                                    ];
                                if (!value) return null;

                                return (
                                    <div key={field.key}>
                                        <label className="text-xs font-medium text-foreground">
                                            {field.label}
                                        </label>
                                        {renderFieldValue(field.key, value)}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {/* Pending Changes */}
            {pendingChanges && (
                <div className="border-b border-border bg-primary/5 p-4">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-primary">
                            Suggested Changes
                        </span>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleRejectChanges}
                                className="h-7"
                            >
                                <RotateCcw className="mr-1 h-3 w-3" />
                                Reject
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleAcceptChanges}
                                className="h-7"
                            >
                                <Check className="mr-1 h-3 w-3" />
                                Accept
                            </Button>
                        </div>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-2">
                        {Object.entries(pendingChanges).map(([key, value]) => {
                            const field = definition.fields.find((f) => f.key === key);
                            return (
                                <div
                                    key={key}
                                    className="rounded-md bg-white p-2 text-sm"
                                >
                                    <span className="font-medium">
                                        {field?.label || key}:
                                    </span>
                                    <span className="ml-2 text-muted-foreground">
                                        {String(value).slice(0, 100)}
                                        {String(value).length > 100 && "..."}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <Sparkles className="h-10 w-10 text-primary/40 mb-3" />
                        <p className="text-sm text-muted-foreground mb-2">
                            Start refining your {definition.title.toLowerCase()}
                        </p>
                        <div className="text-xs text-muted-foreground max-w-xs">
                            <p className="mb-2">Try asking:</p>
                            <ul className="space-y-1 text-left">
                                <li>• "Make the headline more compelling"</li>
                                <li>• "Add more urgency to the CTA"</li>
                                <li>• "Rewrite this for a different audience"</li>
                            </ul>
                        </div>
                    </div>
                ) : (
                    messages.map((message) => (
                        <div
                            key={message.id}
                            className={cn(
                                "flex",
                                message.role === "user"
                                    ? "justify-end"
                                    : "justify-start"
                            )}
                        >
                            <div
                                className={cn(
                                    "max-w-[85%] rounded-lg px-4 py-2",
                                    message.role === "user"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-foreground"
                                )}
                            >
                                <p className="text-sm whitespace-pre-wrap">
                                    {message.content}
                                </p>
                                <span className="mt-1 block text-xs opacity-70">
                                    {new Date(message.timestamp).toLocaleTimeString(
                                        [],
                                        {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        }
                                    )}
                                </span>
                            </div>
                        </div>
                    ))
                )}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="rounded-lg bg-muted px-4 py-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-border p-4">
                <div className="flex items-end gap-2">
                    <div className="relative flex-1">
                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask AI to refine this content..."
                            rows={1}
                            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            disabled={isLoading}
                        />
                        <VoiceToTextButton
                            onTranscript={handleVoiceTranscript}
                            size="icon"
                            variant="ghost"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            disabled={isLoading}
                        />
                    </div>
                    <Button
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isLoading}
                        size="icon"
                        className="h-10 w-10 shrink-0"
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground text-center">
                    Press Enter to send, Shift+Enter for new line
                </p>
            </div>
        </div>
    );
}
