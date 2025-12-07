"use client";

/**
 * Chat Input
 * Text input with attach, voice, and send buttons
 */

// External packages
import { Loader2, Mic, Plus, Send, Sparkles } from "lucide-react";
import { useState, useRef, KeyboardEvent } from "react";

// Internal utilities
import { cn } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";

interface ChatInputProps {
    onSendMessage: (message: string) => void;
    isProcessing: boolean;
}

export function ChatInput({ onSendMessage, isProcessing }: ChatInputProps) {
    const [message, setMessage] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = () => {
        if (!message.trim() || isProcessing) return;
        onSendMessage(message.trim());
        setMessage("");

        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Auto-resize textarea
    const handleInput = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
        }
    };

    return (
        <div className="relative">
            {/* Input Container */}
            <div
                className={cn(
                    "flex items-end gap-2 rounded-2xl border border-border bg-background p-2",
                    "focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20",
                    "transition-all duration-150"
                )}
            >
                {/* Left Controls */}
                <div className="flex items-center gap-1 pb-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                {/* Text Input */}
                <div className="flex-1">
                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onInput={handleInput}
                        placeholder="Ask GrowthMastery.ai..."
                        disabled={isProcessing}
                        rows={1}
                        className={cn(
                            "w-full resize-none bg-transparent text-sm outline-none",
                            "placeholder:text-muted-foreground",
                            "disabled:cursor-not-allowed disabled:opacity-50"
                        )}
                        style={{ minHeight: "24px", maxHeight: "120px" }}
                    />
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-1 pb-1">
                    {/* Visual Edits Toggle */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 rounded-full px-3 text-xs text-muted-foreground hover:text-foreground"
                    >
                        <Sparkles className="h-3 w-3" />
                        <span className="hidden sm:inline">Visual edits</span>
                    </Button>

                    {/* Voice Input */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                    >
                        <Mic className="h-4 w-4" />
                    </Button>

                    {/* Send Button */}
                    <Button
                        onClick={handleSend}
                        disabled={!message.trim() || isProcessing}
                        size="icon"
                        className={cn(
                            "h-8 w-8 rounded-full",
                            "bg-gradient-to-r from-orange-500 to-amber-500",
                            "text-white hover:from-orange-600 hover:to-amber-600",
                            "disabled:from-muted disabled:to-muted disabled:text-muted-foreground"
                        )}
                    >
                        {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
