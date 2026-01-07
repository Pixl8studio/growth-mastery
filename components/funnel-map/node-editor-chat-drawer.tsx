"use client";

/**
 * Node Editor Chat Drawer
 * AI chat interface for helping users fill out funnel node fields
 * Features:
 * - Custom opening messages per node type
 * - Markdown rendering for responses
 * - Suggested changes integration
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FunnelNodeType, FunnelNodeDefinition, ConversationMessage } from "@/types/funnel-map";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

interface NodeEditorChatDrawerProps {
    nodeType: FunnelNodeType;
    nodeDefinition: FunnelNodeDefinition;
    projectId: string;
    currentContent: Record<string, unknown>;
    businessContext: Record<string, unknown>;
    onSuggestedChanges: (changes: Record<string, unknown>) => void;
}

// Custom opening messages that guide users into productive conversations
const NODE_OPENING_MESSAGES: Record<FunnelNodeType, string> = {
    traffic_source: "Let's plan where your ideal customers will come from. What platforms or channels have worked best for you in the past?",
    registration: "I'm here to help you create a registration page that converts! Based on your business profile, I can see you help people achieve transformation. What's the one thing you want visitors to feel when they land on this page - curiosity, urgency, or excitement?",
    registration_confirmation: "Great, let's make sure people are excited after registering! What do you want them to do before the event - prepare something specific, share with friends, or simply mark their calendar?",
    masterclass: "This is the heart of your funnel - your masterclass content. I see you have expertise in your field. What's the single biggest 'aha moment' you want viewers to experience during your presentation?",
    core_offer: "Now for the exciting part - your irresistible offer! Using the Irresistible Offer Framework, let's craft something your ideal customers can't refuse. What transformation do you promise, and how quickly can they expect to see results?",
    checkout: "Let's optimize your checkout page for conversions. What's the main objection someone might have right before purchasing? I can help you address it directly on this page.",
    order_bump: "Order bumps work best when they're a quick win that complements the main offer. What's something small but valuable you could offer for under $50 that enhances their results?",
    upsells: "Let's create compelling upsell offers that increase your average order value.",
    upsell_1: "Your first upsell should be something that accelerates or enhances the results of your main offer. What would make your buyers say 'I need that too!' right after purchasing?",
    upsell_2: "For your second offer, consider either a premium upgrade or a downsell for those who passed on the first upsell. What complementary product or service could you offer here?",
    call_booking: "For high-ticket offers, the call booking page is crucial. What should prospects know about you or the process that would make them excited to book a call?",
    call_booking_confirmation: "After someone books a call, we want them showing up prepared and ready to buy. What homework or preparation should they do before the call?",
    sales_call: "Let's structure your sales call for success. What are the top 3 objections you typically hear, and how do you address them?",
    thank_you: "The thank you page is the start of your customer relationship! What's the first thing you want new customers to do after purchasing?",
};

function MessageBubble({
    message,
    isUser,
}: {
    message: { content: string; timestamp?: string };
    isUser: boolean;
}) {
    return (
        <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
            <div
                className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    isUser ? "bg-primary text-primary-foreground" : "bg-purple-100 text-purple-700"
                )}
            >
                {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            </div>
            <div
                className={cn(
                    "rounded-lg px-4 py-3 max-w-[85%]",
                    isUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted prose prose-sm prose-slate max-w-none"
                )}
            >
                {isUser ? (
                    <p className="text-sm">{message.content}</p>
                ) : (
                    <ReactMarkdown
                        className="text-sm [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4"
                        components={{
                            // Ensure proper rendering of bold text
                            strong: ({ children }) => (
                                <strong className="font-semibold">{children}</strong>
                            ),
                            // Handle lists properly
                            ul: ({ children }) => (
                                <ul className="list-disc pl-4 my-2">{children}</ul>
                            ),
                            ol: ({ children }) => (
                                <ol className="list-decimal pl-4 my-2">{children}</ol>
                            ),
                        }}
                    >
                        {message.content}
                    </ReactMarkdown>
                )}
            </div>
        </div>
    );
}

export function NodeEditorChatDrawer({
    nodeType,
    nodeDefinition,
    projectId,
    currentContent,
    businessContext,
    onSuggestedChanges,
}: NodeEditorChatDrawerProps) {
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [hasInitialized, setHasInitialized] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Initialize with opening message
    useEffect(() => {
        if (!hasInitialized) {
            const openingMessage = NODE_OPENING_MESSAGES[nodeType] ||
                `I'm here to help you complete the ${nodeDefinition.title}. What would you like to work on?`;

            setMessages([
                {
                    id: "opening",
                    role: "assistant",
                    content: openingMessage,
                    timestamp: new Date().toISOString(),
                },
            ]);
            setHasInitialized(true);
        }
    }, [nodeType, nodeDefinition.title, hasInitialized]);

    // Reset when node type changes
    useEffect(() => {
        setHasInitialized(false);
        setMessages([]);
    }, [nodeType]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const sendMessage = useCallback(async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage: ConversationMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            content: inputValue.trim(),
            timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMessage]);
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
                    currentContent,
                    conversationHistory: messages,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to get response");
            }

            const data = await response.json();

            const assistantMessage: ConversationMessage = {
                id: `assistant-${Date.now()}`,
                role: "assistant",
                content: data.message,
                timestamp: new Date().toISOString(),
                suggestedChanges: data.suggestedChanges,
            };

            setMessages((prev) => [...prev, assistantMessage]);

            // Apply suggested changes if any
            if (data.suggestedChanges && Object.keys(data.suggestedChanges).length > 0) {
                onSuggestedChanges({
                    ...currentContent,
                    ...data.suggestedChanges,
                });
            }
        } catch (error) {
            console.error("Chat error:", error);
            setMessages((prev) => [
                ...prev,
                {
                    id: `error-${Date.now()}`,
                    role: "assistant",
                    content: "I apologize, but I encountered an issue processing your request. Could you try rephrasing your question?",
                    timestamp: new Date().toISOString(),
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    }, [inputValue, isLoading, projectId, nodeType, currentContent, messages, onSuggestedChanges]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="flex h-full flex-col">
            {/* Messages area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                    <MessageBubble
                        key={message.id}
                        message={message}
                        isUser={message.role === "user"}
                    />
                ))}

                {/* Loading indicator */}
                {isLoading && (
                    <div className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                            <Sparkles className="h-4 w-4" />
                        </div>
                        <div className="rounded-lg bg-muted px-4 py-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Thinking...</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input area */}
            <div className="border-t border-border p-4">
                <div className="flex gap-2">
                    <Textarea
                        ref={textareaRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask a question or request changes..."
                        className="min-h-[80px] resize-none"
                        disabled={isLoading}
                    />
                    <Button
                        onClick={sendMessage}
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
                <p className="text-xs text-muted-foreground mt-2">
                    Press Enter to send, Shift+Enter for new line
                </p>
            </div>
        </div>
    );
}
