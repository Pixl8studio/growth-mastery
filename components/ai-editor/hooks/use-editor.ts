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

export interface ImageAttachment {
    id: string;
    url: string;
    file?: File;
    uploading?: boolean;
}

export interface SuggestedOption {
    id: string;
    label: string;
    description?: string;
}

export interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    thinkingTime?: number;
    editSummary?: EditSummary;
    attachments?: ImageAttachment[];
    suggestedOptions?: SuggestedOption[];
}

interface UseEditorOptions {
    pageId: string;
    projectId: string;
    pageType: "registration" | "watch" | "enrollment";
    initialHtml: string;
    initialTitle: string;
    businessContext?: string;
    projectName?: string;
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
    sendMessage: (message: string, attachments?: ImageAttachment[]) => void;
    selectOption: (optionId: string, optionLabel: string) => void;
    suggestedActions: string[];
    lastEditSummary: EditSummary | null;

    // Actions
    undo: () => void;
    canUndo: boolean;
    save: () => Promise<void>;
    publish: (slug?: string) => Promise<{ success: boolean; publishedUrl?: string }>;
    getShareUrl: () => string;
}

export function useEditor({
    pageId,
    projectId,
    pageType,
    initialHtml,
    initialTitle,
    businessContext,
    projectName,
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
    const [initialMessageSent, setInitialMessageSent] = useState(false);

    // Version history for undo with byte-level memory tracking
    // PR #414 Concern: Modern landing pages can be 200-500KB, not 50KB
    // We track actual byte size and enforce a 5MB limit per tab
    // Memory budget: ~5MB max total across all history entries
    // This is acceptable for a browser tab. If memory becomes an issue:
    // 1. History is automatically pruned when exceeding limit
    // 2. Store diffs instead of full snapshots (more complex)
    // 3. Use IndexedDB for overflow storage
    const [history, setHistory] = useState<string[]>([initialHtml]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [historyBytes, setHistoryBytes] = useState(() => {
        // Calculate initial byte size using Blob for accurate UTF-8 byte count
        return new Blob([initialHtml]).size;
    });

    // Maximum history memory: 5MB per tab (conservative limit for large pages)
    // If exceeded, older entries are pruned from the beginning
    const MAX_HISTORY_BYTES = 5 * 1024 * 1024;

    // Save lock to prevent concurrent saves
    const [isSaving, setIsSaving] = useState(false);

    // Generate unique ID for messages
    const generateId = () =>
        `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Generate initial welcome message based on page type and business context
    const generateInitialMessage = useCallback(() => {
        const pageTypeLabels = {
            registration: "registration page",
            watch: "watch page",
            enrollment: "enrollment page",
        };

        const pageTypeDescriptions = {
            registration:
                "This page is designed to capture leads by showcasing the value of your training and encouraging visitors to sign up.",
            watch: "This page delivers your training content with an engaging video player and supporting materials to keep viewers engaged.",
            enrollment:
                "This sales page is structured to convert interested viewers into paying customers with compelling offers and clear calls-to-action.",
        };

        const projectNameStr = projectName ? ` for ${projectName}` : "";
        const pageLabel = pageTypeLabels[pageType];

        let content = `Here's your ${pageLabel}${projectNameStr}! 🎉\n\n${pageTypeDescriptions[pageType]}`;

        if (businessContext) {
            content += `\n\nI've customized this page based on your business context to resonate with your target audience.`;
        }

        content += `\n\nFeel free to tell me what you'd like to change - I can help you:\n• Update the headline or copy\n• Adjust colors and styling\n• Add or remove sections\n• Improve the overall design\n\nWhat would you like me to work on?`;

        return content;
    }, [pageType, projectName, businessContext]);

    // Send initial welcome message when editor loads
    useEffect(() => {
        if (!initialMessageSent && initialHtml) {
            const welcomeMessage: Message = {
                id: generateId(),
                role: "assistant",
                content: generateInitialMessage(),
                timestamp: new Date(),
            };
            setMessages([welcomeMessage]);
            setInitialMessageSent(true);
        }
    }, [initialHtml, initialMessageSent, generateInitialMessage]);

    // Send message to AI with full observability
    const sendMessage = useCallback(
        async (content: string, attachments?: ImageAttachment[]) => {
            // Validate input - allow empty content if there are attachments
            if (!content.trim() && (!attachments || attachments.length === 0)) {
                throw new ValidationError("Message content cannot be empty");
            }
            if (isProcessing) return;

            // Add breadcrumb for user action
            Sentry.addBreadcrumb({
                category: "ai-editor.chat",
                message: "User sent message",
                level: "info",
                data: {
                    pageId,
                    pageType,
                    messageLength: content.length,
                    hasAttachments: attachments && attachments.length > 0,
                },
            });

            // Add user message with attachments
            const userMessage: Message = {
                id: generateId(),
                role: "user",
                content:
                    content ||
                    (attachments ? "I've attached an image for you to analyze." : ""),
                timestamp: new Date(),
                attachments,
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
                                    imageAttachments: attachments?.map((a) => ({
                                        id: a.id,
                                        url: a.url,
                                    })),
                                }),
                                signal: controller.signal,
                            });
                        } catch (fetchError) {
                            // Handle network errors and aborts gracefully
                            // PR #414 Concern: AbortError detection varies across browsers/runtimes
                            // Some throw DOMException with name "AbortError"
                            // Others throw Error with name "AbortError"
                            if (
                                fetchError instanceof Error ||
                                fetchError instanceof DOMException
                            ) {
                                const errorName = fetchError.name;
                                const errorMessage = fetchError.message;

                                // Check for abort errors (timeout or manual abort)
                                if (
                                    errorName === "AbortError" ||
                                    errorMessage.includes("aborted") ||
                                    errorMessage.includes("abort")
                                ) {
                                    throw new ValidationError(
                                        "Request timed out. Please try again with a simpler request."
                                    );
                                }

                                // Check for network errors
                                if (
                                    errorMessage === "Failed to fetch" ||
                                    errorMessage.includes("network") ||
                                    errorMessage.includes("NetworkError")
                                ) {
                                    throw new ValidationError(
                                        "Network connection lost. Please check your internet connection and try again."
                                    );
                                }
                            }
                            throw fetchError;
                        } finally {
                            clearTimeout(timeoutId);
                        }

                        const thinkingTime = (Date.now() - startTime) / 1000;
                        span.setAttribute("thinking_time_seconds", thinkingTime);

                        if (!response.ok) {
                            const _errorBody = await response
                                .text()
                                .catch(() => "Unknown error");
                            // Provide user-friendly error messages based on status
                            const userMessage =
                                response.status === 500
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

                        // Parse suggested options from response if present
                        const suggestedOptions: SuggestedOption[] =
                            data.suggestedOptions || [];

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
                            suggestedOptions:
                                suggestedOptions.length > 0
                                    ? suggestedOptions
                                    : undefined,
                        };
                        setMessages((prev) => [...prev, aiMessage]);

                        // Update HTML if changes were made
                        if (data.updatedHtml) {
                            // Add to history for undo with byte-level tracking
                            const newEntryBytes = new Blob([data.updatedHtml]).size;

                            setHistory((prev) => {
                                const trimmedHistory = prev.slice(0, historyIndex + 1);
                                const newHistory = [
                                    ...trimmedHistory,
                                    data.updatedHtml,
                                ];

                                // Calculate total bytes of new history
                                let totalBytes = newHistory.reduce(
                                    (sum, entry) => sum + new Blob([entry]).size,
                                    0
                                );

                                // Prune oldest entries if over memory budget
                                // Keep at least 2 entries (initial + current) for undo to work
                                while (
                                    totalBytes > MAX_HISTORY_BYTES &&
                                    newHistory.length > 2
                                ) {
                                    const removedEntry = newHistory.shift();
                                    if (removedEntry) {
                                        totalBytes -= new Blob([removedEntry]).size;
                                    }
                                }

                                // Update byte tracking
                                setHistoryBytes(totalBytes);

                                // Log if history was pruned
                                if (newHistory.length < trimmedHistory.length + 1) {
                                    logger.info(
                                        {
                                            pageId,
                                            prunedEntries:
                                                trimmedHistory.length +
                                                1 -
                                                newHistory.length,
                                            totalBytes,
                                            maxBytes: MAX_HISTORY_BYTES,
                                        },
                                        "📉 History pruned due to memory limit"
                                    );
                                }

                                return newHistory;
                            });

                            // Adjust history index if entries were pruned
                            setHistoryIndex((prev) => {
                                // If we're adding an entry, increment
                                // The actual index will be corrected by the history update
                                return prev + 1;
                            });

                            setHtml(data.updatedHtml);
                            setVersion((v) => v + 1);

                            // Track memory usage in breadcrumb for observability
                            Sentry.addBreadcrumb({
                                category: "ai-editor.memory",
                                message: "History entry added",
                                level: "info",
                                data: {
                                    entryBytes: newEntryBytes,
                                    historyBytes: historyBytes + newEntryBytes,
                                    maxBytes: MAX_HISTORY_BYTES,
                                },
                            });
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
        [
            pageId,
            projectId,
            pageType,
            html,
            messages,
            isProcessing,
            historyIndex,
            historyBytes,
        ]
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
        // Prevent concurrent saves
        if (isSaving) {
            logger.debug({ pageId }, "Save already in progress, skipping");
            return;
        }

        setIsSaving(true);
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
                        if (
                            fetchError instanceof Error &&
                            fetchError.message === "Failed to fetch"
                        ) {
                            throw new ValidationError(
                                "Unable to save. Please check your internet connection."
                            );
                        }
                        throw fetchError;
                    }

                    if (!response.ok) {
                        // Provide user-friendly error messages based on status
                        const userMessage =
                            response.status === 401
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
                } finally {
                    setIsSaving(false);
                }
            }
        );
    }, [pageId, title, html, version, isSaving]);

    // Publish page using atomic RPC endpoint with optional custom slug
    // PR #414: Uses atomic PostgreSQL function for data consistency
    const publish = useCallback(
        async (
            slug?: string
        ): Promise<{
            success: boolean;
            publishedUrl?: string;
        }> => {
            return await Sentry.startSpan(
                { op: "ai-editor.publish", name: "Publish AI Editor Page" },
                async (span) => {
                    span.setAttribute("page_id", pageId);
                    span.setAttribute("version", version);

                    try {
                        // First save any pending changes
                        await save();

                        // Use the atomic publish endpoint
                        // This ensures all publish fields are updated in a single transaction
                        const response = await fetch(
                            `/api/ai-editor/pages/${pageId}/publish`,
                            {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    action: "publish",
                                    slug,
                                }),
                            }
                        );

                        if (!response.ok) {
                            const errorData = await response.json().catch(() => ({}));

                            // Handle specific error cases
                            if (response.status === 409) {
                                throw new ValidationError(
                                    "This URL is already in use. Please choose a different one."
                                );
                            }

                            throw new ValidationError(
                                errorData.error || "Failed to publish page"
                            );
                        }

                        const data = await response.json();
                        const publishedUrl = data.published_url || null;

                        span.setStatus({ code: 1, message: "Success" });
                        setStatus("published");

                        Sentry.addBreadcrumb({
                            category: "ai-editor.publish",
                            message: "Page published",
                            level: "info",
                            data: { pageId, version, publishedUrl },
                        });

                        logger.info(
                            { pageId, version, publishedUrl },
                            "📢 Page published"
                        );

                        return { success: true, publishedUrl };
                    } catch (error) {
                        span.setStatus({ code: 2, message: "Error" });
                        logger.error({ error, pageId }, "Failed to publish page");

                        Sentry.captureException(error, {
                            tags: { component: "ai-editor", action: "publish_page" },
                            extra: { pageId, version },
                        });

                        return { success: false };
                    }
                }
            );
        },
        [pageId, version, save]
    );

    // Get shareable URL for the page
    const getShareUrl = useCallback((): string => {
        // If published, use the published URL
        // Otherwise, return the editor preview URL
        if (typeof window === "undefined") return "";

        const baseUrl = window.location.origin;
        // For now, return the editor preview URL
        // When we have published_url from the API, we could use that instead
        return `${baseUrl}/ai-editor/${pageId}/preview`;
    }, [pageId]);

    // Auto-save on changes (debounced)
    useEffect(() => {
        // Don't auto-save if html hasn't changed from initial
        if (!html || html === initialHtml) return;
        // Don't auto-save while processing AI requests
        if (isProcessing) return;
        // Don't auto-save while another save is in progress
        if (isSaving) return;

        const timeout = setTimeout(() => {
            save().catch(() => {
                // Error already logged in save function
            });
        }, 3000); // Increased to 3 seconds to avoid race conditions

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [html, title, initialHtml, isProcessing, isSaving]);

    // Warn about unsaved changes before leaving
    useEffect(() => {
        const hasUnsavedChanges = html !== initialHtml || status === "saving";

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                // Modern browsers ignore custom messages, but we set it for older browsers
                e.returnValue =
                    "You have unsaved changes. Are you sure you want to leave?";
                return e.returnValue;
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [html, initialHtml, status]);

    // Handle option selection from clarifying questions
    const selectOption = useCallback(
        (optionId: string, optionLabel: string) => {
            // Send the selected option as a user message
            sendMessage(optionLabel);
        },
        [sendMessage]
    );

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
        selectOption,
        suggestedActions,
        lastEditSummary,
        undo,
        canUndo,
        save,
        publish,
        getShareUrl,
    };
}
