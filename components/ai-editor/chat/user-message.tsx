"use client";

/**
 * User Message
 * User message bubble in the chat thread
 */

import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface UserMessageProps {
    content: string;
    timestamp: Date;
}

export function UserMessage({ content, timestamp }: UserMessageProps) {
    return (
        <div className="flex justify-end">
            <div className="max-w-[85%]">
                <div className="rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                    {content}
                </div>
                <div className="mt-1 text-right text-[10px] text-muted-foreground">
                    {formatDistanceToNow(timestamp, { addSuffix: true })}
                </div>
            </div>
        </div>
    );
}
