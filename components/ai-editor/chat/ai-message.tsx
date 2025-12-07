"use client";

/**
 * AI Message
 * AI response with thinking time, explanation, edit summary, and feedback
 */

import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Lightbulb, ThumbsUp, ThumbsDown, Copy, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditSummaryCard } from "./edit-summary-card";
import type { EditSummary } from "../hooks/use-editor";

interface AIMessageProps {
    content: string;
    timestamp: Date;
    thinkingTime?: number;
    editSummary?: EditSummary;
}

export function AIMessage({
    content,
    timestamp,
    thinkingTime,
    editSummary,
}: AIMessageProps) {
    return (
        <div className="flex justify-start">
            <div className="max-w-[90%] space-y-2">
                {/* Thinking Time Badge */}
                {thinkingTime && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Lightbulb className="h-3 w-3 text-amber-500" />
                        <span>Thought for {thinkingTime.toFixed(1)}s</span>
                    </div>
                )}

                {/* Message Content */}
                <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-2.5 text-sm">
                    {content}
                </div>

                {/* Edit Summary Card */}
                {editSummary && editSummary.edits.length > 0 && (
                    <EditSummaryCard summary={editSummary} />
                )}

                {/* Footer with timestamp and feedback */}
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(timestamp, { addSuffix: true })}
                    </span>

                    {/* Feedback Controls */}
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        >
                            <ThumbsUp className="h-3 w-3" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        >
                            <ThumbsDown className="h-3 w-3" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        >
                            <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        >
                            <MoreHorizontal className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
