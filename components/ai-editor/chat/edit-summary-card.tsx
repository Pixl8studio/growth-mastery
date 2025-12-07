"use client";

/**
 * Edit Summary Card
 * Collapsible card showing what edits were made
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Check, Code2, Eye, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EditSummary } from "../hooks/use-editor";

interface EditSummaryCardProps {
    summary: EditSummary;
}

export function EditSummaryCard({ summary }: EditSummaryCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="rounded-lg border border-border bg-card">
            {/* Header - Always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/50"
            >
                <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-medium">
                        {summary.edits.length} edit
                        {summary.edits.length !== 1 ? "s" : ""} made
                    </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Show all</span>
                    {isExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                    ) : (
                        <ChevronRight className="h-3 w-3" />
                    )}
                </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="border-t border-border">
                    {/* Edit Details */}
                    <div className="divide-y divide-border/50">
                        {summary.edits.map((edit, index) => (
                            <div key={index} className="px-3 py-2">
                                <div className="flex items-start gap-2">
                                    <ChevronRight className="mt-0.5 h-3 w-3 text-muted-foreground" />
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-medium">
                                            {edit.description}
                                        </p>
                                        {edit.details && (
                                            <p className="text-xs text-muted-foreground">
                                                {edit.details}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Actions Footer */}
                    <div className="flex items-center gap-2 border-t border-border px-3 py-2">
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                            <Eye className="mr-1.5 h-3 w-3" />
                            Preview Latest
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                            <Code2 className="mr-1.5 h-3 w-3" />
                            Code
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                            <Bookmark className="mr-1.5 h-3 w-3" />
                            Save
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
