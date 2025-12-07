"use client";

/**
 * Chat Panel
 * Main AI conversation interface with message thread and input
 */

// External packages
import { useRef, useEffect } from "react";

// Types
import type { Message, EditSummary } from "../hooks/use-editor";

// Internal utilities
import { cn } from "@/lib/utils";

// Feature code
import { ChatInput } from "./chat-input";
import { MessageThread } from "./message-thread";
import { QuickActionChips } from "./quick-action-chips";

interface ChatPanelProps {
    messages: Message[];
    isProcessing: boolean;
    onSendMessage: (message: string) => void;
    suggestedActions: string[];
    lastEditSummary: EditSummary | null;
}

export function ChatPanel({
    messages,
    isProcessing,
    onSendMessage,
    suggestedActions,
    lastEditSummary,
}: ChatPanelProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isProcessing]);

    return (
        <div className="flex h-full flex-col">
            {/* Message Thread - Scrollable */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
                <MessageThread
                    messages={messages}
                    isProcessing={isProcessing}
                    lastEditSummary={lastEditSummary}
                />
            </div>

            {/* Quick Action Chips */}
            {suggestedActions.length > 0 && !isProcessing && (
                <div className="border-t border-border/50 px-4 py-3">
                    <QuickActionChips
                        actions={suggestedActions}
                        onActionClick={onSendMessage}
                    />
                </div>
            )}

            {/* Chat Input */}
            <div className="border-t border-border p-4">
                <ChatInput onSendMessage={onSendMessage} isProcessing={isProcessing} />
            </div>
        </div>
    );
}
