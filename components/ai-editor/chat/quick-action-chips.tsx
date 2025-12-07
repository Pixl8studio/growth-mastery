"use client";

/**
 * Quick Action Chips
 * AI-suggested next steps as clickable buttons
 */

import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface QuickActionChipsProps {
    actions: string[];
    onActionClick: (action: string) => void;
}

export function QuickActionChips({ actions, onActionClick }: QuickActionChipsProps) {
    if (actions.length === 0) return null;

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                <span>Suggestions</span>
            </div>
            <div className="flex flex-wrap gap-2">
                {actions.map((action, index) => (
                    <button
                        key={index}
                        onClick={() => onActionClick(action)}
                        className={cn(
                            "rounded-full border border-border bg-background px-3 py-1.5 text-xs",
                            "hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
                            "transition-colors duration-150"
                        )}
                    >
                        {action}
                    </button>
                ))}
            </div>
        </div>
    );
}
