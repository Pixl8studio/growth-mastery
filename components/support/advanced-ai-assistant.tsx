/**
 * Advanced AI Assistant
 * Enhanced interface specifically for guiding users through funnel builder
 */

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    X,
    Send,
    Loader2,
    Sparkles,
    ChevronDown,
    ChevronUp,
    ArrowRight,
    Zap,
    HelpCircle,
} from "lucide-react";
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
import ReactMarkdown from "react-markdown";

interface Message {
    role: "user" | "assistant" | "system";
    content: string;
    suggestedActions?: Array<{
        label: string;
        action: () => void;
        icon?: React.ReactNode;
    }>;
}

const FUNNEL_STEPS: Array<{ step: number; name: string; path: string }> = [
    { step: 1, name: "AI Intake", path: "/step/1" },
    { step: 2, name: "Define Offer", path: "/step/2" },
    { step: 3, name: "Deck Structure", path: "/step/3" },
    { step: 4, name: "Generate Deck", path: "/step/4" },
    { step: 5, name: "Enrollment Page", path: "/step/5" },
    { step: 6, name: "Talk Track", path: "/step/6" },
    { step: 7, name: "Pitch Video", path: "/step/7" },
    { step: 8, name: "Watch Page", path: "/step/8" },
    { step: 9, name: "Registration", path: "/step/9" },
    { step: 10, name: "Funnel Flow", path: "/step/10" },
    { step: 11, name: "AI Follow-Up", path: "/step/11" },
    { step: 12, name: "Analytics", path: "/step/12" },
];

export function AdvancedAIAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);
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

    // Determine current step from URL (client-side only)
    const getCurrentStep = useCallback(() => {
        if (typeof window === "undefined") return 0;
        const path = window.location.pathname;
        const stepMatch = path.match(/\/step\/(\d+)/);
        if (stepMatch) {
            return parseInt(stepMatch[1]);
        }
        return context?.step || 0;
    }, [context]);

    const currentStep = getCurrentStep();

    // Start chat when widget opens
    const startChat = useCallback(async () => {
        try {
            const contextPage =
                typeof window !== "undefined" ? window.location.pathname : "/";

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

            // Create enhanced welcome message
            let welcomeMessage = "👋 **Hi! I'm your Genie AI assistant.**\n\n";

            if (success && businessContext && context) {
                const pageName = context.pageName || "this page";
                const hasProject = businessContext.currentProject?.name;

                if (hasProject && businessContext.currentProject) {
                    welcomeMessage += `I can see you're working on **${businessContext.currentProject.name}** `;
                    if (currentStep > 0) {
                        welcomeMessage += `at **Step ${currentStep}: ${FUNNEL_STEPS[currentStep - 1]?.name}**.\n\n`;
                    } else {
                        welcomeMessage += `on ${pageName}.\n\n`;
                    }
                } else {
                    welcomeMessage += `I can see you're on ${pageName}.\n\n`;
                }

                // Add contextual guidance
                if (context.forms && context.forms.length > 0) {
                    welcomeMessage += "**I can help you:**\n";
                    welcomeMessage +=
                        "- Fill in forms by asking you questions naturally\n";
                    welcomeMessage += "- Explain what each field means\n";
                    welcomeMessage += "- Suggest values based on your business\n";
                    welcomeMessage +=
                        "- Guide you through the process step-by-step\n\n";
                } else if (currentStep > 0) {
                    welcomeMessage += `**What would you like to do?**\n`;
                    welcomeMessage += `- Ask questions about this step\n`;
                    welcomeMessage += `- Get help with next actions\n`;
                    welcomeMessage += `- Review your progress\n\n`;
                }

                welcomeMessage +=
                    "💡 **Tip:** Just chat naturally - I understand context and can take actions for you!";
            } else {
                welcomeMessage += "How can I help you today?";
            }

            setMessages([
                {
                    role: "assistant",
                    content: welcomeMessage,
                },
            ]);

            logger.info(
                { projectId, hasContext: !!context, currentStep },
                "Started advanced AI chat"
            );
        } catch (error) {
            logger.error({ error }, "Failed to start chat");
        }
    }, [context, currentStep]);

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
                    contextPage:
                        typeof window !== "undefined" ? window.location.pathname : "/",
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
                    content: "❌ Sorry, I encountered an error. Please try again.",
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

    const handleQuickAction = (prompt: string) => {
        setInput(prompt);
        // Auto-send after a brief delay
        setTimeout(() => {
            sendMessageToAssistant();
        }, 100);
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
                    "flex items-center justify-center",
                    "animate-pulse"
                )}
                aria-label="AI Assistant"
            >
                {isOpen ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
            </button>

            {/* Advanced Chat Panel */}
            {isOpen && (
                <div
                    className={cn(
                        "fixed right-6 z-50 rounded-lg bg-white shadow-2xl border border-gray-200",
                        "transition-all duration-300",
                        isExpanded
                            ? "bottom-24 w-[32rem] h-[42rem]"
                            : "bottom-24 w-96 h-[32rem]"
                    )}
                >
                    <div className="flex flex-col h-full">
                        {/* Enhanced Header */}
                        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-t-lg">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                        <Sparkles className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">
                                            Genie AI Assistant
                                        </h3>
                                        {currentStep > 0 && (
                                            <p className="text-xs text-white/80">
                                                Step {currentStep} of{" "}
                                                {FUNNEL_STEPS.length}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsExpanded(!isExpanded)}
                                        className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
                                        title={isExpanded ? "Collapse" : "Expand"}
                                    >
                                        {isExpanded ? (
                                            <ChevronDown className="h-4 w-4" />
                                        ) : (
                                            <ChevronUp className="h-4 w-4" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            {currentStep > 0 && (
                                <div className="mt-3">
                                    <div className="flex items-center justify-between text-xs text-white/80 mb-1">
                                        <span>Funnel Progress</span>
                                        <span>
                                            {Math.round(
                                                (currentStep / FUNNEL_STEPS.length) *
                                                    100
                                            )}
                                            %
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-white rounded-full transition-all duration-500"
                                            style={{
                                                width: `${(currentStep / FUNNEL_STEPS.length) * 100}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Quick Actions */}
                        {context?.forms && context.forms.length > 0 && (
                            <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
                                <p className="text-xs font-medium text-gray-700 mb-2">
                                    Quick Actions:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() =>
                                            handleQuickAction(
                                                "Help me fill in this form"
                                            )
                                        }
                                        className="px-3 py-1.5 text-xs bg-white border border-blue-200 text-blue-700 rounded-full hover:bg-blue-50 transition-colors flex items-center gap-1"
                                    >
                                        <Zap className="h-3 w-3" />
                                        Fill Form
                                    </button>
                                    <button
                                        onClick={() =>
                                            handleQuickAction("What should I do next?")
                                        }
                                        className="px-3 py-1.5 text-xs bg-white border border-purple-200 text-purple-700 rounded-full hover:bg-purple-50 transition-colors flex items-center gap-1"
                                    >
                                        <ArrowRight className="h-3 w-3" />
                                        Next Steps
                                    </button>
                                    <button
                                        onClick={() =>
                                            handleQuickAction("Explain this page")
                                        }
                                        className="px-3 py-1.5 text-xs bg-white border border-pink-200 text-pink-700 rounded-full hover:bg-pink-50 transition-colors flex items-center gap-1"
                                    >
                                        <HelpCircle className="h-3 w-3" />
                                        Explain
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
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
                                            "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm",
                                            msg.role === "user"
                                                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                                                : "bg-white text-gray-900 border border-gray-200"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "text-sm",
                                                msg.role === "assistant" &&
                                                    "prose prose-sm max-w-none"
                                            )}
                                        >
                                            {msg.role === "assistant" ? (
                                                <ReactMarkdown
                                                    components={{
                                                        p: ({ children }) => (
                                                            <p className="mb-2 last:mb-0">
                                                                {children}
                                                            </p>
                                                        ),
                                                        ul: ({ children }) => (
                                                            <ul className="list-disc ml-4 mb-2">
                                                                {children}
                                                            </ul>
                                                        ),
                                                        ol: ({ children }) => (
                                                            <ol className="list-decimal ml-4 mb-2">
                                                                {children}
                                                            </ol>
                                                        ),
                                                        li: ({ children }) => (
                                                            <li className="mb-1">
                                                                {children}
                                                            </li>
                                                        ),
                                                        strong: ({ children }) => (
                                                            <strong className="font-semibold text-gray-900">
                                                                {children}
                                                            </strong>
                                                        ),
                                                        code: ({ children }) => (
                                                            <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">
                                                                {children}
                                                            </code>
                                                        ),
                                                    }}
                                                >
                                                    {msg.content}
                                                </ReactMarkdown>
                                            ) : (
                                                msg.content
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(loading || executing) && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                            <span className="text-sm text-gray-600">
                                                {executing
                                                    ? "Taking action..."
                                                    : "Thinking..."}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Enhanced Input Area */}
                        <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask me anything..."
                                    className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                    disabled={loading || executing}
                                />
                                <Button
                                    onClick={sendMessageToAssistant}
                                    disabled={!input.trim() || loading || executing}
                                    className="rounded-xl px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                <Sparkles className="h-3 w-3" />
                                Powered by AI • Context-aware • Can take actions
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
