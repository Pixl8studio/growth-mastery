"use client";

/**
 * useEditor Hook
 * Combined state management for the AI editor with full observability
 */

// External packages
import * as Sentry from "@sentry/nextjs";
import { useState, useCallback, useEffect } from "react";

// Internal utilities
import { logger } from "@/lib/client-logger";
import { ValidationError } from "@/lib/errors";

// Types
export interface Edit {
    type: "text" | "style" | "structure" | "interactive";
    description: string;
    details?: string;
    selector?: string;
    oldValue?: string;
    newValue?: string;
}

export interface EditSummary {
    edits: Edit[];
    timestamp: Date;
}

export interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    thinkingTime?: number;
    editSummary?: EditSummary;
}

interface UseEditorOptions {
    pageId: string;
    projectId: string;
    pageType: "registration" | "watch" | "enrollment";
    initialHtml: string;
    initialTitle: string;
}

interface UseEditorReturn {
    // Page state
    html: string;
    setHtml: (html: string) => void;
    title: string;
    setTitle: (title: string) => void;
    status: "draft" | "published" | "saving";
    version: number;

    // Conversation state
    messages: Message[];
    isProcessing: boolean;
    sendMessage: (message: string) => void;
    suggestedActions: string[];
    lastEditSummary: EditSummary | null;

    // Actions
    undo: () => void;
    canUndo: boolean;
    save: () => Promise<void>;
}

export function useEditor({
    pageId,
    projectId,
    pageType,
    initialHtml,
    initialTitle,
}: UseEditorOptions): UseEditorReturn {
    // Page state
    const [html, setHtml] = useState(initialHtml);
    const [title, setTitle] = useState(initialTitle);
    const [status, setStatus] = useState<"draft" | "published" | "saving">("draft");
    const [version, setVersion] = useState(1);

    // Conversation state
    const [messages, setMessages] = useState<Message[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [suggestedActions, setSuggestedActions] = useState<string[]>([
        "Make the headline more compelling",
        "Add social proof",
        "Improve the CTA button",
    ]);
    const [lastEditSummary, setLastEditSummary] = useState<EditSummary | null>(null);

    // Version history for undo
    const [history, setHistory] = useState<string[]>([initialHtml]);
    const [historyIndex, setHistoryIndex] = useState(0);

    // Generate unique ID for messages
    const generateId = () =>
        `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Send message to AI with full observability
    const sendMessage = useCallback(
        async (content: string) => {
            // Validate input
            if (!content.trim()) {
                throw new ValidationError("Message content cannot be empty");
            }
            if (isProcessing) return;

            // Add breadcrumb for user action
            Sentry.addBreadcrumb({
                category: "ai-editor.chat",
                message: "User sent message",
                level: "info",
                data: { pageId, pageType, messageLength: content.length },
            });

            // Add user message
            const userMessage: Message = {
                id: generateId(),
                role: "user",
                content,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, userMessage]);
            setIsProcessing(true);

            const startTime = Date.now();

            // Wrap AI chat in Sentry span for performance monitoring
            await Sentry.startSpan(
                { op: "ai.chat", name: "AI Editor Chat Request" },
                async (span) => {
                    span.setAttribute("page_id", pageId);
                    span.setAttribute("project_id", projectId);
                    span.setAttribute("page_type", pageType);

                    try {
                        // Call the AI chat endpoint with AbortController for timeout handling
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

                        let response: Response;
                        try {
                            response = await fetch("/api/ai-editor/chat", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    pageId,
                                    projectId,
                                    pageType,
                                    message: content,
                                    currentHtml: html,
                                    conversationHistory: messages.map((m) => ({
                                        role: m.role,
                                        content: m.content,
                                    })),
                                }),
                                signal: controller.signal,
                            });
                        } catch (fetchError) {
                            // Handle network errors and aborts gracefully
                            if (fetchError instanceof Error) {
                                if (fetchError.name === 'AbortError') {
                                    throw new ValidationError("Request timed out. Please try again with a simpler request.");
                                }
                                if (fetchError.message === 'Failed to fetch') {
                                    throw new ValidationError("Network connection lost. Please check your internet connection and try again.");
                                }
                            }
                            throw fetchError;
                        } finally {
                            clearTimeout(timeoutId);
                        }

                        const thinkingTime = (Date.now() - startTime) / 1000;
                        span.setAttribute("thinking_time_seconds", thinkingTime);

                        if (!response.ok) {
                            const errorBody = await response
                                .text()
                                .catch(() => "Unknown error");
                            // Provide user-friendly error messages based on status
                            const userMessage = response.status === 500
                                ? "The AI service encountered an error. Please try again."
                                : response.status === 429
                                    ? "Too many requests. Please wait a moment and try again."
                                    : response.status === 401
                                        ? "Your session has expired. Please refresh the page."
                                        : `AI response failed: ${response.status}`;
                            throw new ValidationError(userMessage);
                        }

                        const data = await response.json();

                        // Create edit summary (API returns editsApplied count, not full edits array)
                        const editSummary: EditSummary = {
                            edits: [], // API doesn't return full edit details
                            timestamp: new Date(),
                        };
                        const editsApplied = data.editsApplied || 0;
                        span.setAttribute("edits_count", editsApplied);

                        // Add breadcrumb for successful edit
                        Sentry.addBreadcrumb({
                            category: "ai-editor.edit",
                            message: "AI edit applied",
                            level: "info",
                            data: { editsCount: editsApplied, thinkingTime },
                        });

                        // Add AI response message (API returns 'response', not 'explanation')
                        const aiMessage: Message = {
                            id: generateId(),
                            role: "assistant",
                            content:
                                data.response ||
                                data.explanation ||
                                "I've made the changes you requested.",
                            timestamp: new Date(),
                            thinkingTime,
                            editSummary,
                        };
                        setMessages((prev) => [...prev, aiMessage]);

                        // Update HTML if changes were made
                        if (data.updatedHtml) {
                            // Add to history for undo
                            setHistory((prev) => [
                                ...prev.slice(0, historyIndex + 1),
                                data.updatedHtml,
                            ]);
                            setHistoryIndex((prev) => prev + 1);
                            setHtml(data.updatedHtml);
                            setVersion((v) => v + 1);
                        }

                        // Update suggested actions (API returns 'suggestions', not 'suggestedActions')
                        const suggestions = data.suggestions || data.suggestedActions;
                        if (suggestions && suggestions.length > 0) {
                            setSuggestedActions(suggestions);
                        }

                        setLastEditSummary(editSummary);
                        span.setStatus({ code: 1, message: "Success" });

                        logger.info(
                            {
                                pageId,
                                thinkingTime,
                                editsCount: editSummary.edits.length,
                            },
                            "🎨 AI edit applied successfully"
                        );
                    } catch (error) {
                        span.setStatus({ code: 2, message: "Error" });
                        logger.error(
                            { error, pageId },
                            "Failed to process AI edit request"
                        );

                        // Capture exception with context
                        Sentry.captureException(error, {
                            tags: { component: "ai-editor", action: "send_message" },
                            extra: {
                                pageId,
                                projectId,
                                pageType,
                                messageLength: content.length,
                            },
                        });

                        // Add error message to chat
                        const errorMessage: Message = {
                            id: generateId(),
                            role: "assistant",
                            content:
                                "I encountered an error processing your request. Please try again.",
                            timestamp: new Date(),
                            thinkingTime: (Date.now() - startTime) / 1000,
                        };
                        setMessages((prev) => [...prev, errorMessage]);
                    } finally {
                        setIsProcessing(false);
                    }
                }
            );
        },
        [pageId, projectId, pageType, html, messages, isProcessing, historyIndex]
    );

    // Undo functionality with breadcrumb tracking
    const undo = useCallback(() => {
        if (historyIndex > 0) {
            Sentry.addBreadcrumb({
                category: "ai-editor.undo",
                message: "User undid edit",
                level: "info",
                data: {
                    pageId,
                    fromVersion: historyIndex,
                    toVersion: historyIndex - 1,
                },
            });

            setHistoryIndex((prev) => prev - 1);
            setHtml(history[historyIndex - 1]);
            setVersion((v) => v + 1);

            logger.info({ pageId, version: historyIndex - 1 }, "⏪ Undo applied");
        }
    }, [historyIndex, history, pageId]);

    const canUndo = historyIndex > 0;

    // Save to database with observability
    const save = useCallback(async () => {
        setStatus("saving");

        return await Sentry.startSpan(
            { op: "ai-editor.save", name: "Save AI Editor Page" },
            async (span) => {
                span.setAttribute("page_id", pageId);
                span.setAttribute("version", version);

                try {
                    let response: Response;
                    try {
                        response = await fetch(`/api/ai-editor/pages/${pageId}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                title,
                                html_content: html,
                                version,
                            }),
                        });
                    } catch (fetchError) {
                        // Handle network errors gracefully
                        if (fetchError instanceof Error && fetchError.message === 'Failed to fetch') {
                            throw new ValidationError("Unable to save. Please check your internet connection.");
                        }
                        throw fetchError;
                    }

                    if (!response.ok) {
                        // Provide user-friendly error messages based on status
                        const userMessage = response.status === 401
                            ? "Your session has expired. Please refresh the page and try again."
                            : response.status === 409
                                ? "This page was modified elsewhere. Please refresh and try again."
                                : `Save failed. Please try again.`;
                        throw new ValidationError(userMessage);
                    }

                    span.setStatus({ code: 1, message: "Success" });
                    logger.info({ pageId, version }, "💾 Page saved successfully");
                    setStatus("draft");

                    Sentry.addBreadcrumb({
                        category: "ai-editor.save",
                        message: "Page saved",
                        level: "info",
                        data: { pageId, version },
                    });
                } catch (error) {
                    span.setStatus({ code: 2, message: "Error" });
                    logger.error({ error, pageId }, "Failed to save page");

                    Sentry.captureException(error, {
                        tags: { component: "ai-editor", action: "save_page" },
                        extra: { pageId, version, titleLength: title.length },
                    });

                    setStatus("draft");
                    throw error;
                }
            }
        );
    }, [pageId, title, html, version]);

    // Auto-save on changes (debounced)
    useEffect(() => {
        // Don't auto-save if html hasn't changed from initial
        if (!html || html === initialHtml) return;
        // Don't auto-save while processing
        if (isProcessing) return;

        const timeout = setTimeout(() => {
            save().catch(() => {
                // Error already logged in save function
            });
        }, 3000); // Increased to 3 seconds to avoid race conditions

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [html, title, initialHtml, isProcessing]);

    return {
        html,
        setHtml,
        title,
        setTitle,
        status,
        version,
        messages,
        isProcessing,
        sendMessage,
        suggestedActions,
        lastEditSummary,
        undo,
        canUndo,
        save,
    };
}
