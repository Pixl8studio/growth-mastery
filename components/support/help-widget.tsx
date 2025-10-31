/**
 * Help Widget Component
 * Floating chat widget with AI assistant, voice help, and documentation access
 */

"use client";

import { useState } from "react";
import { MessageCircle, Phone, BookOpen, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/client-logger";

interface Message {
    role: "user" | "assistant";
    content: string;
}

export function HelpWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [showMenu, setShowMenu] = useState(true);
    const [showChat, setShowChat] = useState(false);
    const [threadId, setThreadId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    const startChat = async () => {
        try {
            const contextPage = window.location.pathname;
            const response = await fetch("/api/support/chat/thread", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contextPage }),
            });

            const { threadId: newThreadId } = await response.json();
            setThreadId(newThreadId);
            setShowMenu(false);
            setShowChat(true);
            setMessages([
                {
                    role: "assistant",
                    content:
                        "Hi! I'm your Genie AI assistant. How can I help you today?",
                },
            ]);
        } catch (error) {
            logger.error({ error }, "Failed to start chat");
        }
    };

    const sendMessageToAssistant = async () => {
        if (!input.trim() || !threadId) return;

        const userMessage = input;
        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
        setLoading(true);

        try {
            const response = await fetch("/api/support/chat/message", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    threadId,
                    message: userMessage,
                    contextPage: window.location.pathname,
                }),
            });

            const { response: assistantResponse } = await response.json();
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: assistantResponse },
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
        }
    };

    const openVoiceCall = () => {
        logger.info({}, "Opening voice help");
        // TODO: Implement VAPI call with help context
        alert("Voice help coming soon!");
    };

    const openDocs = () => {
        window.open("/docs", "_blank");
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
                className="fixed bottom-6 right-6 z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:shadow-xl"
                style={{
                    backfaceVisibility: "hidden",
                    transform: "translate3d(0, 0, 0)",
                    WebkitFontSmoothing: "antialiased",
                    transition: "box-shadow 0.2s ease-in-out",
                }}
                aria-label="Toggle help menu"
            >
                <span
                    className="flex items-center justify-center"
                    style={{ transition: "none" }}
                >
                    {isOpen ? (
                        <X className="h-6 w-6" />
                    ) : (
                        <MessageCircle className="h-6 w-6" />
                    )}
                </span>
            </button>

            {/* Help Menu/Chat Panel */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 w-96 rounded-lg border border-border bg-card shadow-xl">
                    {showMenu && (
                        <div className="p-6">
                            <h3 className="mb-4 text-lg font-semibold text-foreground">
                                💬 Need help?
                            </h3>
                            <div className="space-y-3">
                                <Button
                                    onClick={startChat}
                                    className="w-full justify-start"
                                    variant="outline"
                                >
                                    <MessageCircle className="mr-2 h-4 w-4" />
                                    Chat with Genie
                                </Button>
                                <Button
                                    onClick={openVoiceCall}
                                    className="w-full justify-start"
                                    variant="outline"
                                >
                                    <Phone className="mr-2 h-4 w-4" />
                                    Talk to Voice AI
                                </Button>
                                <Button
                                    onClick={openDocs}
                                    className="w-full justify-start"
                                    variant="outline"
                                >
                                    <BookOpen className="mr-2 h-4 w-4" />
                                    Open Docs
                                </Button>
                            </div>
                        </div>
                    )}

                    {showChat && (
                        <div className="flex h-[500px] flex-col">
                            {/* Chat Header */}
                            <div className="flex items-center justify-between border-b border-border p-4">
                                <h3 className="font-semibold text-foreground">
                                    Chat with Genie
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowChat(false);
                                        setShowMenu(true);
                                        setThreadId(null);
                                        setMessages([]);
                                    }}
                                    className="text-muted-foreground hover:text-muted-foreground"
                                    aria-label="Close chat"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 space-y-4 overflow-y-auto p-4">
                                {messages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "max-w-[85%] rounded-lg p-3",
                                            msg.role === "user"
                                                ? "ml-auto bg-primary text-white"
                                                : "bg-muted text-foreground"
                                        )}
                                    >
                                        {msg.content}
                                    </div>
                                ))}
                                {loading && (
                                    <div className="max-w-[85%] rounded-lg bg-muted p-3 text-foreground">
                                        Thinking...
                                    </div>
                                )}
                            </div>

                            {/* Input */}
                            <div className="border-t border-border p-4">
                                <div className="flex space-x-2">
                                    <input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Type your message..."
                                        className="flex-1 rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                    <Button
                                        onClick={sendMessageToAssistant}
                                        disabled={loading || !input.trim()}
                                    >
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
