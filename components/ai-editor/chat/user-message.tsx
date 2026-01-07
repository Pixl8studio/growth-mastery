"use client";

/**
 * User Message
 * User message bubble in the chat thread with optional image attachments
 */

import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { ImageAttachment } from "../hooks/use-editor";

interface UserMessageProps {
    content: string;
    timestamp: Date;
    attachments?: ImageAttachment[];
}

export function UserMessage({ content, timestamp, attachments }: UserMessageProps) {
    return (
        <div className="flex justify-end">
            <div className="max-w-[85%]">
                {/* Image Attachments */}
                {attachments && attachments.length > 0 && (
                    <div className="mb-2 flex flex-wrap justify-end gap-2">
                        {attachments.map((attachment) => (
                            <img
                                key={attachment.id}
                                src={attachment.url}
                                alt="Attached image"
                                className="max-h-48 max-w-full rounded-lg border border-border object-contain"
                            />
                        ))}
                    </div>
                )}

                {/* Message Content */}
                {content && (
                    <div className="rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                        {content}
                    </div>
                )}

                <div className="mt-1 text-right text-[10px] text-muted-foreground">
                    {formatDistanceToNow(timestamp, { addSuffix: true })}
                </div>
            </div>
        </div>
    );
}
