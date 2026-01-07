"use client";

/**
 * AI Message
 * AI response with thinking time, explanation, edit summary, suggested options, and feedback
 */

import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Lightbulb, ThumbsUp, ThumbsDown, Copy, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditSummaryCard } from "./edit-summary-card";
import type { EditSummary, SuggestedOption } from "../hooks/use-editor";

interface AIMessageProps {
    content: string;
    timestamp: Date;
    thinkingTime?: number;
    editSummary?: EditSummary;
    suggestedOptions?: SuggestedOption[];
    onSelectOption?: (optionId: string, optionLabel: string) => void;
}

export function AIMessage({
    content,
    timestamp,
    thinkingTime,
    editSummary,
    suggestedOptions,
    onSelectOption,
}: AIMessageProps) {
    // Format content with line breaks
    const formattedContent = content.split("\n").map((line, i) => (
        <span key={i}>
            {line}
            {i < content.split("\n").length - 1 && <br />}
        </span>
    ));

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
                <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-2.5 text-sm whitespace-pre-wrap">
                    {formattedContent}
                </div>

                {/* Edit Summary Card */}
                {editSummary && editSummary.edits.length > 0 && (
                    <EditSummaryCard summary={editSummary} />
                )}

                {/* Suggested Options (Clarifying Questions) */}
                {suggestedOptions && suggestedOptions.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                            Choose an option:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {suggestedOptions.map((option) => (
                                <Button
                                    key={option.id}
                                    variant="outline"
                                    size="sm"
                                    className="h-auto whitespace-normal text-left py-2 px-3"
                                    onClick={() =>
                                        onSelectOption?.(option.id, option.label)
                                    }
                                >
                                    <div>
                                        <div className="font-medium">
                                            {option.label}
                                        </div>
                                        {option.description && (
                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                {option.description}
                                            </div>
                                        )}
                                    </div>
                                </Button>
                            ))}
                        </div>
                    </div>
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
