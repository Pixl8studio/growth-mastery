/**
 * Context-Aware Help Widget
 * Comprehensive AI assistant with page and business context awareness
 */

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/client-logger";
import { usePageContext } from "@/lib/ai-assistant/page-context";
import {
    loadBusinessContext,
    formatBusinessContextForPrompt,
} from "@/lib/ai-assistant/business-context";
import {
    fillFormField,
    parseActionIntents,
    executePageAction,
} from "@/lib/ai-assistant/action-executor";

interface Message {
    role: "user" | "assistant" | "system";
    content: string;
}

export function ContextAwareHelpWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [threadId, setThreadId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [executing, setExecuting] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { context, getFormattedContext } = usePageContext();

    // Auto-scroll to bottom of messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Start chat when widget opens
    const startChat = useCallback(async () => {
        try {
            const contextPage = window.location.pathname;

            // Create thread
            const response = await fetch("/api/support/chat/thread", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contextPage }),
            });

            const { threadId: newThreadId } = await response.json();
            setThreadId(newThreadId);

            // Load business context
            const projectId = context?.businessContext?.projectId;
            const { success, context: businessContext } =
                await loadBusinessContext(projectId);

            // Create welcome message with context awareness
            let welcomeMessage = "Hi! I'm your Genie AI assistant. 🎉";

            if (success && businessContext && context) {
                const pageName = context.pageName || "this page";
                const hasProject = businessContext.currentProject?.name;

                if (hasProject && businessContext.currentProject) {
                    welcomeMessage += `\n\nI can see you're working on **${businessContext.currentProject.name}** on ${pageName}. `;
                } else {
                    welcomeMessage += `\n\nI can see you're on ${pageName}. `;
                }

                // Mention what we can help with
                if (context.forms && context.forms.length > 0) {
                    welcomeMessage +=
                        "I can help you fill in these forms by asking you questions, or you can ask me anything about the process!";
                } else if (context.actions && context.actions.length > 0) {
                    welcomeMessage +=
                        "I can help you with available actions or answer any questions about what you can do here.";
                } else {
                    welcomeMessage +=
                        "I can answer questions about your funnels, analytics, and guide you through any process.";
                }
            } else {
                welcomeMessage += " How can I help you today?";
            }

            setMessages([
                {
                    role: "assistant",
                    content: welcomeMessage,
                },
            ]);

            logger.info(
                { projectId, hasContext: !!context },
                "Started context-aware chat"
            );
        } catch (error) {
            logger.error({ error }, "Failed to start chat");
        }
    }, [context]);

    // Initialize chat when widget is opened
    useEffect(() => {
        if (isOpen && !threadId) {
            startChat();
        }
    }, [isOpen, threadId, startChat]);

    const sendMessageToAssistant = async () => {
        if (!input.trim() || !threadId) return;

        const userMessage = input;
        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
        setLoading(true);

        try {
            // Get page context
            const pageContext = context ? getFormattedContext() : undefined;

            // Get business context
            const projectId = context?.businessContext?.projectId;
            let businessContextFormatted = undefined;

            if (projectId) {
                const { success, context: businessContext } =
                    await loadBusinessContext(projectId);
                if (success && businessContext) {
                    businessContextFormatted =
                        formatBusinessContextForPrompt(businessContext);
                }
            }

            // Send to assistant
            const response = await fetch("/api/support/chat/message", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    threadId,
                    message: userMessage,
                    contextPage: window.location.pathname,
                    pageContext,
                    businessContext: businessContextFormatted,
                }),
            });

            const { response: assistantResponse } = await response.json();

            // Parse for action intents
            const actionIntents = parseActionIntents(assistantResponse);

            // Execute any actions
            if (actionIntents.length > 0) {
                setExecuting(true);
                for (const intent of actionIntents) {
                    if (intent.actionId === "fill_field" && intent.parameters) {
                        await fillFormField(
                            String(intent.parameters.formId),
                            String(intent.parameters.fieldId),
                            intent.parameters.value
                        );
                    } else {
                        await executePageAction(intent.actionId, intent.parameters);
                    }
                }
                setExecuting(false);
            }

            // Remove action commands from display
            const cleanedResponse = assistantResponse
                .replace(/\[ACTION:[^\]]+\]/g, "")
                .replace(/\[FILL:[^\]]+\]/g, "")
                .trim();

            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: cleanedResponse || assistantResponse },
            ]);
        } catch (error) {
            logger.error({ error }, "Failed to send message");
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: "Sorry, I encountered an error. Please try again.",
                },
            ]);
        } finally {
            setLoading(false);
            setExecuting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessageToAssistant();
        }
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "fixed bottom-6 right-6 z-50",
                    "h-14 w-14 rounded-full",
                    "bg-gradient-to-r from-blue-600 to-purple-600",
                    "text-white shadow-lg",
                    "hover:shadow-xl hover:scale-110",
                    "transition-all duration-200",
                    "flex items-center justify-center"
                )}
                aria-label="Help"
            >
                {isOpen ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 w-96 rounded-lg bg-white shadow-2xl border border-gray-200">
                    <div className="flex flex-col h-[32rem]">
                        {/* Header */}
                        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-lg">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-white" />
                                    <h3 className="font-semibold text-white">
                                        Genie AI Assistant
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-white hover:text-gray-200"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            {context?.pageName && (
                                <p className="text-sm text-white/80 mt-1">
                                    Helping with: {context.pageName}
                                </p>
                            )}
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={cn(
                                        "flex",
                                        msg.role === "user"
                                            ? "justify-end"
                                            : "justify-start"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "max-w-[80%] rounded-lg px-4 py-2",
                                            msg.role === "user"
                                                ? "bg-blue-600 text-white"
                                                : "bg-gray-100 text-gray-900"
                                        )}
                                    >
                                        <div className="text-sm whitespace-pre-wrap">
                                            {msg.content}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(loading || executing) && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-100 rounded-lg px-4 py-2">
                                        <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-gray-200">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask me anything..."
                                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    disabled={loading || executing}
                                />
                                <Button
                                    onClick={sendMessageToAssistant}
                                    disabled={!input.trim() || loading || executing}
                                    size="sm"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
