"use client";

/**
 * Message Thread
 * Scrollable conversation history with user and AI messages
 */

import { cn } from "@/lib/utils";
import { UserMessage } from "./user-message";
import { AIMessage } from "./ai-message";
import { ThinkingIndicator } from "./thinking-indicator";
import type { Message, EditSummary } from "../hooks/use-editor";

interface MessageThreadProps {
    messages: Message[];
    isProcessing: boolean;
    lastEditSummary: EditSummary | null;
}

export function MessageThread({
    messages,
    isProcessing,
    lastEditSummary,
}: MessageThreadProps) {
    if (messages.length === 0 && !isProcessing) {
        return (
            <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 text-4xl">✨</div>
                <h3 className="mb-2 text-lg font-semibold">Welcome to the AI Editor</h3>
                <p className="max-w-sm text-sm text-muted-foreground">
                    Describe what you want to change in plain English. I&apos;ll update
                    your page in real-time.
                </p>
                <div className="mt-6 space-y-2 text-xs text-muted-foreground">
                    <p>Try saying:</p>
                    <div className="space-y-1">
                        <p className="rounded-md bg-muted px-3 py-1.5">
                            &ldquo;Make the headline more urgent&rdquo;
                        </p>
                        <p className="rounded-md bg-muted px-3 py-1.5">
                            &ldquo;Change the primary color to blue&rdquo;
                        </p>
                        <p className="rounded-md bg-muted px-3 py-1.5">
                            &ldquo;Add a testimonial section&rdquo;
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {messages.map((message) => (
                <div key={message.id}>
                    {message.role === "user" ? (
                        <UserMessage
                            content={message.content}
                            timestamp={message.timestamp}
                        />
                    ) : (
                        <AIMessage
                            content={message.content}
                            timestamp={message.timestamp}
                            thinkingTime={message.thinkingTime}
                            editSummary={message.editSummary}
                        />
                    )}
                </div>
            ))}

            {/* Show thinking indicator while processing */}
            {isProcessing && <ThinkingIndicator />}
        </div>
    );
}
